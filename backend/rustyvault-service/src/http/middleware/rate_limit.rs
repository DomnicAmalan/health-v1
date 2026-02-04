//! Rate limiting middleware for authentication endpoints
//! Prevents brute force attacks on login/authentication operations
//! See CVE-RUSTY-012 in RUSTYVAULT_SECURITY_AUDIT.md

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;
use std::collections::HashMap;
use std::net::IpAddr;
use std::str::FromStr;
use tokio::sync::Mutex;
use std::time::{Duration, Instant};

/// Rate limiter state
pub struct RateLimiter {
    /// Map of IP address to request attempts
    attempts: Arc<Mutex<HashMap<String, RateLimitEntry>>>,
    /// Maximum attempts allowed in the window
    max_attempts: usize,
    /// Time window for rate limiting
    window: Duration,
}

struct RateLimitEntry {
    count: usize,
    window_start: Instant,
    locked_until: Option<Instant>,
}

impl RateLimiter {
    pub fn new(max_attempts: usize, window_secs: u64) -> Self {
        let limiter = Self {
            attempts: Arc::new(Mutex::new(HashMap::new())),
            max_attempts,
            window: Duration::from_secs(window_secs),
        };

        // Start cleanup task
        limiter.start_cleanup_task();

        limiter
    }

    /// Check if request is rate limited
    pub async fn check_rate_limit(&self, ip: &str) -> Result<(), RateLimitError> {
        let mut attempts = self.attempts.lock().await;
        let now = Instant::now();

        let entry = attempts.entry(ip.to_string()).or_insert(RateLimitEntry {
            count: 0,
            window_start: now,
            locked_until: None,
        });

        // Check if IP is locked out
        if let Some(locked_until) = entry.locked_until {
            if now < locked_until {
                let remaining = (locked_until - now).as_secs();
                return Err(RateLimitError::LockedOut(remaining));
            } else {
                // Lock expired, reset
                entry.locked_until = None;
                entry.count = 0;
                entry.window_start = now;
            }
        }

        // Check if window has expired
        if now.duration_since(entry.window_start) > self.window {
            entry.count = 0;
            entry.window_start = now;
        }

        // Check if limit exceeded
        if entry.count >= self.max_attempts {
            // Lock out for 15 minutes
            entry.locked_until = Some(now + Duration::from_secs(900));
            return Err(RateLimitError::TooManyAttempts);
        }

        // Increment count
        entry.count += 1;

        Ok(())
    }

    /// Reset rate limit for an IP (e.g., after successful login)
    pub async fn reset(&self, ip: &str) {
        let mut attempts = self.attempts.lock().await;
        attempts.remove(ip);
    }

    /// Start background cleanup task
    fn start_cleanup_task(&self) {
        let attempts = self.attempts.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // Every 5 minutes
            loop {
                interval.tick().await;
                let mut attempts_guard = attempts.lock().await;
                let now = Instant::now();

                // Remove expired entries
                attempts_guard.retain(|_, entry| {
                    // Keep if:
                    // 1. Still within window, OR
                    // 2. Still locked out
                    now.duration_since(entry.window_start) < Duration::from_secs(600) ||
                    entry.locked_until.map(|l| now < l).unwrap_or(false)
                });
            }
        });
    }
}

#[derive(Debug)]
pub enum RateLimitError {
    TooManyAttempts,
    LockedOut(u64), // seconds remaining
}

/// Extract client IP from request headers
pub fn extract_client_ip(req: &Request) -> String {
    // Check X-Forwarded-For header first (for proxies)
    if let Some(forwarded) = req.headers().get("x-forwarded-for") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            // Take first IP (client)
            if let Some(ip) = forwarded_str.split(',').next() {
                return ip.trim().to_string();
            }
        }
    }

    // Check X-Real-IP header
    if let Some(real_ip) = req.headers().get("x-real-ip") {
        if let Ok(ip_str) = real_ip.to_str() {
            return ip_str.to_string();
        }
    }

    // Fallback to unknown (should not happen in production)
    "unknown".to_string()
}

/// Rate limiting middleware for authentication paths
pub async fn rate_limit_middleware(
    rate_limiter: Arc<RateLimiter>,
    req: Request,
    next: Next,
) -> Result<Response, Response> {
    let client_ip = extract_client_ip(&req);

    match rate_limiter.check_rate_limit(&client_ip).await {
        Ok(()) => {
            // Within rate limit, proceed
            Ok(next.run(req).await)
        }
        Err(RateLimitError::TooManyAttempts) => {
            tracing::warn!("Rate limit exceeded for IP: {}", client_ip);
            Err((
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "error": "too many authentication attempts",
                    "message": "Account locked for 15 minutes due to excessive failed login attempts"
                })),
            )
                .into_response())
        }
        Err(RateLimitError::LockedOut(remaining_secs)) => {
            tracing::warn!("Locked out IP attempting access: {}", client_ip);
            Err((
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "error": "account locked",
                    "message": format!("Too many failed attempts. Try again in {} seconds", remaining_secs)
                })),
            )
                .into_response())
        }
    }
}
