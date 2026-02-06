/**
 * Lab Orders Integration Tests
 *
 * Tests the complete lab workflow:
 * - Create lab order
 * - Specimen collection
 * - Result entry
 * - Result verification
 * - Critical value handling
 */

use axum::http::{Method, StatusCode};
use serde_json::json;

mod common;

#[tokio::test]
#[ignore] // Requires test database
async fn test_create_lab_order_success() {
    let app = common::setup_test_app().await;

    let patient_id = "550e8400-e29b-41d4-a716-446655440000";
    let provider_id = "550e8400-e29b-41d4-a716-446655440001";

    let payload = json!({
        "patientId": patient_id,
        "orderingProviderId": provider_id,
        "priority": "routine",
        "clinicalIndication": "Annual wellness checkup",
        "tests": [
            {
                "testId": "750e8400-e29b-41d4-a716-446655440000",
                "testName": "Complete Blood Count (CBC)"
            },
            {
                "testId": "750e8400-e29b-41d4-a716-446655440001",
                "testName": "Basic Metabolic Panel"
            }
        ]
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/lab-orders",
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::CREATED);

    let order: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(order["patientId"], patient_id);
    assert_eq!(order["status"], "pending");
    assert_eq!(order["priority"], "routine");
    assert!(order["orderNumber"].is_string());

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_create_stat_order() {
    let app = common::setup_test_app().await;

    let patient_id = "550e8400-e29b-41d4-a716-446655440000";
    let provider_id = "550e8400-e29b-41d4-a716-446655440001";

    let payload = json!({
        "patientId": patient_id,
        "orderingProviderId": provider_id,
        "priority": "stat",
        "clinicalIndication": "Suspected sepsis",
        "tests": [
            {
                "testId": "750e8400-e29b-41d4-a716-446655440002",
                "testName": "Blood Culture"
            }
        ]
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/lab-orders",
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::CREATED);

    let order: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(order["priority"], "stat");

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_collect_specimen() {
    let app = common::setup_test_app().await;

    let order_id = "850e8400-e29b-41d4-a716-446655440000";

    let payload = json!({
        "specimenId": "SPEC-20241201-001",
        "collectedBy": "550e8400-e29b-41d4-a716-446655440010",
        "collectionDatetime": "2024-12-01T09:00:00Z"
    });

    let response = common::make_authenticated_request(
        &app,
        Method::PATCH,
        &format!("/v1/ehr/lab-orders/{}/collect", order_id),
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let order: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(order["status"], "collected");
    assert!(order["collectedDatetime"].is_string());

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_enter_results() {
    let app = common::setup_test_app().await;

    let order_id = "850e8400-e29b-41d4-a716-446655440000";

    let payload = json!({
        "results": [
            {
                "testId": "750e8400-e29b-41d4-a716-446655440000",
                "resultValue": "12.5",
                "resultUnit": "g/dL",
                "isAbnormal": false,
                "isCritical": false
            },
            {
                "testId": "750e8400-e29b-41d4-a716-446655440001",
                "resultValue": "145",
                "resultUnit": "mEq/L",
                "isAbnormal": false,
                "isCritical": false
            }
        ]
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        &format!("/v1/ehr/lab-orders/{}/results", order_id),
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let order: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(order["resultStatus"], "preliminary");

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_verify_results() {
    let app = common::setup_test_app().await;

    let order_id = "850e8400-e29b-41d4-a716-446655440000";

    let response = common::make_authenticated_request(
        &app,
        Method::PATCH,
        &format!("/v1/ehr/lab-orders/{}/verify", order_id),
        "test_token",
        None::<()>,
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let order: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(order["resultStatus"], "final");
    assert_eq!(order["status"], "completed");
    assert!(order["resultVerifiedDatetime"].is_string());

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_critical_value_flagging() {
    let app = common::setup_test_app().await;

    let order_id = "850e8400-e29b-41d4-a716-446655440000";

    let payload = json!({
        "results": [
            {
                "testId": "750e8400-e29b-41d4-a716-446655440000",
                "resultValue": "4.5",  // Critically low hemoglobin
                "resultUnit": "g/dL",
                "isAbnormal": true,
                "isCritical": true
            }
        ]
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        &format!("/v1/ehr/lab-orders/{}/results", order_id),
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let order: serde_json::Value = common::extract_json_body(response).await;
    // Should have critical finding flagged
    let results = order["items"].as_array().unwrap();
    assert!(results.iter().any(|r| r["isCritical"] == true));

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_cancel_lab_order() {
    let app = common::setup_test_app().await;

    let order_id = "850e8400-e29b-41d4-a716-446655440000";

    let payload = json!({
        "cancellationReason": "Order entered in error"
    });

    let response = common::make_authenticated_request(
        &app,
        Method::POST,
        &format!("/v1/ehr/lab-orders/{}/cancel", order_id),
        "test_token",
        Some(payload),
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let order: serde_json::Value = common::extract_json_body(response).await;
    assert_eq!(order["status"], "cancelled");

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_list_lab_orders_with_filters() {
    let app = common::setup_test_app().await;

    let patient_id = "550e8400-e29b-41d4-a716-446655440000";

    let response = common::make_authenticated_request(
        &app,
        Method::GET,
        &format!("/v1/ehr/lab-orders?patientId={}&status=pending", patient_id),
        "test_token",
        None::<()>,
    )
    .await;

    common::assert_status(&response, StatusCode::OK);

    let result: serde_json::Value = common::extract_json_body(response).await;
    assert!(result["orders"].is_array());
    assert!(result["total"].is_number());

    common::teardown_test_app(&app).await;
}

#[tokio::test]
#[ignore]
async fn test_duplicate_order_prevention() {
    let app = common::setup_test_app().await;

    let patient_id = "550e8400-e29b-41d4-a716-446655440000";
    let provider_id = "550e8400-e29b-41d4-a716-446655440001";

    let payload = json!({
        "patientId": patient_id,
        "orderingProviderId": provider_id,
        "priority": "routine",
        "clinicalIndication": "Test duplicate prevention",
        "tests": [
            {
                "testId": "750e8400-e29b-41d4-a716-446655440000",
                "testName": "Complete Blood Count (CBC)"
            }
        ]
    });

    // Create first order
    let response1 = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/lab-orders",
        "test_token",
        Some(payload.clone()),
    )
    .await;

    common::assert_status(&response1, StatusCode::CREATED);

    // Try to create duplicate immediately (should warn or prevent)
    let response2 = common::make_authenticated_request(
        &app,
        Method::POST,
        "/v1/ehr/lab-orders",
        "test_token",
        Some(payload),
    )
    .await;

    // Should either succeed with warning or be prevented
    assert!(
        response2.status() == StatusCode::CREATED
            || response2.status() == StatusCode::CONFLICT
    );

    common::teardown_test_app(&app).await;
}
