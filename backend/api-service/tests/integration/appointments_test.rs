/**
 * Appointments Integration Tests
 *
 * Tests the complete appointment lifecycle:
 * - Create appointment
 * - Schedule/reschedule
 * - Check-in
 * - Complete
 * - Cancel
 */

use axum::http::{Method, StatusCode};
use serde_json::json;

mod common;

#[tokio::test]
#[ignore] // Requires test database
async fn test_create_appointment_success() {
    let app = common::setup_test_app().await;

    // Create test patient and provider first
    let patient_id = "550e8400-e29b-41d4-a716-446655440000";
    let provider_id = "550e8400-e29b-41d4-a716-446655440001";

    let payload = json!({
        "patientId": patient_id,
        "providerId": provider_id,
        "appointmentType": "new_patient",
        "scheduledDatetime": "2024-12-01T10:00:00Z",
        "durationMinutes": 30,
        "reason": "Annual checkup"
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/appointments",
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::CREATED);

    let appointment: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(appointment["patientId"], patient_id);
    assert_eq!(appointment["status"], "scheduled");
    assert_eq!(appointment["durationMinutes"], 30);

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_create_appointment_missing_patient() {
    let app = common::setup_test_app().await;

    let payload = json!({
        "patientId": "00000000-0000-0000-0000-000000000000", // Non-existent
        "providerId": "550e8400-e29b-41d4-a716-446655440001",
        "appointmentType": "follow_up",
        "scheduledDatetime": "2024-12-01T10:00:00Z",
        "durationMinutes": 30
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/appointments",
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::NOT_FOUND);

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_check_in_appointment() {
    let app = common::setup_test_app().await;

    // Create appointment first
    let appointment_id = "650e8400-e29b-41d4-a716-446655440000";

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        &format!("/v1/ehr/appointments/{}/check-in", appointment_id),
        "test_token",
        None::<()>,
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let appointment: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(appointment["status"], "checked_in");
    assert!(appointment["checkInTime"].is_string());

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_cancel_appointment() {
    let app = common::setup_test_app().await;

    let appointment_id = "650e8400-e29b-41d4-a716-446655440000";

    let payload = json!({
        "cancellationReason": "Patient requested cancellation"
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        &format!("/v1/ehr/appointments/{}/cancel", appointment_id),
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let appointment: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(appointment["status"], "cancelled");
    assert!(appointment["cancelledDatetime"].is_string());

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_list_appointments_with_filters() {
    let app = common::setup_test_app().await;

    let patient_id = "550e8400-e29b-41d4-a716-446655440000";

    let response = common::make_authenticated_request(
        &app,
        Method::GET,
        &format!("/v1/ehr/appointments?patientId={}&status=scheduled", patient_id),
        "test_token",
        None::<()>,
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let result: serde_json::Value = common::extract_json_body(response).await;
    assert!(result["appointments"].is_array());
    assert!(result["total"].is_number());

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_invalid_appointment_type() {
    let app = common::setup_test_app().await;

    let payload = json!({
        "patientId": "550e8400-e29b-41d4-a716-446655440000",
        "providerId": "550e8400-e29b-41d4-a716-446655440001",
        "appointmentType": "invalid_type",
        "scheduledDatetime": "2024-12-01T10:00:00Z",
        "durationMinutes": 30
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/appointments",
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::BAD_REQUEST);

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_appointment_duration_boundaries() {
    let app = common::setup_test_app().await;

    // Test minimum duration (should succeed)
    let payload = json!({
        "patientId": "550e8400-e29b-41d4-a716-446655440000",
        "providerId": "550e8400-e29b-41d4-a716-446655440001",
        "appointmentType": "follow_up",
        "scheduledDatetime": "2024-12-01T10:00:00Z",
        "durationMinutes": 15
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/appointments",
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::CREATED);

    // Test maximum duration (should succeed)
    let payload = json!({
        "patientId": "550e8400-e29b-41d4-a716-446655440000",
        "providerId": "550e8400-e29b-41d4-a716-446655440001",
        "appointmentType": "follow_up",
        "scheduledDatetime": "2024-12-01T11:00:00Z",
        "durationMinutes": 480
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/appointments",
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::CREATED);

    // Test invalid duration (should fail)
    let payload = json!({
        "patientId": "550e8400-e29b-41d4-a716-446655440000",
        "providerId": "550e8400-e29b-41d4-a716-446655440001",
        "appointmentType": "follow_up",
        "scheduledDatetime": "2024-12-01T12:00:00Z",
        "durationMinutes": 0
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/appointments",
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::BAD_REQUEST);

    common::teardown_test_app(&app).await;
}
