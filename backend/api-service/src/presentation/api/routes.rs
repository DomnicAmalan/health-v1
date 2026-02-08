use axum::{
    Router,
    routing::{get, post, put, delete},
};
use crate::presentation::api::handlers::*;
use crate::presentation::api::handlers::workflow_handlers;
use crate::presentation::api::handlers::ehr::{anatomy_findings_handlers, appointment_handlers, body_system_handlers, clinical_note_handlers, encounter_handlers, imaging_orders_handlers, patient_handlers, pharmacy_handlers, problem_list_handlers, vital_signs_handlers};
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
        .route("/v1/ehr/patients/ien/:ien", get(patient_handlers::get_patient_by_ien))
        .route("/v1/ehr/patients/find-duplicates", post(patient_handlers::find_duplicate_patients))
        .route("/v1/ehr/patients/merge", post(patient_handlers::merge_patients))
        // Appointment routes
        .route("/v1/ehr/appointments", get(appointment_handlers::list_appointments))
        .route("/v1/ehr/appointments", post(appointment_handlers::create_appointment))
        .route("/v1/ehr/appointments/availability", get(appointment_handlers::check_availability))
        .route("/v1/ehr/appointments/:id", get(appointment_handlers::get_appointment))
        .route("/v1/ehr/appointments/:id", put(appointment_handlers::update_appointment))
        .route("/v1/ehr/appointments/:id", delete(appointment_handlers::delete_appointment))
        .route("/v1/ehr/appointments/:id/check-in", post(appointment_handlers::check_in_appointment))
        .route("/v1/ehr/appointments/:id/cancel", post(appointment_handlers::cancel_appointment))
        // Clinical notes routes
        .route("/v1/ehr/clinical-notes", get(clinical_note_handlers::list_clinical_notes))
        .route("/v1/ehr/clinical-notes", post(clinical_note_handlers::create_clinical_note))
        .route("/v1/ehr/clinical-notes/templates", get(clinical_note_handlers::list_note_templates))
        .route("/v1/ehr/clinical-notes/:id", get(clinical_note_handlers::get_clinical_note))
        .route("/v1/ehr/clinical-notes/:id", put(clinical_note_handlers::update_clinical_note))
        .route("/v1/ehr/clinical-notes/:id", delete(clinical_note_handlers::delete_clinical_note))
        .route("/v1/ehr/clinical-notes/:id/sign", post(clinical_note_handlers::sign_clinical_note))
        // Vital signs routes
        .route("/v1/ehr/vital-signs", get(vital_signs_handlers::list_vital_signs))
        .route("/v1/ehr/vital-signs", post(vital_signs_handlers::create_vital_signs))
        .route("/v1/ehr/vital-signs/:id", get(vital_signs_handlers::get_vital_signs))
        .route("/v1/ehr/vital-signs/:id", put(vital_signs_handlers::update_vital_signs))
        .route("/v1/ehr/vital-signs/:id", delete(vital_signs_handlers::delete_vital_signs))
        .route("/v1/ehr/vital-signs/patient/:patient_id/trends", get(vital_signs_handlers::get_patient_vital_trends))
        // Encounter routes
        .route("/v1/ehr/encounters", get(encounter_handlers::list_encounters))
        .route("/v1/ehr/encounters", post(encounter_handlers::create_encounter))
        .route("/v1/ehr/encounters/:id", get(encounter_handlers::get_encounter))
        .route("/v1/ehr/encounters/:id", put(encounter_handlers::update_encounter))
        .route("/v1/ehr/encounters/:id", delete(encounter_handlers::delete_encounter))
        .route("/v1/ehr/encounters/:id/start", post(encounter_handlers::start_encounter))
        .route("/v1/ehr/encounters/:id/finish", post(encounter_handlers::finish_encounter))
        .route("/v1/ehr/encounters/:id/diagnoses", post(encounter_handlers::add_diagnosis))
        .route("/v1/ehr/encounters/:id/procedures", post(encounter_handlers::add_procedure))
        // Lab test catalog routes
        .route("/v1/ehr/lab-tests", get(lab_tests_handlers::list_lab_tests))
        .route("/v1/ehr/lab-tests/categories", get(lab_tests_handlers::list_test_categories))
        .route("/v1/ehr/lab-tests/:id", get(lab_tests_handlers::get_lab_test))
        .route("/v1/ehr/lab-tests/:id/reference-ranges", get(lab_tests_handlers::get_test_reference_ranges))
        .route("/v1/ehr/lab-panels", get(lab_tests_handlers::list_lab_panels))
        // Lab order routes
        .route("/v1/ehr/lab-orders", get(lab_orders_handlers::list_lab_orders))
        .route("/v1/ehr/lab-orders", post(lab_orders_handlers::create_lab_order))
        .route("/v1/ehr/lab-orders/:id", get(lab_orders_handlers::get_lab_order))
        .route("/v1/ehr/lab-orders/:id/collect", post(lab_orders_handlers::collect_specimen).patch(lab_orders_handlers::collect_specimen))
        .route("/v1/ehr/lab-orders/:id/receive", post(lab_orders_handlers::receive_specimen).patch(lab_orders_handlers::receive_specimen))
        .route("/v1/ehr/lab-orders/:id/cancel", post(lab_orders_handlers::cancel_lab_order))
        // Lab results routes
        .route("/v1/ehr/lab-orders/:id/results", post(lab_results_handlers::enter_results))
        .route("/v1/ehr/lab-orders/:id/verify", post(lab_results_handlers::verify_results))
        // Anatomy findings routes (3D anatomy-based documentation)
        .route("/v1/ehr/encounters/:encounter_id/anatomy-findings", get(anatomy_findings_handlers::list_anatomy_findings))
        .route("/v1/ehr/encounters/:encounter_id/anatomy-findings", post(anatomy_findings_handlers::create_anatomy_finding))
        .route("/v1/ehr/encounters/:encounter_id/anatomy-findings/:finding_id", put(anatomy_findings_handlers::update_anatomy_finding))
        .route("/v1/ehr/encounters/:encounter_id/anatomy-findings/:finding_id", delete(anatomy_findings_handlers::delete_anatomy_finding))
        // Body systems taxonomy routes
        .route("/v1/ehr/body-systems", get(body_system_handlers::list_body_systems))
        .route("/v1/ehr/body-systems/:id", get(body_system_handlers::get_body_system))
        .route("/v1/ehr/body-systems/:id/lab-recommendations", get(body_system_handlers::get_lab_recommendations))
        // Problem list routes
        .route("/v1/ehr/problems", get(problem_list_handlers::list_problems))
        .route("/v1/ehr/problems", post(problem_list_handlers::create_problem))
        .route("/v1/ehr/problems/:id", get(problem_list_handlers::get_problem))
        .route("/v1/ehr/problems/:id", put(problem_list_handlers::update_problem))
        .route("/v1/ehr/problems/:id", delete(problem_list_handlers::delete_problem))
        .route("/v1/ehr/problems/:id/resolve", post(problem_list_handlers::resolve_problem))
        .route("/v1/ehr/problems/:id/comments", post(problem_list_handlers::add_problem_comment))
        .route("/v1/ehr/problems/:id/history", get(problem_list_handlers::list_problem_history))
        // Imaging/radiology orders routes
        .route("/v1/ehr/imaging-orders", get(imaging_orders_handlers::list_imaging_orders))
        .route("/v1/ehr/imaging-orders", post(imaging_orders_handlers::create_imaging_order))
        .route("/v1/ehr/imaging-orders/:id", get(imaging_orders_handlers::get_imaging_order))
        .route("/v1/ehr/imaging-orders/:id", put(imaging_orders_handlers::update_imaging_order))
        .route("/v1/ehr/imaging-orders/:id", delete(imaging_orders_handlers::delete_imaging_order))
        .route("/v1/ehr/imaging-orders/:id/perform", post(imaging_orders_handlers::perform_study))
        .route("/v1/ehr/imaging-orders/:id/report", post(imaging_orders_handlers::enter_report))
        .route("/v1/ehr/imaging-orders/:id/cancel", post(imaging_orders_handlers::cancel_imaging_order));

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

    // Workflow routes (protected) - n8n-style orchestration
    let workflow_routes = Router::new()
        // Workflow definitions
        .route("/v1/workflows", get(workflow_handlers::list_workflows))
        .route("/v1/workflows", post(workflow_handlers::create_workflow))
        .route("/v1/workflows/:workflow_id", get(workflow_handlers::get_workflow))
        .route("/v1/workflows/:workflow_id", put(workflow_handlers::update_workflow))
        .route("/v1/workflows/:workflow_id", delete(workflow_handlers::delete_workflow))
        // Workflow instances
        .route("/v1/workflows/:workflow_id/instances", post(workflow_handlers::start_workflow_instance))
        .route("/v1/workflow-instances", get(workflow_handlers::list_workflow_instances))
        .route("/v1/workflow-instances/:instance_id", get(workflow_handlers::get_workflow_instance))
        // Human tasks
        .route("/v1/workflow-tasks", get(workflow_handlers::list_tasks))
        .route("/v1/workflow-tasks/:task_id/claim", post(workflow_handlers::claim_task))
        .route("/v1/workflow-tasks/:task_id/complete", post(workflow_handlers::complete_task))
        // Events (n8n-style webhooks for module integration)
        .route("/v1/workflows/events/:event_type", post(workflow_handlers::emit_event))
        // Connectors
        .route("/v1/connectors", get(workflow_handlers::list_connectors));

    // Worklist routes (protected) - Universal task queue
    let worklist_routes = Router::new()
        .route("/v1/worklist", get(worklist_handlers::list_worklist))
        .route("/v1/worklist/summary", get(worklist_handlers::get_worklist_summary))
        .route("/v1/worklist", post(worklist_handlers::create_task))
        .route("/v1/worklist/:id/claim", post(worklist_handlers::claim_task).patch(worklist_handlers::claim_task))
        .route("/v1/worklist/:id/complete", post(worklist_handlers::complete_task).patch(worklist_handlers::complete_task))
        .route("/v1/worklist/:id/cancel", post(worklist_handlers::cancel_task).patch(worklist_handlers::cancel_task));

    // CDS routes (protected) - Clinical decision support
    let cds_routes = Router::new()
        .route("/v1/cds/alerts", get(cds_handlers::list_alerts))
        .route("/v1/cds/alerts/:patient_id", get(cds_handlers::get_patient_alerts))
        .route("/v1/cds/alerts/:alert_id/acknowledge", post(cds_handlers::acknowledge_alert))
        .route("/v1/cds/check-medication", post(cds_handlers::check_medication))
        .route("/v1/cds/rules", get(cds_handlers::list_cds_rules));

    // OPD routes (protected) - Outpatient department queue management
    let opd_routes = Router::new()
        .route("/v1/opd/queue", get(opd_handlers::list_opd_queue))
        .route("/v1/opd/queue", post(opd_handlers::create_queue_entry))
        .route("/v1/opd/queue/summary", get(opd_handlers::get_queue_summary))
        .route("/v1/opd/queue/:id/status", post(opd_handlers::update_queue_status).patch(opd_handlers::update_queue_status))
        .route("/v1/opd/queue/:id/start-consultation", post(opd_handlers::start_consultation))
        .route("/v1/opd/queue/:id/complete-consultation", post(opd_handlers::complete_consultation))
        .route("/v1/opd/queue/:id/cancel", post(opd_handlers::cancel_queue_entry));

    // Communications routes (protected) - Messages and notifications
    let communications_routes = Router::new()
        // Internal messages
        .route("/v1/messages", post(communications_handlers::send_message))
        .route("/v1/messages", get(communications_handlers::list_messages))
        .route("/v1/messages/:id/read", post(communications_handlers::mark_message_read).patch(communications_handlers::mark_message_read))
        // Notifications
        .route("/v1/notifications", get(communications_handlers::list_notifications))
        .route("/v1/notifications", post(communications_handlers::create_notification))
        .route("/v1/notifications/:id/read", post(communications_handlers::mark_notification_read).patch(communications_handlers::mark_notification_read))
        .route("/v1/notifications/read-all", post(communications_handlers::mark_all_notifications_read).patch(communications_handlers::mark_all_notifications_read));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(ehr_routes)
        .merge(pharmacy_routes)
        .merge(billing_routes)
        .merge(workflow_routes)
        .merge(worklist_routes)
        .merge(cds_routes)
        .merge(opd_routes)
        .merge(communications_routes)
}

#[allow(dead_code)]
async fn health_check() -> &'static str {
    "OK"
}
