use axum::{
    Router,
    routing::{get, post, put, delete},
};
use crate::presentation::api::handlers::*;
use crate::presentation::api::handlers::ehr::{patient_handlers, pharmacy_handlers};
use crate::presentation::api::handlers::billing::{service_catalog_handlers, invoice_handlers, payment_handlers};
use admin_service::handlers::*;
use std::sync::Arc;

#[allow(dead_code)]
pub fn create_router() -> Router<Arc<super::AppState>> {
    // Public routes (no authentication required)
    // All routes use /v1/ prefix for versioning (except /health)
    let public_routes = Router::new()
        .route("/health", get(health_check)) // Health check stays unversioned
        .route("/v1/auth/login", post(login))
        .route("/v1/setup/status", get(check_setup_status))
        .route("/v1/setup/initialize", post(initialize_setup))
        .route("/v1/services/status", get(get_service_status));

    // Protected routes (authentication required)
    // Apply auth middleware first, then ACL middleware
    // The state will be provided when .with_state() is called on the router
    // Note: Middleware will be applied via route_layer in main.rs after state is set
    // All routes use /v1/ prefix for versioning
    let protected_routes = Router::new()
        .route("/v1/auth/logout", post(logout))
        .route("/v1/auth/token", post(refresh_token))
        .route("/v1/auth/userinfo", get(userinfo))
        .route("/v1/users", post(create_user))
        .route("/v1/users/:id", get(get_user))
        .route("/v1/users/:id", post(update_user))
        .route("/v1/users/:id", delete(delete_user));

    // EHR routes (protected)
    let ehr_routes = Router::new()
        // Patient routes
        .route("/v1/ehr/patients", get(patient_handlers::list_patients))
        .route("/v1/ehr/patients", post(patient_handlers::create_patient))
        .route("/v1/ehr/patients/search", get(patient_handlers::search_patients))
        .route("/v1/ehr/patients/:id", get(patient_handlers::get_patient))
        .route("/v1/ehr/patients/:id", put(patient_handlers::update_patient))
        .route("/v1/ehr/patients/:id", delete(patient_handlers::delete_patient))
        .route("/v1/ehr/patients/:id/banner", get(patient_handlers::get_patient_banner))
        .route("/v1/ehr/patients/mrn/:mrn", get(patient_handlers::get_patient_by_mrn))
        .route("/v1/ehr/patients/ien/:ien", get(patient_handlers::get_patient_by_ien));
        // Note: Visits, Vitals, Labs, etc. are handled by yottadb-api service

    // Pharmacy routes (protected)
    let pharmacy_routes = Router::new()
        // Drug catalog
        .route("/v1/pharmacy/catalogs", get(pharmacy_handlers::list_catalogs))
        .route("/v1/pharmacy/catalogs/:id/schedules", get(pharmacy_handlers::get_catalog_schedules))
        // Drug search and details
        .route("/v1/pharmacy/drugs/search", get(pharmacy_handlers::search_drugs))
        .route("/v1/pharmacy/drugs/:id", get(pharmacy_handlers::get_drug))
        .route("/v1/pharmacy/drugs/:id/interactions", get(pharmacy_handlers::get_drug_interactions))
        .route("/v1/pharmacy/drugs/:id/contraindications", get(pharmacy_handlers::get_drug_contraindications))
        // Interaction checking
        .route("/v1/pharmacy/interactions/check", post(pharmacy_handlers::check_interactions));

    // Billing routes (protected)
    let billing_routes = Router::new()
        // Service Catalog
        .route("/v1/billing/services", get(service_catalog_handlers::search_services))
        .route("/v1/billing/services", post(service_catalog_handlers::create_service))
        .route("/v1/billing/services/:id", get(service_catalog_handlers::get_service))
        .route("/v1/billing/categories", get(service_catalog_handlers::list_service_categories))
        .route("/v1/billing/categories", post(service_catalog_handlers::create_service_category))
        .route("/v1/billing/tax-codes", get(service_catalog_handlers::list_tax_codes))
        .route("/v1/billing/packages", get(service_catalog_handlers::list_service_packages))
        // Invoices
        .route("/v1/billing/invoices", get(invoice_handlers::list_invoices))
        .route("/v1/billing/invoices", post(invoice_handlers::create_invoice))
        .route("/v1/billing/invoices/:id", get(invoice_handlers::get_invoice))
        .route("/v1/billing/invoices/:id/items", post(invoice_handlers::add_invoice_item))
        .route("/v1/billing/invoices/:id/finalize", post(invoice_handlers::finalize_invoice))
        .route("/v1/billing/invoices/:id/cancel", post(invoice_handlers::cancel_invoice))
        // Payments
        .route("/v1/billing/payments", get(payment_handlers::list_payments))
        .route("/v1/billing/payments", post(payment_handlers::create_payment))
        .route("/v1/billing/payments/:id", get(payment_handlers::get_payment))
        .route("/v1/billing/payments/:id/allocate", post(payment_handlers::allocate_payment))
        .route("/v1/billing/payments/:id/refund", post(payment_handlers::refund_payment))
        // Patient Billing
        .route("/v1/billing/patients/:id/balance", get(payment_handlers::get_patient_balance));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(ehr_routes)
        .merge(pharmacy_routes)
        .merge(billing_routes)
}

#[allow(dead_code)]
async fn health_check() -> &'static str {
    "OK"
}
