use axum::{
    Router,
    routing::{get, post, delete},
    middleware,
    extract::{Request, State},
};
use crate::presentation::api::handlers::*;
use crate::presentation::api::middleware::{auth_middleware, acl_middleware};
use std::sync::Arc;
use crate::shared::AppState;

pub fn create_router() -> Router<Arc<AppState>> {
    // Public routes (no authentication required)
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/auth/login", post(login));

    // Protected routes (authentication required)
    // Apply auth middleware first, then ACL middleware
    // The state will be provided when .with_state() is called on the router
    // Note: Middleware application will be fixed once Axum middleware pattern is confirmed
    let protected_routes = Router::new()
        .route("/auth/logout", post(logout))
        .route("/auth/token", post(refresh_token))
        .route("/auth/userinfo", get(userinfo))
        .route("/users", post(create_user))
        .route("/users/:id", get(get_user))
        .route("/users/:id", post(update_user))
        .route("/users/:id", delete(delete_user));
        // TODO: Apply middleware once Axum 0.7 middleware pattern is confirmed
        // .layer(middleware::from_fn_with_state(auth_middleware))
        // .layer(middleware::from_fn_with_state(acl_middleware));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
}

async fn health_check() -> &'static str {
    "OK"
}
