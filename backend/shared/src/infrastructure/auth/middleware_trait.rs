use axum::extract::{Request, State};
use async_trait::async_trait;
use std::sync::Arc;

pub trait AuthMiddleware: Send + Sync {
    type Error: Into<axum::response::Response>;
    type Context: Send + Sync + Clone + 'static;

    async fn authenticate(&self, request: &Request) -> Result<Self::Context, Self::Error>;

    fn extract_token(request: &Request) -> Option<String> {
        request
            .headers()
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .map(|s| s.to_string())
    }
}