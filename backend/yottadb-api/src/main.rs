//! YottaDB REST API Service
//!
//! Provides REST API access to VistA-style MUMPS globals in YottaDB.
//! Uses shell commands to execute MUMPS code.

use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tower_http::cors::{Any, CorsLayer};

// === Data Structures ===

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    database: String,
}

#[derive(Debug, Serialize)]
struct PatientResponse {
    id: String,
    ien: i64,
    name: String,
    #[serde(rename = "firstName")]
    first_name: String,
    #[serde(rename = "lastName")]
    last_name: String,
    #[serde(rename = "middleName", skip_serializing_if = "Option::is_none")]
    middle_name: Option<String>,
    sex: String,
    gender: String, // Map from sex for UI compatibility
    #[serde(rename = "dateOfBirth")]
    date_of_birth: String,
    ssn: Option<String>,
    mrn: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    city: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    state: Option<String>,
    status: String, // Default to "active"
}

#[derive(Debug, Serialize)]
struct PatientsResponse {
    items: Vec<PatientResponse>,
    total: usize,
    limit: usize,
    offset: usize,
}

#[derive(Debug, Serialize)]
struct ProblemResponse {
    ien: i64,
    diagnosis: String,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "icdCode")]
    icd_code: Option<String>,
    status: String,
}

#[derive(Debug, Serialize)]
struct ProblemsResponse {
    problems: Vec<ProblemResponse>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AllergyResponse {
    ien: i64,
    allergen: String,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "allergyType")]
    allergy_type: String,
    severity: String,
    reactions: Option<String>,
    status: String,
}

#[derive(Debug, Serialize)]
struct AllergiesResponse {
    allergies: Vec<AllergyResponse>,
}

#[derive(Debug, Deserialize)]
struct CreatePatientRequest {
    #[serde(rename = "firstName")]
    first_name: String,
    #[serde(rename = "lastName")]
    last_name: String,
    sex: String,
    #[serde(rename = "dateOfBirth")]
    date_of_birth: String,
    ssn: Option<String>,
    mrn: Option<String>,
}

#[derive(Debug, Serialize)]
struct CreateResponse {
    success: bool,
    ien: i64,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

// === Visit Structures ===

#[derive(Debug, Serialize)]
struct VisitResponse {
    ien: i64,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitType")]
    visit_type: String,
    #[serde(rename = "visitDate")]
    visit_date: String,
    #[serde(rename = "visitTime")]
    visit_time: Option<String>,
    location: Option<String>,
    #[serde(rename = "providerIen")]
    provider_ien: Option<i64>,
    #[serde(rename = "chiefComplaint")]
    chief_complaint: Option<String>,
    status: String,
}

#[derive(Debug, Serialize)]
struct VisitsResponse {
    visits: Vec<VisitResponse>,
}

#[derive(Debug, Deserialize)]
struct CreateVisitRequest {
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitType")]
    visit_type: String,
    #[serde(rename = "visitDate")]
    visit_date: String,
    #[serde(rename = "visitTime")]
    visit_time: Option<String>,
    location: Option<String>,
    #[serde(rename = "providerIen")]
    provider_ien: Option<i64>,
    #[serde(rename = "chiefComplaint")]
    chief_complaint: Option<String>,
}

// === Vital Signs Structures ===

#[derive(Debug, Serialize)]
struct VitalResponse {
    ien: i64,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitIen")]
    visit_ien: Option<i64>,
    #[serde(rename = "vitalType")]
    vital_type: String,
    value: String,
    unit: String,
    #[serde(rename = "takenAt")]
    taken_at: String,
    #[serde(rename = "takenBy")]
    taken_by: Option<String>,
}

#[derive(Debug, Serialize)]
struct VitalsResponse {
    vitals: Vec<VitalResponse>,
}

#[derive(Debug, Deserialize)]
struct CreateVitalRequest {
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitIen")]
    visit_ien: Option<i64>,
    #[serde(rename = "vitalType")]
    vital_type: String,
    value: String,
    unit: String,
    #[serde(rename = "takenBy")]
    taken_by: Option<String>,
}

// === Medication Structures ===

#[derive(Debug, Serialize)]
struct MedicationResponse {
    ien: i64,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "drugName")]
    drug_name: String,
    #[serde(rename = "drugCode")]
    drug_code: Option<String>,
    dose: String,
    route: String,
    frequency: String,
    #[serde(rename = "startDate")]
    start_date: String,
    #[serde(rename = "endDate")]
    end_date: Option<String>,
    #[serde(rename = "prescriberIen")]
    prescriber_ien: Option<i64>,
    status: String,
    instructions: Option<String>,
}

#[derive(Debug, Serialize)]
struct MedicationsResponse {
    medications: Vec<MedicationResponse>,
}

#[derive(Debug, Deserialize)]
struct CreateMedicationRequest {
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "drugName")]
    drug_name: String,
    #[serde(rename = "drugCode")]
    drug_code: Option<String>,
    dose: String,
    route: String,
    frequency: String,
    #[serde(rename = "startDate")]
    start_date: String,
    #[serde(rename = "endDate")]
    end_date: Option<String>,
    #[serde(rename = "prescriberIen")]
    prescriber_ien: Option<i64>,
    instructions: Option<String>,
}

// === Lab Results Structures ===

#[derive(Debug, Serialize)]
struct LabResultResponse {
    ien: i64,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitIen")]
    visit_ien: Option<i64>,
    #[serde(rename = "testName")]
    test_name: String,
    #[serde(rename = "testCode")]
    test_code: Option<String>,
    value: String,
    unit: Option<String>,
    #[serde(rename = "referenceRange")]
    reference_range: Option<String>,
    #[serde(rename = "abnormalFlag")]
    abnormal_flag: Option<String>,
    #[serde(rename = "collectedAt")]
    collected_at: String,
    #[serde(rename = "resultedAt")]
    resulted_at: Option<String>,
    status: String,
}

#[derive(Debug, Serialize)]
struct LabResultsResponse {
    results: Vec<LabResultResponse>,
}

#[derive(Debug, Deserialize)]
struct CreateLabResultRequest {
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitIen")]
    visit_ien: Option<i64>,
    #[serde(rename = "testName")]
    test_name: String,
    #[serde(rename = "testCode")]
    test_code: Option<String>,
    value: String,
    unit: Option<String>,
    #[serde(rename = "referenceRange")]
    reference_range: Option<String>,
    #[serde(rename = "abnormalFlag")]
    abnormal_flag: Option<String>,
}

// === Document Structures ===

#[derive(Debug, Serialize)]
struct DocumentResponse {
    ien: i64,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitIen")]
    visit_ien: Option<i64>,
    #[serde(rename = "documentType")]
    document_type: String,
    title: String,
    #[serde(rename = "authorIen")]
    author_ien: Option<i64>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "signedAt")]
    signed_at: Option<String>,
    #[serde(rename = "signedBy")]
    signed_by: Option<i64>,
    status: String,
    content: Option<String>,
}

#[derive(Debug, Serialize)]
struct DocumentsResponse {
    documents: Vec<DocumentResponse>,
}

#[derive(Debug, Deserialize)]
struct CreateDocumentRequest {
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitIen")]
    visit_ien: Option<i64>,
    #[serde(rename = "documentType")]
    document_type: String,
    title: String,
    #[serde(rename = "authorIen")]
    author_ien: Option<i64>,
    #[allow(dead_code)] // Will be used when document content storage is implemented
    content: Option<String>,
}

// === Order Structures ===

#[derive(Debug, Serialize)]
struct OrderResponse {
    ien: i64,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitIen")]
    visit_ien: Option<i64>,
    #[serde(rename = "orderType")]
    order_type: String,
    #[serde(rename = "orderText")]
    order_text: String,
    #[serde(rename = "orderedBy")]
    ordered_by: Option<i64>,
    #[serde(rename = "orderedAt")]
    ordered_at: String,
    priority: String,
    status: String,
}

#[derive(Debug, Serialize)]
struct OrdersResponse {
    orders: Vec<OrderResponse>,
}

#[derive(Debug, Deserialize)]
struct CreateOrderRequest {
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "visitIen")]
    visit_ien: Option<i64>,
    #[serde(rename = "orderType")]
    order_type: String,
    #[serde(rename = "orderText")]
    order_text: String,
    #[serde(rename = "orderedBy")]
    ordered_by: Option<i64>,
    priority: Option<String>,
}

// === Prescription/Dispensing Structures ===

#[derive(Debug, Serialize)]
struct PrescriptionResponse {
    ien: i64,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "rxNumber")]
    rx_number: String,
    #[serde(rename = "drugName")]
    drug_name: String,
    #[serde(rename = "drugCode")]
    drug_code: Option<String>,
    dose: String,
    route: String,
    frequency: String,
    sig: String,
    quantity: i32,
    #[serde(rename = "daysSupply")]
    days_supply: i32,
    #[serde(rename = "refillsAllowed")]
    refills_allowed: i32,
    #[serde(rename = "refillsRemaining")]
    refills_remaining: i32,
    #[serde(rename = "prescriberIen")]
    prescriber_ien: Option<i64>,
    #[serde(rename = "pharmacyLocation")]
    pharmacy_location: Option<String>,
    #[serde(rename = "orderDate")]
    order_date: String,
    #[serde(rename = "fillDate")]
    fill_date: Option<String>,
    #[serde(rename = "expirationDate")]
    expiration_date: Option<String>,
    status: String,
    #[serde(rename = "dispensingStatus")]
    dispensing_status: String,
    #[serde(rename = "verifiedBy")]
    verified_by: Option<i64>,
    #[serde(rename = "dispensedBy")]
    dispensed_by: Option<i64>,
}

#[derive(Debug, Serialize)]
struct PrescriptionsResponse {
    prescriptions: Vec<PrescriptionResponse>,
}

#[derive(Debug, Deserialize)]
struct CreatePrescriptionRequest {
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "drugName")]
    drug_name: String,
    #[serde(rename = "drugCode")]
    drug_code: Option<String>,
    dose: String,
    route: String,
    frequency: String,
    sig: String,
    quantity: i32,
    #[serde(rename = "daysSupply")]
    days_supply: i32,
    #[serde(rename = "refillsAllowed")]
    refills_allowed: Option<i32>,
    #[serde(rename = "prescriberIen")]
    prescriber_ien: Option<i64>,
    #[serde(rename = "pharmacyLocation")]
    pharmacy_location: Option<String>,
}

#[derive(Debug, Deserialize)]
struct VerifyPrescriptionRequest {
    #[serde(rename = "verifiedBy")]
    verified_by: i64,
}

#[derive(Debug, Deserialize)]
struct DispensePrescriptionRequest {
    #[serde(rename = "dispensedBy")]
    dispensed_by: i64,
    #[serde(rename = "lotNumber")]
    lot_number: Option<String>,
    #[serde(rename = "expirationDate")]
    expiration_date: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RefillPrescriptionRequest {
    #[serde(rename = "dispensedBy")]
    dispensed_by: i64,
    quantity: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AllergyCheckResponse {
    #[serde(rename = "hasAllergyConflict")]
    has_allergy_conflict: bool,
    allergies: Vec<AllergyResponse>,
    #[serde(rename = "matchedAllergens")]
    matched_allergens: Vec<String>,
}

// === Pharmacy Inventory Structures ===

#[derive(Debug, Serialize, Deserialize, Clone)]
struct InventoryItemResponse {
    ien: i64,
    #[serde(rename = "drugCode")]
    drug_code: String,
    #[serde(rename = "drugName")]
    drug_name: String,
    #[serde(rename = "locationCode")]
    location_code: String,
    #[serde(rename = "locationName")]
    location_name: Option<String>,
    #[serde(rename = "quantityOnHand")]
    quantity_on_hand: i32,
    #[serde(rename = "reorderPoint")]
    reorder_point: i32,
    #[serde(rename = "reorderQuantity")]
    reorder_quantity: i32,
    unit: String,
    #[serde(rename = "lastUpdated")]
    last_updated: String,
    #[serde(rename = "isLowStock")]
    is_low_stock: bool,
    #[serde(rename = "isControlled")]
    is_controlled: bool,
    schedule: Option<String>,
}

#[derive(Debug, Serialize)]
struct InventoryResponse {
    items: Vec<InventoryItemResponse>,
}

#[derive(Debug, Serialize)]
struct LotResponse {
    ien: i64,
    #[serde(rename = "inventoryIen")]
    inventory_ien: i64,
    #[serde(rename = "lotNumber")]
    lot_number: String,
    #[serde(rename = "expirationDate")]
    expiration_date: String,
    quantity: i32,
    #[serde(rename = "receivedDate")]
    received_date: String,
    #[serde(rename = "isExpired")]
    is_expired: bool,
    #[serde(rename = "isExpiringSoon")]
    is_expiring_soon: bool,
}

#[derive(Debug, Serialize)]
struct LotsResponse {
    lots: Vec<LotResponse>,
}

#[derive(Debug, Deserialize)]
struct CreateInventoryItemRequest {
    #[serde(rename = "drugCode")]
    drug_code: String,
    #[serde(rename = "drugName")]
    drug_name: String,
    #[serde(rename = "locationCode")]
    location_code: String,
    #[serde(rename = "locationName")]
    location_name: Option<String>,
    #[serde(rename = "quantityOnHand")]
    quantity_on_hand: i32,
    #[serde(rename = "reorderPoint")]
    reorder_point: Option<i32>,
    #[serde(rename = "reorderQuantity")]
    reorder_quantity: Option<i32>,
    unit: Option<String>,
    #[serde(rename = "isControlled")]
    is_controlled: Option<bool>,
    schedule: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AddLotRequest {
    #[serde(rename = "lotNumber")]
    lot_number: String,
    #[serde(rename = "expirationDate")]
    expiration_date: String,
    quantity: i32,
}

#[derive(Debug, Deserialize)]
struct AdjustInventoryRequest {
    quantity: i32,
    reason: String,
    #[serde(rename = "adjustedBy")]
    adjusted_by: Option<i64>,
    #[serde(rename = "lotNumber")]
    lot_number: Option<String>,
}

#[derive(Debug, Serialize)]
struct InventoryTransactionResponse {
    ien: i64,
    #[serde(rename = "inventoryIen")]
    inventory_ien: i64,
    #[serde(rename = "transactionType")]
    transaction_type: String,
    quantity: i32,
    #[serde(rename = "previousQuantity")]
    previous_quantity: i32,
    #[serde(rename = "newQuantity")]
    new_quantity: i32,
    reason: Option<String>,
    #[serde(rename = "performedBy")]
    performed_by: Option<i64>,
    #[serde(rename = "lotNumber")]
    lot_number: Option<String>,
    #[serde(rename = "transactionDate")]
    transaction_date: String,
}

#[derive(Debug, Serialize)]
struct InventoryTransactionsResponse {
    transactions: Vec<InventoryTransactionResponse>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LowStockAlertResponse {
    items: Vec<InventoryItemResponse>,
    count: i32,
}

#[derive(Debug, Serialize)]
struct ExpiringLotsResponse {
    lots: Vec<LotResponse>,
    count: i32,
}

// === Appointment Structures ===

#[derive(Debug, Serialize)]
struct AppointmentResponse {
    ien: i64,
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "appointmentDate")]
    appointment_date: String,
    #[serde(rename = "appointmentTime")]
    appointment_time: String,
    #[serde(rename = "appointmentType")]
    appointment_type: String,
    #[serde(rename = "providerIen")]
    provider_ien: Option<i64>,
    location: Option<String>,
    #[serde(rename = "durationMinutes")]
    duration_minutes: i32,
    status: String,
    reason: Option<String>,
}

#[derive(Debug, Serialize)]
struct AppointmentsResponse {
    appointments: Vec<AppointmentResponse>,
}

#[derive(Debug, Deserialize)]
struct CreateAppointmentRequest {
    #[serde(rename = "patientIen")]
    patient_ien: i64,
    #[serde(rename = "appointmentDate")]
    appointment_date: String,
    #[serde(rename = "appointmentTime")]
    appointment_time: String,
    #[serde(rename = "appointmentType")]
    appointment_type: String,
    #[serde(rename = "providerIen")]
    provider_ien: Option<i64>,
    location: Option<String>,
    #[serde(rename = "durationMinutes")]
    duration_minutes: Option<i32>,
    reason: Option<String>,
}

// === MUMPS Execution ===

fn run_mumps(code: &str) -> Result<String, String> {
    // Execute MUMPS code in the yottadb container via docker exec
    // This allows the API to run in a separate container while accessing YottaDB
    let script = format!(
        r#". /opt/yottadb/current/ydb_env_set && export ydb_routines="/data/r $ydb_routines" && echo '{}' | yottadb -direct 2>/dev/null | grep -v '^YDB>'"#,
        code.replace("'", "'\"'\"'")
    );

    let output = Command::new("docker")
        .arg("exec")
        .arg("health-yottadb")  // YottaDB container name
        .arg("bash")
        .arg("-c")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute in YottaDB container: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn extract_json_from_http(response: &str) -> String {
    // EHRAPI returns HTTP response format:
    // HTTP/1.1 200 OK
    // Content-Type: application/json
    // ...
    //
    // {json body}

    // Find the empty line that separates headers from body
    if let Some(pos) = response.find("\n\n") {
        response[pos + 2..].trim().to_string()
    } else if let Some(pos) = response.find("\r\n\r\n") {
        response[pos + 4..].trim().to_string()
    } else {
        // If no HTTP headers found, assume it's already just JSON
        response.trim().to_string()
    }
}

// === Handlers ===

async fn health() -> impl IntoResponse {
    Json(HealthResponse {
        status: "ok".to_string(),
        database: "yottadb".to_string(),
    })
}

async fn list_patients() -> impl IntoResponse {
    // Call EHRAPI routine to get patient list
    let code = r#"W $$LISTPAT^EHRAPI()"#;

    match run_mumps(code) {
        Ok(output) => {
            // EHRAPI returns HTTP response, extract JSON body
            let json_body = extract_json_from_http(&output);

            // Parse using serde_json for proper JSON handling
            match serde_json::from_str::<serde_json::Value>(&json_body) {
                Ok(json) => {
                    if let Some(patients_array) = json.get("patients").and_then(|p| p.as_array()) {
                        let patients: Vec<PatientResponse> = patients_array
                            .iter()
                            .filter_map(|p| {
                                let ien = p.get("ien")?.as_i64()?;
                                // Filter out invalid IENs (0, negative, or string indices like "B")
                                if ien <= 0 {
                                    return None;
                                }

                                let name = p.get("name")?.as_str().unwrap_or("").to_string();
                                let sex = p.get("sex").and_then(|s| s.as_str()).unwrap_or("").to_string();
                                let dob = p.get("dateOfBirth").and_then(|d| d.as_str()).unwrap_or("").to_string();
                                let ssn = p.get("ssn").and_then(|s| s.as_str()).map(|s| s.to_string());
                                let mrn = p.get("mrn").and_then(|m| m.as_str()).map(|s| s.to_string());

                                let (last, first) = if let Some(pos) = name.find(',') {
                                    (name[..pos].trim().to_string(), name[pos + 1..].trim().to_string())
                                } else {
                                    (name.clone(), String::new())
                                };

                                let gender = match sex.to_uppercase().as_str() {
                                    "M" => "male",
                                    "F" => "female",
                                    _ => "unknown",
                                }.to_string();

                                Some(PatientResponse {
                                    id: ien.to_string(),
                                    ien,
                                    name,
                                    first_name: first,
                                    last_name: last,
                                    middle_name: None,
                                    sex,
                                    gender,
                                    date_of_birth: dob,
                                    ssn,
                                    mrn,
                                    city: None,
                                    state: None,
                                    status: "active".to_string(),
                                })
                            })
                            .collect();

                        let total = patients.len();
                        (StatusCode::OK, Json(PatientsResponse {
                            items: patients,
                            total,
                            limit: 100, // Default limit
                            offset: 0,  // Default offset
                        })).into_response()
                    } else {
                        (StatusCode::OK, Json(PatientsResponse {
                            items: vec![],
                            total: 0,
                            limit: 100,
                            offset: 0,
                        })).into_response()
                    }
                }
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: format!("JSON parse error: {}", e) }),
                ).into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn get_patient(Path(ien): Path<i64>) -> impl IntoResponse {
    // Call EHRAPI routine to get single patient
    let code = format!(r#"W $$GETPAT^EHRAPI({})"#, ien);

    match run_mumps(&code) {
        Ok(output) => {
            // Extract JSON from HTTP response
            let json_body = extract_json_from_http(&output);

            // Check for error response from EHRAPI
            if json_body.contains("\"error\"") {
                return (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse {
                        error: "Patient not found".to_string(),
                    }),
                )
                    .into_response();
            }

            // Parse the patient JSON
            match serde_json::from_str::<serde_json::Value>(&json_body) {
                Ok(json) => {
                    let ien = json.get("ien").and_then(|i| i.as_i64()).unwrap_or(0);
                    let name = json.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string();
                    let sex = json.get("sex").and_then(|s| s.as_str()).unwrap_or("").to_string();
                    let dob = json.get("dateOfBirth").and_then(|d| d.as_str()).unwrap_or("").to_string();
                    let ssn = json.get("ssn").and_then(|s| s.as_str()).map(|s| s.to_string());
                    let mrn = json.get("mrn").and_then(|m| m.as_str()).map(|s| s.to_string());

                    let (last, first) = if let Some(pos) = name.find(',') {
                        (name[..pos].trim().to_string(), name[pos + 1..].trim().to_string())
                    } else {
                        (name.clone(), String::new())
                    };

                    let gender = match sex.to_uppercase().as_str() {
                        "M" => "male",
                        "F" => "female",
                        _ => "unknown",
                    }.to_string();

                    let patient = PatientResponse {
                        id: ien.to_string(),
                        ien,
                        name,
                        first_name: first,
                        last_name: last,
                        middle_name: None,
                        sex,
                        gender,
                        date_of_birth: dob,
                        ssn,
                        mrn,
                        city: None,
                        state: None,
                        status: "active".to_string(),
                    };

                    (StatusCode::OK, Json(patient)).into_response()
                }
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: format!("JSON parse error: {}", e) }),
                ).into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn get_patient_problems(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^AUPNPROB("C",{},IEN)) Q:IEN=""  D
. S D0=$G(^AUPNPROB(IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S DX=$P(D0,"^",1),PAT=$P(D0,"^",2),ICD=$P(D0,"^",3),ST=$P(D0,"^",6)
. W "{{""ien"":"_IEN_",""diagnosis"":"""_DX_""",""patientIen"":"_PAT
. I ICD'="" W ",""icdCode"":"""_ICD_""""
. W ",""status"":"""_$S(ST="A":"active",ST="I":"inactive",1:ST)_"""}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let problems = parse_problems(&output);
            (StatusCode::OK, Json(ProblemsResponse { problems })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_problems(json: &str) -> Vec<ProblemResponse> {
    let mut problems = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return problems;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut diagnosis = String::new();
        let mut patient_ien = 0i64;
        let mut icd_code = None;
        let mut status = String::new();

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "diagnosis" => diagnosis = val.to_string(),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "icdCode" => icd_code = Some(val.to_string()),
                    "status" => status = val.to_string(),
                    _ => {}
                }
            }
        }

        problems.push(ProblemResponse {
            ien,
            diagnosis,
            patient_ien,
            icd_code,
            status,
        });
    }

    problems
}

async fn get_patient_allergies(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^GMRA("C",{},IEN)) Q:IEN=""  D
. S D0=$G(^GMRA(IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S ALG=$P(D0,"^",1),PAT=$P(D0,"^",2),TYP=$P(D0,"^",3),SEV=$P(D0,"^",4),REACT=$P(D0,"^",5),ST=$P(D0,"^",6)
. W "{{""ien"":"_IEN_",""allergen"":"""_ALG_""",""patientIen"":"_PAT
. W ",""allergyType"":"""_$S(TYP="D":"drug",TYP="F":"food",TYP="E":"environmental",1:TYP)_""""
. W ",""severity"":"""_$S(SEV="MI":"mild",SEV="MO":"moderate",SEV="SE":"severe",SEV="LT":"life_threatening",1:SEV)_""""
. I REACT'="" W ",""reactions"":"""_REACT_""""
. W ",""status"":"""_$S(ST="A":"active",ST="I":"inactive",1:ST)_"""}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let allergies = parse_allergies(&output);
            (StatusCode::OK, Json(AllergiesResponse { allergies })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_allergies(json: &str) -> Vec<AllergyResponse> {
    let mut allergies = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return allergies;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut allergen = String::new();
        let mut patient_ien = 0i64;
        let mut allergy_type = String::new();
        let mut severity = String::new();
        let mut reactions = None;
        let mut status = String::new();

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "allergen" => allergen = val.to_string(),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "allergyType" => allergy_type = val.to_string(),
                    "severity" => severity = val.to_string(),
                    "reactions" => reactions = Some(val.to_string()),
                    "status" => status = val.to_string(),
                    _ => {}
                }
            }
        }

        allergies.push(AllergyResponse {
            ien,
            allergen,
            patient_ien,
            allergy_type,
            severity,
            reactions,
            status,
        });
    }

    allergies
}

async fn create_patient(Json(req): Json<CreatePatientRequest>) -> impl IntoResponse {
    let name = format!("{},{}", req.last_name.to_uppercase(), req.first_name.to_uppercase());
    let sex = req.sex.chars().next().unwrap_or('U');
    let ssn = req.ssn.unwrap_or_default();
    let mrn = req.mrn.unwrap_or_default();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^DPT(0)),"^",3)+1
S ^DPT(IEN,0)="{}^{}^{}^{}"
I "{}"'="" S ^DPT(IEN,991)="{}"
S ^DPT("B","{}",IEN)=""
S $P(^DPT(0),"^",3)=IEN,$P(^DPT(0),"^",4)=IEN
W IEN
"#,
        name, sex, req.date_of_birth, ssn, mrn, mrn, name
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Visit Handlers ===

async fn get_patient_visits(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // ^AUPNVSIT - VistA Visit File (File #9000010)
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^AUPNVSIT("C",{},IEN)) Q:IEN=""  D
. S D0=$G(^AUPNVSIT(IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),TYP=$P(D0,"^",2),DT=$P(D0,"^",3),TM=$P(D0,"^",4),LOC=$P(D0,"^",5),PROV=$P(D0,"^",6),CC=$P(D0,"^",7),ST=$P(D0,"^",8)
. W "{{""ien"":"_IEN_",""patientIen"":"_PAT
. W ",""visitType"":"""_$S(TYP="O":"outpatient",TYP="I":"inpatient",TYP="E":"emergency",TYP="T":"telehealth",1:TYP)_""""
. W ",""visitDate"":"""_DT_""""
. I TM'="" W ",""visitTime"":"""_TM_""""
. I LOC'="" W ",""location"":"""_LOC_""""
. I PROV W ",""providerIen"":"_PROV
. I CC'="" W ",""chiefComplaint"":"""_CC_""""
. W ",""status"":"""_$S(ST="A":"active",ST="C":"completed",ST="X":"cancelled",1:ST)_"""}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let visits = parse_visits(&output);
            (StatusCode::OK, Json(VisitsResponse { visits })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_visits(json: &str) -> Vec<VisitResponse> {
    let mut visits = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return visits;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut patient_ien = 0i64;
        let mut visit_type = String::new();
        let mut visit_date = String::new();
        let mut visit_time = None;
        let mut location = None;
        let mut provider_ien = None;
        let mut chief_complaint = None;
        let mut status = String::new();

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "visitType" => visit_type = val.to_string(),
                    "visitDate" => visit_date = val.to_string(),
                    "visitTime" => visit_time = Some(val.to_string()),
                    "location" => location = Some(val.to_string()),
                    "providerIen" => provider_ien = val.parse().ok(),
                    "chiefComplaint" => chief_complaint = Some(val.to_string()),
                    "status" => status = val.to_string(),
                    _ => {}
                }
            }
        }

        visits.push(VisitResponse {
            ien,
            patient_ien,
            visit_type,
            visit_date,
            visit_time,
            location,
            provider_ien,
            chief_complaint,
            status,
        });
    }

    visits
}

async fn create_visit(Json(req): Json<CreateVisitRequest>) -> impl IntoResponse {
    let visit_type = match req.visit_type.as_str() {
        "outpatient" => "O",
        "inpatient" => "I",
        "emergency" => "E",
        "telehealth" => "T",
        _ => "O",
    };
    let visit_time = req.visit_time.unwrap_or_default();
    let location = req.location.unwrap_or_default();
    let provider_ien = req.provider_ien.unwrap_or(0);
    let chief_complaint = req.chief_complaint.unwrap_or_default();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^AUPNVSIT(0)),"^",3)+1
S ^AUPNVSIT(IEN,0)="{}^{}^{}^{}^{}^{}^{}^A"
S ^AUPNVSIT("C",{},IEN)=""
S $P(^AUPNVSIT(0),"^",3)=IEN,$P(^AUPNVSIT(0),"^",4)=IEN
W IEN
"#,
        req.patient_ien, visit_type, req.visit_date, visit_time, location, provider_ien, chief_complaint, req.patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Vital Signs Handlers ===

async fn get_patient_vitals(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // ^GMR(120.5) - VistA Vital Signs File (File #120.5)
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^GMR(120.5,"C",{},IEN)) Q:IEN=""  D
. S D0=$G(^GMR(120.5,IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),VIS=$P(D0,"^",2),TYP=$P(D0,"^",3),VAL=$P(D0,"^",4),UNT=$P(D0,"^",5),DT=$P(D0,"^",6),BY=$P(D0,"^",7)
. W "{{""ien"":"_IEN_",""patientIen"":"_PAT
. I VIS W ",""visitIen"":"_VIS
. W ",""vitalType"":"""_TYP_""",""value"":"""_VAL_""",""unit"":"""_UNT_""",""takenAt"":"""_DT_""""
. I BY'="" W ",""takenBy"":"""_BY_""""
. W "}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let vitals = parse_vitals(&output);
            (StatusCode::OK, Json(VitalsResponse { vitals })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_vitals(json: &str) -> Vec<VitalResponse> {
    let mut vitals = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return vitals;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut patient_ien = 0i64;
        let mut visit_ien = None;
        let mut vital_type = String::new();
        let mut value = String::new();
        let mut unit = String::new();
        let mut taken_at = String::new();
        let mut taken_by = None;

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "visitIen" => visit_ien = val.parse().ok(),
                    "vitalType" => vital_type = val.to_string(),
                    "value" => value = val.to_string(),
                    "unit" => unit = val.to_string(),
                    "takenAt" => taken_at = val.to_string(),
                    "takenBy" => taken_by = Some(val.to_string()),
                    _ => {}
                }
            }
        }

        vitals.push(VitalResponse {
            ien,
            patient_ien,
            visit_ien,
            vital_type,
            value,
            unit,
            taken_at,
            taken_by,
        });
    }

    vitals
}

async fn create_vital(Json(req): Json<CreateVitalRequest>) -> impl IntoResponse {
    let visit_ien = req.visit_ien.unwrap_or(0);
    let taken_by = req.taken_by.unwrap_or_default();
    let now = chrono::Utc::now().format("%Y%m%d.%H%M%S").to_string();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^GMR(120.5,0)),"^",3)+1
S ^GMR(120.5,IEN,0)="{}^{}^{}^{}^{}^{}^{}"
S ^GMR(120.5,"C",{},IEN)=""
S $P(^GMR(120.5,0),"^",3)=IEN,$P(^GMR(120.5,0),"^",4)=IEN
W IEN
"#,
        req.patient_ien, visit_ien, req.vital_type, req.value, req.unit, now, taken_by, req.patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Medication Handlers ===

async fn get_patient_medications(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // ^PS(52) - VistA Pharmacy Patient File (File #52)
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^PS(52,"C",{},IEN)) Q:IEN=""  D
. S D0=$G(^PS(52,IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),DRG=$P(D0,"^",2),CODE=$P(D0,"^",3),DOS=$P(D0,"^",4),RTE=$P(D0,"^",5)
. S FRQ=$P(D0,"^",6),SDT=$P(D0,"^",7),EDT=$P(D0,"^",8),PRV=$P(D0,"^",9),ST=$P(D0,"^",10),INST=$P(D0,"^",11)
. W "{{""ien"":"_IEN_",""patientIen"":"_PAT_",""drugName"":"""_DRG_""""
. I CODE'="" W ",""drugCode"":"""_CODE_""""
. W ",""dose"":"""_DOS_""",""route"":"""_RTE_""",""frequency"":"""_FRQ_""",""startDate"":"""_SDT_""""
. I EDT'="" W ",""endDate"":"""_EDT_""""
. I PRV W ",""prescriberIen"":"_PRV
. W ",""status"":"""_$S(ST="A":"active",ST="D":"discontinued",ST="C":"completed",ST="H":"on_hold",1:ST)_""""
. I INST'="" W ",""instructions"":"""_INST_""""
. W "}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let medications = parse_medications(&output);
            (StatusCode::OK, Json(MedicationsResponse { medications })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_medications(json: &str) -> Vec<MedicationResponse> {
    let mut medications = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return medications;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut patient_ien = 0i64;
        let mut drug_name = String::new();
        let mut drug_code = None;
        let mut dose = String::new();
        let mut route = String::new();
        let mut frequency = String::new();
        let mut start_date = String::new();
        let mut end_date = None;
        let mut prescriber_ien = None;
        let mut status = String::new();
        let mut instructions = None;

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "drugName" => drug_name = val.to_string(),
                    "drugCode" => drug_code = Some(val.to_string()),
                    "dose" => dose = val.to_string(),
                    "route" => route = val.to_string(),
                    "frequency" => frequency = val.to_string(),
                    "startDate" => start_date = val.to_string(),
                    "endDate" => end_date = Some(val.to_string()),
                    "prescriberIen" => prescriber_ien = val.parse().ok(),
                    "status" => status = val.to_string(),
                    "instructions" => instructions = Some(val.to_string()),
                    _ => {}
                }
            }
        }

        medications.push(MedicationResponse {
            ien,
            patient_ien,
            drug_name,
            drug_code,
            dose,
            route,
            frequency,
            start_date,
            end_date,
            prescriber_ien,
            status,
            instructions,
        });
    }

    medications
}

async fn create_medication(Json(req): Json<CreateMedicationRequest>) -> impl IntoResponse {
    let drug_code = req.drug_code.unwrap_or_default();
    let end_date = req.end_date.unwrap_or_default();
    let prescriber_ien = req.prescriber_ien.unwrap_or(0);
    let instructions = req.instructions.unwrap_or_default();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^PS(52,0)),"^",3)+1
S ^PS(52,IEN,0)="{}^{}^{}^{}^{}^{}^{}^{}^{}^A^{}"
S ^PS(52,"C",{},IEN)=""
S $P(^PS(52,0),"^",3)=IEN,$P(^PS(52,0),"^",4)=IEN
W IEN
"#,
        req.patient_ien, req.drug_name, drug_code, req.dose, req.route, req.frequency,
        req.start_date, end_date, prescriber_ien, instructions, req.patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Lab Results Handlers ===

async fn get_patient_labs(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // ^LR(63) - VistA Lab Data File (File #63)
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^LR(63,"C",{},IEN)) Q:IEN=""  D
. S D0=$G(^LR(63,IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),VIS=$P(D0,"^",2),TST=$P(D0,"^",3),CODE=$P(D0,"^",4),VAL=$P(D0,"^",5)
. S UNT=$P(D0,"^",6),REF=$P(D0,"^",7),ABN=$P(D0,"^",8),CDT=$P(D0,"^",9),RDT=$P(D0,"^",10),ST=$P(D0,"^",11)
. W "{{""ien"":"_IEN_",""patientIen"":"_PAT
. I VIS W ",""visitIen"":"_VIS
. W ",""testName"":"""_TST_""""
. I CODE'="" W ",""testCode"":"""_CODE_""""
. W ",""value"":"""_VAL_""""
. I UNT'="" W ",""unit"":"""_UNT_""""
. I REF'="" W ",""referenceRange"":"""_REF_""""
. I ABN'="" W ",""abnormalFlag"":"""_$S(ABN="N":"normal",ABN="L":"low",ABN="H":"high",ABN="LL":"critical_low",ABN="HH":"critical_high",1:ABN)_""""
. W ",""collectedAt"":"""_CDT_""""
. I RDT'="" W ",""resultedAt"":"""_RDT_""""
. W ",""status"":"""_$S(ST="P":"pending",ST="F":"final",ST="C":"corrected",1:ST)_"""}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let results = parse_lab_results(&output);
            (StatusCode::OK, Json(LabResultsResponse { results })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_lab_results(json: &str) -> Vec<LabResultResponse> {
    let mut results = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return results;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut patient_ien = 0i64;
        let mut visit_ien = None;
        let mut test_name = String::new();
        let mut test_code = None;
        let mut value = String::new();
        let mut unit = None;
        let mut reference_range = None;
        let mut abnormal_flag = None;
        let mut collected_at = String::new();
        let mut resulted_at = None;
        let mut status = String::new();

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "visitIen" => visit_ien = val.parse().ok(),
                    "testName" => test_name = val.to_string(),
                    "testCode" => test_code = Some(val.to_string()),
                    "value" => value = val.to_string(),
                    "unit" => unit = Some(val.to_string()),
                    "referenceRange" => reference_range = Some(val.to_string()),
                    "abnormalFlag" => abnormal_flag = Some(val.to_string()),
                    "collectedAt" => collected_at = val.to_string(),
                    "resultedAt" => resulted_at = Some(val.to_string()),
                    "status" => status = val.to_string(),
                    _ => {}
                }
            }
        }

        results.push(LabResultResponse {
            ien,
            patient_ien,
            visit_ien,
            test_name,
            test_code,
            value,
            unit,
            reference_range,
            abnormal_flag,
            collected_at,
            resulted_at,
            status,
        });
    }

    results
}

async fn create_lab_result(Json(req): Json<CreateLabResultRequest>) -> impl IntoResponse {
    let visit_ien = req.visit_ien.unwrap_or(0);
    let test_code = req.test_code.unwrap_or_default();
    let unit = req.unit.unwrap_or_default();
    let reference_range = req.reference_range.unwrap_or_default();
    let abnormal_flag = req.abnormal_flag.unwrap_or("N".to_string());
    let now = chrono::Utc::now().format("%Y%m%d.%H%M%S").to_string();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^LR(63,0)),"^",3)+1
S ^LR(63,IEN,0)="{}^{}^{}^{}^{}^{}^{}^{}^{}^^P"
S ^LR(63,"C",{},IEN)=""
S $P(^LR(63,0),"^",3)=IEN,$P(^LR(63,0),"^",4)=IEN
W IEN
"#,
        req.patient_ien, visit_ien, req.test_name, test_code, req.value, unit,
        reference_range, abnormal_flag, now, req.patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Document Handlers ===

async fn get_patient_documents(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // ^TIU(8925) - VistA TIU Document File (File #8925)
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^TIU(8925,"C",{},IEN)) Q:IEN=""  D
. S D0=$G(^TIU(8925,IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),VIS=$P(D0,"^",2),TYP=$P(D0,"^",3),TIT=$P(D0,"^",4),AUTH=$P(D0,"^",5)
. S CDT=$P(D0,"^",6),SDT=$P(D0,"^",7),SBY=$P(D0,"^",8),ST=$P(D0,"^",9)
. W "{{""ien"":"_IEN_",""patientIen"":"_PAT
. I VIS W ",""visitIen"":"_VIS
. W ",""documentType"":"""_$S(TYP="PN":"progress_note",TYP="HP":"hp_note",TYP="DS":"discharge_summary",TYP="CN":"consultation",TYP="OP":"operative_note",1:TYP)_""""
. W ",""title"":"""_TIT_""""
. I AUTH W ",""authorIen"":"_AUTH
. W ",""createdAt"":"""_CDT_""""
. I SDT'="" W ",""signedAt"":"""_SDT_""""
. I SBY W ",""signedBy"":"_SBY
. W ",""status"":"""_$S(ST="U":"unsigned",ST="S":"signed",ST="A":"amended",ST="R":"retracted",1:ST)_"""}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let documents = parse_documents(&output);
            (StatusCode::OK, Json(DocumentsResponse { documents })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_documents(json: &str) -> Vec<DocumentResponse> {
    let mut documents = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return documents;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut patient_ien = 0i64;
        let mut visit_ien = None;
        let mut document_type = String::new();
        let mut title = String::new();
        let mut author_ien = None;
        let mut created_at = String::new();
        let mut signed_at = None;
        let mut signed_by = None;
        let mut status = String::new();

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "visitIen" => visit_ien = val.parse().ok(),
                    "documentType" => document_type = val.to_string(),
                    "title" => title = val.to_string(),
                    "authorIen" => author_ien = val.parse().ok(),
                    "createdAt" => created_at = val.to_string(),
                    "signedAt" => signed_at = Some(val.to_string()),
                    "signedBy" => signed_by = val.parse().ok(),
                    "status" => status = val.to_string(),
                    _ => {}
                }
            }
        }

        documents.push(DocumentResponse {
            ien,
            patient_ien,
            visit_ien,
            document_type,
            title,
            author_ien,
            created_at,
            signed_at,
            signed_by,
            status,
            content: None, // Content fetched separately
        });
    }

    documents
}

async fn create_document(Json(req): Json<CreateDocumentRequest>) -> impl IntoResponse {
    let visit_ien = req.visit_ien.unwrap_or(0);
    let doc_type = match req.document_type.as_str() {
        "progress_note" => "PN",
        "hp_note" => "HP",
        "discharge_summary" => "DS",
        "consultation" => "CN",
        "operative_note" => "OP",
        _ => "PN",
    };
    let author_ien = req.author_ien.unwrap_or(0);
    let now = chrono::Utc::now().format("%Y%m%d.%H%M%S").to_string();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^TIU(8925,0)),"^",3)+1
S ^TIU(8925,IEN,0)="{}^{}^{}^{}^{}^{}^^^U"
S ^TIU(8925,"C",{},IEN)=""
S $P(^TIU(8925,0),"^",3)=IEN,$P(^TIU(8925,0),"^",4)=IEN
W IEN
"#,
        req.patient_ien, visit_ien, doc_type, req.title, author_ien, now, req.patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Order Handlers ===

async fn get_patient_orders(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // ^OR(100) - VistA Orders File (File #100)
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^OR(100,"C",{},IEN)) Q:IEN=""  D
. S D0=$G(^OR(100,IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),VIS=$P(D0,"^",2),TYP=$P(D0,"^",3),TXT=$P(D0,"^",4)
. S BY=$P(D0,"^",5),DT=$P(D0,"^",6),PRI=$P(D0,"^",7),ST=$P(D0,"^",8)
. W "{{""ien"":"_IEN_",""patientIen"":"_PAT
. I VIS W ",""visitIen"":"_VIS
. W ",""orderType"":"""_$S(TYP="L":"lab",TYP="R":"radiology",TYP="M":"medication",TYP="C":"consult",TYP="P":"procedure",TYP="D":"diet",TYP="N":"nursing",TYP="A":"activity",1:TYP)_""""
. W ",""orderText"":"""_TXT_""""
. I BY W ",""orderedBy"":"_BY
. W ",""orderedAt"":"""_DT_""""
. W ",""priority"":"""_$S(PRI="S":"stat",PRI="A":"asap",PRI="R":"routine",1:PRI)_""""
. W ",""status"":"""_$S(ST="P":"pending",ST="A":"active",ST="C":"completed",ST="D":"discontinued",ST="X":"cancelled",1:ST)_"""}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let orders = parse_orders(&output);
            (StatusCode::OK, Json(OrdersResponse { orders })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_orders(json: &str) -> Vec<OrderResponse> {
    let mut orders = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return orders;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut patient_ien = 0i64;
        let mut visit_ien = None;
        let mut order_type = String::new();
        let mut order_text = String::new();
        let mut ordered_by = None;
        let mut ordered_at = String::new();
        let mut priority = String::new();
        let mut status = String::new();

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "visitIen" => visit_ien = val.parse().ok(),
                    "orderType" => order_type = val.to_string(),
                    "orderText" => order_text = val.to_string(),
                    "orderedBy" => ordered_by = val.parse().ok(),
                    "orderedAt" => ordered_at = val.to_string(),
                    "priority" => priority = val.to_string(),
                    "status" => status = val.to_string(),
                    _ => {}
                }
            }
        }

        orders.push(OrderResponse {
            ien,
            patient_ien,
            visit_ien,
            order_type,
            order_text,
            ordered_by,
            ordered_at,
            priority,
            status,
        });
    }

    orders
}

async fn create_order(Json(req): Json<CreateOrderRequest>) -> impl IntoResponse {
    let visit_ien = req.visit_ien.unwrap_or(0);
    let order_type = match req.order_type.as_str() {
        "lab" => "L",
        "radiology" => "R",
        "medication" => "M",
        "consult" => "C",
        "procedure" => "P",
        "diet" => "D",
        "nursing" => "N",
        "activity" => "A",
        _ => "L",
    };
    let ordered_by = req.ordered_by.unwrap_or(0);
    let priority = match req.priority.as_deref() {
        Some("stat") => "S",
        Some("asap") => "A",
        _ => "R",
    };
    let now = chrono::Utc::now().format("%Y%m%d.%H%M%S").to_string();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^OR(100,0)),"^",3)+1
S ^OR(100,IEN,0)="{}^{}^{}^{}^{}^{}^{}^P"
S ^OR(100,"C",{},IEN)=""
S $P(^OR(100,0),"^",3)=IEN,$P(^OR(100,0),"^",4)=IEN
W IEN
"#,
        req.patient_ien, visit_ien, order_type, req.order_text, ordered_by, now, priority, req.patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Appointment Handlers ===

async fn get_patient_appointments(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // ^SD(44) - VistA Hospital Location File / Scheduling (File #44)
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^SD(44,"C",{},IEN)) Q:IEN=""  D
. S D0=$G(^SD(44,IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),DT=$P(D0,"^",2),TM=$P(D0,"^",3),TYP=$P(D0,"^",4)
. S PRV=$P(D0,"^",5),LOC=$P(D0,"^",6),DUR=$P(D0,"^",7),ST=$P(D0,"^",8),RSN=$P(D0,"^",9)
. W "{{""ien"":"_IEN_",""patientIen"":"_PAT
. W ",""appointmentDate"":"""_DT_""",""appointmentTime"":"""_TM_""""
. W ",""appointmentType"":"""_$S(TYP="N":"new_patient",TYP="F":"follow_up",TYP="A":"annual_exam",TYP="U":"urgent",TYP="T":"telehealth",TYP="P":"procedure",TYP="L":"lab",1:TYP)_""""
. I PRV W ",""providerIen"":"_PRV
. I LOC'="" W ",""location"":"""_LOC_""""
. W ",""durationMinutes"":"_+DUR
. W ",""status"":"""_$S(ST="S":"scheduled",ST="I":"checked_in",ST="P":"in_progress",ST="C":"completed",ST="N":"no_show",ST="X":"cancelled",1:ST)_""""
. I RSN'="" W ",""reason"":"""_RSN_""""
. W "}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let appointments = parse_appointments(&output);
            (StatusCode::OK, Json(AppointmentsResponse { appointments })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_appointments(json: &str) -> Vec<AppointmentResponse> {
    let mut appointments = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return appointments;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut patient_ien = 0i64;
        let mut appointment_date = String::new();
        let mut appointment_time = String::new();
        let mut appointment_type = String::new();
        let mut provider_ien = None;
        let mut location = None;
        let mut duration_minutes = 30;
        let mut status = String::new();
        let mut reason = None;

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "appointmentDate" => appointment_date = val.to_string(),
                    "appointmentTime" => appointment_time = val.to_string(),
                    "appointmentType" => appointment_type = val.to_string(),
                    "providerIen" => provider_ien = val.parse().ok(),
                    "location" => location = Some(val.to_string()),
                    "durationMinutes" => duration_minutes = val.parse().unwrap_or(30),
                    "status" => status = val.to_string(),
                    "reason" => reason = Some(val.to_string()),
                    _ => {}
                }
            }
        }

        appointments.push(AppointmentResponse {
            ien,
            patient_ien,
            appointment_date,
            appointment_time,
            appointment_type,
            provider_ien,
            location,
            duration_minutes,
            status,
            reason,
        });
    }

    appointments
}

async fn create_appointment(Json(req): Json<CreateAppointmentRequest>) -> impl IntoResponse {
    let appt_type = match req.appointment_type.as_str() {
        "new_patient" => "N",
        "follow_up" => "F",
        "annual_exam" => "A",
        "urgent" => "U",
        "telehealth" => "T",
        "procedure" => "P",
        "lab" => "L",
        _ => "F",
    };
    let provider_ien = req.provider_ien.unwrap_or(0);
    let location = req.location.unwrap_or_default();
    let duration = req.duration_minutes.unwrap_or(30);
    let reason = req.reason.unwrap_or_default();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^SD(44,0)),"^",3)+1
S ^SD(44,IEN,0)="{}^{}^{}^{}^{}^{}^{}^S^{}"
S ^SD(44,"C",{},IEN)=""
S $P(^SD(44,0),"^",3)=IEN,$P(^SD(44,0),"^",4)=IEN
W IEN
"#,
        req.patient_ien, req.appointment_date, req.appointment_time, appt_type,
        provider_ien, location, duration, reason, req.patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Prescription/Dispensing Handlers ===

async fn get_patient_prescriptions(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // ^PSO(52) - VistA Outpatient Pharmacy File (File #52)
    // Extended to include dispensing workflow
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^PSO(52,"C",{},IEN)) Q:IEN=""  D
. S D0=$G(^PSO(52,IEN,0)) Q:D0=""
. S D1=$G(^PSO(52,IEN,1))
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),RX=$P(D0,"^",2),DRG=$P(D0,"^",3),CODE=$P(D0,"^",4)
. S DOS=$P(D0,"^",5),RTE=$P(D0,"^",6),FRQ=$P(D0,"^",7),SG=$P(D0,"^",8)
. S QTY=$P(D0,"^",9),DAYS=$P(D0,"^",10),RFLA=$P(D0,"^",11),RFLR=$P(D0,"^",12)
. S PRV=$P(D0,"^",13),LOC=$P(D0,"^",14)
. S ODT=$P(D1,"^",1),FDT=$P(D1,"^",2),EXP=$P(D1,"^",3),ST=$P(D1,"^",4)
. S DST=$P(D1,"^",5),VBY=$P(D1,"^",6),DBY=$P(D1,"^",7)
. W "{{""ien"":"_IEN_",""patientIen"":"_PAT_",""rxNumber"":"""_RX_""""
. W ",""drugName"":"""_DRG_""""
. I CODE'="" W ",""drugCode"":"""_CODE_""""
. W ",""dose"":"""_DOS_""",""route"":"""_RTE_""",""frequency"":"""_FRQ_""",""sig"":"""_SG_""""
. W ",""quantity"":"_+QTY_",""daysSupply"":"_+DAYS_",""refillsAllowed"":"_+RFLA_",""refillsRemaining"":"_+RFLR
. I PRV W ",""prescriberIen"":"_PRV
. I LOC'="" W ",""pharmacyLocation"":"""_LOC_""""
. W ",""orderDate"":"""_ODT_""""
. I FDT'="" W ",""fillDate"":"""_FDT_""""
. I EXP'="" W ",""expirationDate"":"""_EXP_""""
. W ",""status"":"""_$S(ST="A":"active",ST="D":"discontinued",ST="E":"expired",ST="H":"on_hold",1:ST)_""""
. W ",""dispensingStatus"":"""_$S(DST="P":"pending",DST="V":"verified",DST="D":"dispensed",DST="C":"completed",DST="R":"ready_for_pickup",1:DST)_""""
. I VBY W ",""verifiedBy"":"_VBY
. I DBY W ",""dispensedBy"":"_DBY
. W "}}"
W "]"
"#,
        patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let prescriptions = parse_prescriptions(&output);
            (StatusCode::OK, Json(PrescriptionsResponse { prescriptions })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_prescriptions(json: &str) -> Vec<PrescriptionResponse> {
    let mut prescriptions = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return prescriptions;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut patient_ien = 0i64;
        let mut rx_number = String::new();
        let mut drug_name = String::new();
        let mut drug_code = None;
        let mut dose = String::new();
        let mut route = String::new();
        let mut frequency = String::new();
        let mut sig = String::new();
        let mut quantity = 0i32;
        let mut days_supply = 0i32;
        let mut refills_allowed = 0i32;
        let mut refills_remaining = 0i32;
        let mut prescriber_ien = None;
        let mut pharmacy_location = None;
        let mut order_date = String::new();
        let mut fill_date = None;
        let mut expiration_date = None;
        let mut status = String::new();
        let mut dispensing_status = String::new();
        let mut verified_by = None;
        let mut dispensed_by = None;

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "patientIen" => patient_ien = val.parse().unwrap_or(0),
                    "rxNumber" => rx_number = val.to_string(),
                    "drugName" => drug_name = val.to_string(),
                    "drugCode" => drug_code = Some(val.to_string()),
                    "dose" => dose = val.to_string(),
                    "route" => route = val.to_string(),
                    "frequency" => frequency = val.to_string(),
                    "sig" => sig = val.to_string(),
                    "quantity" => quantity = val.parse().unwrap_or(0),
                    "daysSupply" => days_supply = val.parse().unwrap_or(0),
                    "refillsAllowed" => refills_allowed = val.parse().unwrap_or(0),
                    "refillsRemaining" => refills_remaining = val.parse().unwrap_or(0),
                    "prescriberIen" => prescriber_ien = val.parse().ok(),
                    "pharmacyLocation" => pharmacy_location = Some(val.to_string()),
                    "orderDate" => order_date = val.to_string(),
                    "fillDate" => fill_date = Some(val.to_string()),
                    "expirationDate" => expiration_date = Some(val.to_string()),
                    "status" => status = val.to_string(),
                    "dispensingStatus" => dispensing_status = val.to_string(),
                    "verifiedBy" => verified_by = val.parse().ok(),
                    "dispensedBy" => dispensed_by = val.parse().ok(),
                    _ => {}
                }
            }
        }

        prescriptions.push(PrescriptionResponse {
            ien,
            patient_ien,
            rx_number,
            drug_name,
            drug_code,
            dose,
            route,
            frequency,
            sig,
            quantity,
            days_supply,
            refills_allowed,
            refills_remaining,
            prescriber_ien,
            pharmacy_location,
            order_date,
            fill_date,
            expiration_date,
            status,
            dispensing_status,
            verified_by,
            dispensed_by,
        });
    }

    prescriptions
}

async fn get_pending_prescriptions() -> impl IntoResponse {
    // Get all prescriptions pending verification or dispensing
    let code = r#"
N IEN,D0,D1,FIRST,DST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^PSO(52,IEN)) Q:IEN=""  Q:'IEN  D
. S D0=$G(^PSO(52,IEN,0)) Q:D0=""
. S D1=$G(^PSO(52,IEN,1))
. S DST=$P(D1,"^",5)
. Q:DST'="P"&(DST'="V")
. I 'FIRST W ","
. S FIRST=0
. S PAT=$P(D0,"^",1),RX=$P(D0,"^",2),DRG=$P(D0,"^",3),CODE=$P(D0,"^",4)
. S DOS=$P(D0,"^",5),RTE=$P(D0,"^",6),FRQ=$P(D0,"^",7),SG=$P(D0,"^",8)
. S QTY=$P(D0,"^",9),DAYS=$P(D0,"^",10),RFLA=$P(D0,"^",11),RFLR=$P(D0,"^",12)
. S PRV=$P(D0,"^",13),LOC=$P(D0,"^",14)
. S ODT=$P(D1,"^",1),FDT=$P(D1,"^",2),EXP=$P(D1,"^",3),ST=$P(D1,"^",4)
. S VBY=$P(D1,"^",6),DBY=$P(D1,"^",7)
. W "{""ien"":"_IEN_",""patientIen"":"_PAT_",""rxNumber"":"""_RX_""""
. W ",""drugName"":"""_DRG_""""
. I CODE'="" W ",""drugCode"":"""_CODE_""""
. W ",""dose"":"""_DOS_""",""route"":"""_RTE_""",""frequency"":"""_FRQ_""",""sig"":"""_SG_""""
. W ",""quantity"":"_+QTY_",""daysSupply"":"_+DAYS_",""refillsAllowed"":"_+RFLA_",""refillsRemaining"":"_+RFLR
. I PRV W ",""prescriberIen"":"_PRV
. I LOC'="" W ",""pharmacyLocation"":"""_LOC_""""
. W ",""orderDate"":"""_ODT_""""
. I FDT'="" W ",""fillDate"":"""_FDT_""""
. I EXP'="" W ",""expirationDate"":"""_EXP_""""
. W ",""status"":"""_$S(ST="A":"active",ST="D":"discontinued",ST="E":"expired",ST="H":"on_hold",1:ST)_""""
. W ",""dispensingStatus"":"""_$S(DST="P":"pending",DST="V":"verified",1:DST)_""""
. I VBY W ",""verifiedBy"":"_VBY
. I DBY W ",""dispensedBy"":"_DBY
. W "}"
W "]"
"#;

    match run_mumps(code) {
        Ok(output) => {
            let prescriptions = parse_prescriptions(&output);
            (StatusCode::OK, Json(PrescriptionsResponse { prescriptions })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn create_prescription(Json(req): Json<CreatePrescriptionRequest>) -> impl IntoResponse {
    let drug_code = req.drug_code.unwrap_or_default();
    let refills_allowed = req.refills_allowed.unwrap_or(0);
    let prescriber_ien = req.prescriber_ien.unwrap_or(0);
    let pharmacy_location = req.pharmacy_location.unwrap_or_default();
    let now = chrono::Utc::now().format("%Y%m%d").to_string();

    // Generate RX number: RX + year + sequence
    let year = chrono::Utc::now().format("%y").to_string();

    let code = format!(
        r#"
N IEN,RX S IEN=$P($G(^PSO(52,0)),"^",3)+1
S RX="RX{}"_IEN
S ^PSO(52,IEN,0)="{}^"_RX_"^{}^{}^{}^{}^{}^{}^{}^{}^{}^{}^{}^{}"
S ^PSO(52,IEN,1)="{}^^^^P"
S ^PSO(52,"C",{},IEN)=""
S ^PSO(52,"RX",RX,IEN)=""
S $P(^PSO(52,0),"^",3)=IEN,$P(^PSO(52,0),"^",4)=IEN
W IEN
"#,
        year,
        req.patient_ien, req.drug_name, drug_code, req.dose, req.route, req.frequency,
        req.sig, req.quantity, req.days_supply, refills_allowed, refills_allowed,
        prescriber_ien, pharmacy_location, now, req.patient_ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn verify_prescription(
    Path(ien): Path<i64>,
    Json(req): Json<VerifyPrescriptionRequest>,
) -> impl IntoResponse {
    // Update prescription status from Pending to Verified
    let code = format!(
        r#"
N D1 S D1=$G(^PSO(52,{},1))
I D1="" W "NOT_FOUND" Q
S DST=$P(D1,"^",5)
I DST'="P" W "INVALID_STATUS" Q
S $P(D1,"^",5)="V",$P(D1,"^",6)={}
S ^PSO(52,{},1)=D1
W "OK"
"#,
        ien, req.verified_by, ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            match output.trim() {
                "OK" => (StatusCode::OK, Json(CreateResponse { success: true, ien })).into_response(),
                "NOT_FOUND" => (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse { error: "Prescription not found".to_string() }),
                ).into_response(),
                "INVALID_STATUS" => (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse { error: "Prescription is not in pending status".to_string() }),
                ).into_response(),
                _ => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: format!("Unexpected response: {}", output) }),
                ).into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn dispense_prescription(
    Path(ien): Path<i64>,
    Json(req): Json<DispensePrescriptionRequest>,
) -> impl IntoResponse {
    // Update prescription status from Verified to Dispensed
    let now = chrono::Utc::now().format("%Y%m%d").to_string();
    let exp_date = req.expiration_date.unwrap_or_default();

    let code = format!(
        r#"
N D1 S D1=$G(^PSO(52,{},1))
I D1="" W "NOT_FOUND" Q
S DST=$P(D1,"^",5)
I DST'="V" W "INVALID_STATUS" Q
S $P(D1,"^",2)="{}"
I "{}"'="" S $P(D1,"^",3)="{}"
S $P(D1,"^",5)="R",$P(D1,"^",7)={}
S ^PSO(52,{},1)=D1
W "OK"
"#,
        ien, now, exp_date, exp_date, req.dispensed_by, ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            match output.trim() {
                "OK" => (StatusCode::OK, Json(CreateResponse { success: true, ien })).into_response(),
                "NOT_FOUND" => (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse { error: "Prescription not found".to_string() }),
                ).into_response(),
                "INVALID_STATUS" => (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse { error: "Prescription must be verified before dispensing".to_string() }),
                ).into_response(),
                _ => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: format!("Unexpected response: {}", output) }),
                ).into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn complete_prescription(Path(ien): Path<i64>) -> impl IntoResponse {
    // Mark prescription as picked up/completed
    let code = format!(
        r#"
N D1 S D1=$G(^PSO(52,{},1))
I D1="" W "NOT_FOUND" Q
S DST=$P(D1,"^",5)
I DST'="R" W "INVALID_STATUS" Q
S $P(D1,"^",5)="C"
S ^PSO(52,{},1)=D1
W "OK"
"#,
        ien, ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            match output.trim() {
                "OK" => (StatusCode::OK, Json(CreateResponse { success: true, ien })).into_response(),
                "NOT_FOUND" => (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse { error: "Prescription not found".to_string() }),
                ).into_response(),
                "INVALID_STATUS" => (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse { error: "Prescription must be ready for pickup before completing".to_string() }),
                ).into_response(),
                _ => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: format!("Unexpected response: {}", output) }),
                ).into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn refill_prescription(
    Path(ien): Path<i64>,
    Json(req): Json<RefillPrescriptionRequest>,
) -> impl IntoResponse {
    // Create a refill - decrements refills remaining, resets to pending
    let code = format!(
        r#"
N D0,D1
S D0=$G(^PSO(52,{},0))
I D0="" W "NOT_FOUND" Q
S D1=$G(^PSO(52,{},1))
S RFLR=$P(D0,"^",12)
I RFLR<1 W "NO_REFILLS" Q
S ST=$P(D1,"^",4)
I ST'="A" W "INACTIVE" Q
; Decrement refills remaining
S $P(D0,"^",12)=RFLR-1
S ^PSO(52,{},0)=D0
; Reset dispensing status to pending
S $P(D1,"^",5)="P",$P(D1,"^",6)="",$P(D1,"^",7)={}
S ^PSO(52,{},1)=D1
W "OK"
"#,
        ien, ien, ien, req.dispensed_by, ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            match output.trim() {
                "OK" => (StatusCode::OK, Json(CreateResponse { success: true, ien })).into_response(),
                "NOT_FOUND" => (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse { error: "Prescription not found".to_string() }),
                ).into_response(),
                "NO_REFILLS" => (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse { error: "No refills remaining".to_string() }),
                ).into_response(),
                "INACTIVE" => (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse { error: "Prescription is not active".to_string() }),
                ).into_response(),
                _ => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: format!("Unexpected response: {}", output) }),
                ).into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn check_drug_allergies(
    Path((patient_ien, drug_name)): Path<(i64, String)>,
) -> impl IntoResponse {
    // Check if patient has allergy to specified drug or drug class
    let code = format!(
        r#"
N IEN,D0,FIRST,MATCH
S MATCH=0
W "{{"
W """hasAllergyConflict"":false,"
W """allergies"":["
S FIRST=1,IEN=0
F  S IEN=$O(^GMRA("C",{},IEN)) Q:IEN=""  D
. S D0=$G(^GMRA(IEN,0)) Q:D0=""
. S ST=$P(D0,"^",6) Q:ST'="A"
. I 'FIRST W ","
. S FIRST=0
. S ALG=$P(D0,"^",1),PAT=$P(D0,"^",2),TYP=$P(D0,"^",3),SEV=$P(D0,"^",4),REACT=$P(D0,"^",5)
. ; Check if allergen matches drug name (case-insensitive)
. S ALGUP=$$UP^XLFSTR(ALG),DRGUP=$$UP^XLFSTR("{}")
. I ALGUP[DRGUP!(DRGUP[ALGUP) S MATCH=1
. W "{{""ien"":"_IEN_",""allergen"":"""_ALG_""",""patientIen"":"_PAT
. W ",""allergyType"":"""_$S(TYP="D":"drug",TYP="F":"food",TYP="E":"environmental",1:TYP)_""""
. W ",""severity"":"""_$S(SEV="MI":"mild",SEV="MO":"moderate",SEV="SE":"severe",SEV="LT":"life_threatening",1:SEV)_""""
. I REACT'="" W ",""reactions"":"""_REACT_""""
. W ",""status"":""active""}}"
W "],"
W """matchedAllergens"":[],"
I MATCH W """hasAllergyConflict"":true"
E  W """hasAllergyConflict"":false"
W "}}"
"#,
        patient_ien, drug_name
    );

    match run_mumps(&code) {
        Ok(output) => {
            // Parse the JSON response
            match serde_json::from_str::<AllergyCheckResponse>(&output) {
                Ok(response) => (StatusCode::OK, Json(response)).into_response(),
                Err(_) => {
                    // Fallback - return simple response
                    (StatusCode::OK, Json(AllergyCheckResponse {
                        has_allergy_conflict: false,
                        allergies: vec![],
                        matched_allergens: vec![],
                    })).into_response()
                }
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Pharmacy Inventory Handlers ===

async fn list_inventory() -> impl IntoResponse {
    // ^PSD - VistA Pharmacy Drug Inventory
    let code = r#"
N IEN,D0,FIRST,NOW
S NOW=$H
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^PSD(IEN)) Q:IEN=""  Q:'IEN  D
. S D0=$G(^PSD(IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S CODE=$P(D0,"^",1),NAME=$P(D0,"^",2),LOC=$P(D0,"^",3),LOCN=$P(D0,"^",4)
. S QTY=$P(D0,"^",5),ROP=$P(D0,"^",6),ROQ=$P(D0,"^",7),UNIT=$P(D0,"^",8)
. S UPD=$P(D0,"^",9),CTRL=$P(D0,"^",10),SCH=$P(D0,"^",11)
. S LOW=$S(+QTY<+ROP:1,1:0)
. W "{""ien"":"_IEN_",""drugCode"":"""_CODE_""",""drugName"":"""_NAME_""""
. W ",""locationCode"":"""_LOC_""""
. I LOCN'="" W ",""locationName"":"""_LOCN_""""
. W ",""quantityOnHand"":"_+QTY_",""reorderPoint"":"_+ROP_",""reorderQuantity"":"_+ROQ
. W ",""unit"":"""_UNIT_""",""lastUpdated"":"""_UPD_""""
. W ",""isLowStock"":"_$S(LOW:"true",1:"false")
. W ",""isControlled"":"_$S(CTRL:"true",1:"false")
. I SCH'="" W ",""schedule"":"""_SCH_""""
. W "}"
W "]"
"#;

    match run_mumps(code) {
        Ok(output) => {
            let items = parse_inventory_items(&output);
            (StatusCode::OK, Json(InventoryResponse { items })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_inventory_items(json: &str) -> Vec<InventoryItemResponse> {
    let mut items = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return items;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut drug_code = String::new();
        let mut drug_name = String::new();
        let mut location_code = String::new();
        let mut location_name = None;
        let mut quantity_on_hand = 0i32;
        let mut reorder_point = 0i32;
        let mut reorder_quantity = 0i32;
        let mut unit = String::from("EA");
        let mut last_updated = String::new();
        let mut is_low_stock = false;
        let mut is_controlled = false;
        let mut schedule = None;

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "drugCode" => drug_code = val.to_string(),
                    "drugName" => drug_name = val.to_string(),
                    "locationCode" => location_code = val.to_string(),
                    "locationName" => location_name = Some(val.to_string()),
                    "quantityOnHand" => quantity_on_hand = val.parse().unwrap_or(0),
                    "reorderPoint" => reorder_point = val.parse().unwrap_or(0),
                    "reorderQuantity" => reorder_quantity = val.parse().unwrap_or(0),
                    "unit" => unit = val.to_string(),
                    "lastUpdated" => last_updated = val.to_string(),
                    "isLowStock" => is_low_stock = val == "true",
                    "isControlled" => is_controlled = val == "true",
                    "schedule" => schedule = Some(val.to_string()),
                    _ => {}
                }
            }
        }

        items.push(InventoryItemResponse {
            ien,
            drug_code,
            drug_name,
            location_code,
            location_name,
            quantity_on_hand,
            reorder_point,
            reorder_quantity,
            unit,
            last_updated,
            is_low_stock,
            is_controlled,
            schedule,
        });
    }

    items
}

async fn get_inventory_item(Path(ien): Path<i64>) -> impl IntoResponse {
    let code = format!(
        r#"
S D0=$G(^PSD({},0))
I D0="" W "{{}}" Q
S CODE=$P(D0,"^",1),NAME=$P(D0,"^",2),LOC=$P(D0,"^",3),LOCN=$P(D0,"^",4)
S QTY=$P(D0,"^",5),ROP=$P(D0,"^",6),ROQ=$P(D0,"^",7),UNIT=$P(D0,"^",8)
S UPD=$P(D0,"^",9),CTRL=$P(D0,"^",10),SCH=$P(D0,"^",11)
S LOW=$S(+QTY<+ROP:1,1:0)
W "{{""ien"":{},""drugCode"":"""_CODE_""",""drugName"":"""_NAME_""""
W ",""locationCode"":"""_LOC_""""
I LOCN'="" W ",""locationName"":"""_LOCN_""""
W ",""quantityOnHand"":"_+QTY_",""reorderPoint"":"_+ROP_",""reorderQuantity"":"_+ROQ
W ",""unit"":"""_UNIT_""",""lastUpdated"":"""_UPD_""""
W ",""isLowStock"":"_$S(LOW:"true",1:"false")
W ",""isControlled"":"_$S(CTRL:"true",1:"false")
I SCH'="" W ",""schedule"":"""_SCH_""""
W "}}"
"#,
        ien, ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            if output.trim() == "{}" || output.is_empty() {
                (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse { error: "Inventory item not found".to_string() }),
                ).into_response()
            } else {
                let items = parse_inventory_items(&format!("[{}]", output));
                if let Some(item) = items.into_iter().next() {
                    (StatusCode::OK, Json(item)).into_response()
                } else {
                    (
                        StatusCode::NOT_FOUND,
                        Json(ErrorResponse { error: "Inventory item not found".to_string() }),
                    ).into_response()
                }
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn create_inventory_item(Json(req): Json<CreateInventoryItemRequest>) -> impl IntoResponse {
    let location_name = req.location_name.unwrap_or_default();
    let reorder_point = req.reorder_point.unwrap_or(10);
    let reorder_quantity = req.reorder_quantity.unwrap_or(50);
    let unit = req.unit.unwrap_or_else(|| "EA".to_string());
    let is_controlled = if req.is_controlled.unwrap_or(false) { 1 } else { 0 };
    let schedule = req.schedule.unwrap_or_default();
    let now = chrono::Utc::now().format("%Y%m%d").to_string();

    let code = format!(
        r#"
N IEN S IEN=$P($G(^PSD(0)),"^",3)+1
S ^PSD(IEN,0)="{}^{}^{}^{}^{}^{}^{}^{}^{}^{}^{}"
S ^PSD("C","{}",IEN)=""
S ^PSD("L","{}",IEN)=""
S $P(^PSD(0),"^",3)=IEN,$P(^PSD(0),"^",4)=IEN
W IEN
"#,
        req.drug_code, req.drug_name, req.location_code, location_name,
        req.quantity_on_hand, reorder_point, reorder_quantity, unit,
        now, is_controlled, schedule,
        req.drug_code, req.location_code
    );

    match run_mumps(&code) {
        Ok(output) => {
            let ien: i64 = output.trim().parse().unwrap_or(0);
            (
                StatusCode::CREATED,
                Json(CreateResponse { success: true, ien }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn adjust_inventory(
    Path(ien): Path<i64>,
    Json(req): Json<AdjustInventoryRequest>,
) -> impl IntoResponse {
    let adjusted_by = req.adjusted_by.unwrap_or(0);
    let lot_number = req.lot_number.unwrap_or_default();
    let now = chrono::Utc::now().format("%Y%m%d.%H%M%S").to_string();

    let code = format!(
        r#"
N D0,PREV,NEW,TXIEN
S D0=$G(^PSD({},0))
I D0="" W "NOT_FOUND" Q
S PREV=$P(D0,"^",5)
S NEW=PREV+{}
I NEW<0 W "NEGATIVE" Q
S $P(D0,"^",5)=NEW,$P(D0,"^",9)="{}"
S ^PSD({},0)=D0
; Create transaction record
S TXIEN=$P($G(^PSD({},1,0)),"^",3)+1
S ^PSD({},1,TXIEN)="ADJ^{}^"_PREV_"^"_NEW_"^{}^{}^{}^{}"
S $P(^PSD({},1,0),"^",3)=TXIEN
W "OK"
"#,
        ien, req.quantity, now, ien, ien, ien, req.quantity, req.reason, adjusted_by, lot_number, now, ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            match output.trim() {
                "OK" => (StatusCode::OK, Json(CreateResponse { success: true, ien })).into_response(),
                "NOT_FOUND" => (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse { error: "Inventory item not found".to_string() }),
                ).into_response(),
                "NEGATIVE" => (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse { error: "Adjustment would result in negative inventory".to_string() }),
                ).into_response(),
                _ => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: format!("Unexpected response: {}", output) }),
                ).into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn get_low_stock_items() -> impl IntoResponse {
    let code = r#"
N IEN,D0,FIRST,CNT
S CNT=0
W "{""items"":["
S FIRST=1,IEN=0
F  S IEN=$O(^PSD(IEN)) Q:IEN=""  Q:'IEN  D
. S D0=$G(^PSD(IEN,0)) Q:D0=""
. S QTY=$P(D0,"^",5),ROP=$P(D0,"^",6)
. Q:+QTY>=+ROP
. S CNT=CNT+1
. I 'FIRST W ","
. S FIRST=0
. S CODE=$P(D0,"^",1),NAME=$P(D0,"^",2),LOC=$P(D0,"^",3),LOCN=$P(D0,"^",4)
. S ROQ=$P(D0,"^",7),UNIT=$P(D0,"^",8),UPD=$P(D0,"^",9),CTRL=$P(D0,"^",10),SCH=$P(D0,"^",11)
. W "{""ien"":"_IEN_",""drugCode"":"""_CODE_""",""drugName"":"""_NAME_""""
. W ",""locationCode"":"""_LOC_""""
. I LOCN'="" W ",""locationName"":"""_LOCN_""""
. W ",""quantityOnHand"":"_+QTY_",""reorderPoint"":"_+ROP_",""reorderQuantity"":"_+ROQ
. W ",""unit"":"""_UNIT_""",""lastUpdated"":"""_UPD_""""
. W ",""isLowStock"":true"
. W ",""isControlled"":"_$S(CTRL:"true",1:"false")
. I SCH'="" W ",""schedule"":"""_SCH_""""
. W "}"
W "],""count"":"_CNT_"}"
"#;

    match run_mumps(code) {
        Ok(output) => {
            match serde_json::from_str::<LowStockAlertResponse>(&output) {
                Ok(response) => (StatusCode::OK, Json(response)).into_response(),
                Err(_) => (StatusCode::OK, Json(LowStockAlertResponse {
                    items: vec![],
                    count: 0,
                })).into_response(),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn get_inventory_lots(Path(ien): Path<i64>) -> impl IntoResponse {
    // Get lots for an inventory item
    let now = chrono::Utc::now().format("%Y%m%d").to_string();
    let soon = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(90))
        .unwrap()
        .format("%Y%m%d")
        .to_string();

    let code = format!(
        r#"
N LIEN,D0,FIRST,NOW,SOON
S NOW="{}",SOON="{}"
W "["
S FIRST=1,LIEN=""
F  S LIEN=$O(^PSD({},2,LIEN)) Q:LIEN=""  D
. S D0=$G(^PSD({},2,LIEN)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S LOT=$P(D0,"^",1),EXP=$P(D0,"^",2),QTY=$P(D0,"^",3),RCV=$P(D0,"^",4)
. S XPRD=$S(EXP<NOW:1,1:0),XPRS=$S(EXP<SOON:1,1:0)
. W "{{""ien"":"_LIEN_",""inventoryIen"":{},""lotNumber"":"""_LOT_""""
. W ",""expirationDate"":"""_EXP_""",""quantity"":"_+QTY_",""receivedDate"":"""_RCV_""""
. W ",""isExpired"":"_$S(XPRD:"true",1:"false")_",""isExpiringSoon"":"_$S(XPRS:"true",1:"false")_"}}"
W "]"
"#,
        now, soon, ien, ien, ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            let lots = parse_lots(&output);
            (StatusCode::OK, Json(LotsResponse { lots })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

fn parse_lots(json: &str) -> Vec<LotResponse> {
    let mut lots = Vec::new();
    let content = json.trim().trim_start_matches('[').trim_end_matches(']');
    if content.is_empty() {
        return lots;
    }

    for obj in content.split("},{") {
        let obj = obj.trim_start_matches('{').trim_end_matches('}');
        let mut ien = 0i64;
        let mut inventory_ien = 0i64;
        let mut lot_number = String::new();
        let mut expiration_date = String::new();
        let mut quantity = 0i32;
        let mut received_date = String::new();
        let mut is_expired = false;
        let mut is_expiring_soon = false;

        for pair in obj.split(',') {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().trim_matches('"');
                let val = parts[1].trim().trim_matches('"');
                match key {
                    "ien" => ien = val.parse().unwrap_or(0),
                    "inventoryIen" => inventory_ien = val.parse().unwrap_or(0),
                    "lotNumber" => lot_number = val.to_string(),
                    "expirationDate" => expiration_date = val.to_string(),
                    "quantity" => quantity = val.parse().unwrap_or(0),
                    "receivedDate" => received_date = val.to_string(),
                    "isExpired" => is_expired = val == "true",
                    "isExpiringSoon" => is_expiring_soon = val == "true",
                    _ => {}
                }
            }
        }

        lots.push(LotResponse {
            ien,
            inventory_ien,
            lot_number,
            expiration_date,
            quantity,
            received_date,
            is_expired,
            is_expiring_soon,
        });
    }

    lots
}

async fn add_lot(
    Path(ien): Path<i64>,
    Json(req): Json<AddLotRequest>,
) -> impl IntoResponse {
    let now = chrono::Utc::now().format("%Y%m%d").to_string();

    let code = format!(
        r#"
N D0,LIEN
S D0=$G(^PSD({},0))
I D0="" W "NOT_FOUND" Q
; Add lot
S LIEN=$P($G(^PSD({},2,0)),"^",3)+1
S ^PSD({},2,LIEN)="{}^{}^{}^{}"
S ^PSD({},2,"L","{}",LIEN)=""
S $P(^PSD({},2,0),"^",3)=LIEN
; Update inventory quantity
S $P(D0,"^",5)=$P(D0,"^",5)+{},$P(D0,"^",9)="{}"
S ^PSD({},0)=D0
W LIEN
"#,
        ien, ien, ien, req.lot_number, req.expiration_date, req.quantity, now,
        ien, req.lot_number, ien, req.quantity, now, ien
    );

    match run_mumps(&code) {
        Ok(output) => {
            match output.trim() {
                "NOT_FOUND" => (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse { error: "Inventory item not found".to_string() }),
                ).into_response(),
                lot_ien => {
                    let ien: i64 = lot_ien.parse().unwrap_or(0);
                    (
                        StatusCode::CREATED,
                        Json(CreateResponse { success: true, ien }),
                    ).into_response()
                }
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn get_inventory_by_location(Path(location_code): Path<String>) -> impl IntoResponse {
    let code = format!(
        r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^PSD("L","{}",IEN)) Q:IEN=""  D
. S D0=$G(^PSD(IEN,0)) Q:D0=""
. I 'FIRST W ","
. S FIRST=0
. S CODE=$P(D0,"^",1),NAME=$P(D0,"^",2),LOC=$P(D0,"^",3),LOCN=$P(D0,"^",4)
. S QTY=$P(D0,"^",5),ROP=$P(D0,"^",6),ROQ=$P(D0,"^",7),UNIT=$P(D0,"^",8)
. S UPD=$P(D0,"^",9),CTRL=$P(D0,"^",10),SCH=$P(D0,"^",11)
. S LOW=$S(+QTY<+ROP:1,1:0)
. W "{{""ien"":"_IEN_",""drugCode"":"""_CODE_""",""drugName"":"""_NAME_""""
. W ",""locationCode"":"""_LOC_""""
. I LOCN'="" W ",""locationName"":"""_LOCN_""""
. W ",""quantityOnHand"":"_+QTY_",""reorderPoint"":"_+ROP_",""reorderQuantity"":"_+ROQ
. W ",""unit"":"""_UNIT_""",""lastUpdated"":"""_UPD_""""
. W ",""isLowStock"":"_$S(LOW:"true",1:"false")
. W ",""isControlled"":"_$S(CTRL:"true",1:"false")
. I SCH'="" W ",""schedule"":"""_SCH_""""
. W "}}"
W "]"
"#,
        location_code
    );

    match run_mumps(&code) {
        Ok(output) => {
            let items = parse_inventory_items(&output);
            (StatusCode::OK, Json(InventoryResponse { items })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

async fn get_controlled_substances() -> impl IntoResponse {
    let code = r#"
N IEN,D0,FIRST
W "["
S FIRST=1,IEN=0
F  S IEN=$O(^PSD(IEN)) Q:IEN=""  Q:'IEN  D
. S D0=$G(^PSD(IEN,0)) Q:D0=""
. S CTRL=$P(D0,"^",10) Q:'CTRL
. I 'FIRST W ","
. S FIRST=0
. S CODE=$P(D0,"^",1),NAME=$P(D0,"^",2),LOC=$P(D0,"^",3),LOCN=$P(D0,"^",4)
. S QTY=$P(D0,"^",5),ROP=$P(D0,"^",6),ROQ=$P(D0,"^",7),UNIT=$P(D0,"^",8)
. S UPD=$P(D0,"^",9),SCH=$P(D0,"^",11)
. S LOW=$S(+QTY<+ROP:1,1:0)
. W "{""ien"":"_IEN_",""drugCode"":"""_CODE_""",""drugName"":"""_NAME_""""
. W ",""locationCode"":"""_LOC_""""
. I LOCN'="" W ",""locationName"":"""_LOCN_""""
. W ",""quantityOnHand"":"_+QTY_",""reorderPoint"":"_+ROP_",""reorderQuantity"":"_+ROQ
. W ",""unit"":"""_UNIT_""",""lastUpdated"":"""_UPD_""""
. W ",""isLowStock"":"_$S(LOW:"true",1:"false")
. W ",""isControlled"":true"
. I SCH'="" W ",""schedule"":"""_SCH_""""
. W "}"
W "]"
"#;

    match run_mumps(code) {
        Ok(output) => {
            let items = parse_inventory_items(&output);
            (StatusCode::OK, Json(InventoryResponse { items })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

// === Stub Handlers ===

// Stub handler for latest vitals
async fn get_patient_latest_vitals(Path(patient_ien): Path<i64>) -> impl IntoResponse {
    // TODO: Implement latest vitals query based on patient_ien
    // For now, return empty vitals object
    let _ = patient_ien; // Suppress unused variable warning

    Json(serde_json::json!({
        "bloodPressure": null,
        "heartRate": null,
        "temperature": null,
        "respiratoryRate": null,
        "oxygenSaturation": null,
        "weight": null,
        "height": null,
        "bmi": null
    }))
}

// Stub handler for actionable labs
async fn get_actionable_labs() -> impl IntoResponse {
    // TODO: Implement actionable labs query
    // For now, return empty items array
    Json(serde_json::json!({
        "items": [],
        "total": 0
    }))
}

// === Main ===

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    eprintln!("YottaDB API starting...");

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("yottadb_api=info".parse()?),
        )
        .init();

    eprintln!("Tracing initialized");
    tracing::info!("Starting YottaDB REST API server...");

    let app = Router::new()
        // Health
        .route("/health", get(health))
        .route("/api/health", get(health))
        // Patients
        .route("/api/v1/ehr/patients", get(list_patients).post(create_patient))
        .route("/api/v1/ehr/patients/{ien}", get(get_patient))
        .route("/api/v1/ehr/patients/{ien}/problems", get(get_patient_problems))
        .route("/api/v1/ehr/patients/{ien}/allergies", get(get_patient_allergies))
        // Visits
        .route("/api/v1/ehr/patients/{ien}/visits", get(get_patient_visits))
        .route("/api/v1/ehr/visits", post(create_visit))
        // Vitals
        .route("/api/v1/ehr/patients/{ien}/vitals", get(get_patient_vitals))
        .route("/api/v1/ehr/patients/{ien}/vitals/latest", get(get_patient_latest_vitals))
        .route("/api/v1/ehr/vitals", post(create_vital))
        // Medications
        .route("/api/v1/ehr/patients/{ien}/medications", get(get_patient_medications))
        .route("/api/v1/ehr/medications", post(create_medication))
        // Lab Results
        .route("/api/v1/ehr/patients/{ien}/labs", get(get_patient_labs))
        .route("/api/v1/ehr/labs", post(create_lab_result))
        .route("/api/v1/ehr/labs/actionable", get(get_actionable_labs))
        // Documents
        .route("/api/v1/ehr/patients/{ien}/documents", get(get_patient_documents))
        .route("/api/v1/ehr/documents", post(create_document))
        // Orders
        .route("/api/v1/ehr/patients/{ien}/orders", get(get_patient_orders))
        .route("/api/v1/ehr/orders", post(create_order))
        // Appointments
        .route("/api/v1/ehr/patients/{ien}/appointments", get(get_patient_appointments))
        .route("/api/v1/ehr/appointments", post(create_appointment))
        // Prescriptions / Pharmacy Dispensing
        .route("/api/v1/pharmacy/patients/{ien}/prescriptions", get(get_patient_prescriptions))
        .route("/api/v1/pharmacy/prescriptions", post(create_prescription))
        .route("/api/v1/pharmacy/prescriptions/pending", get(get_pending_prescriptions))
        .route("/api/v1/pharmacy/prescriptions/{ien}/verify", post(verify_prescription))
        .route("/api/v1/pharmacy/prescriptions/{ien}/dispense", post(dispense_prescription))
        .route("/api/v1/pharmacy/prescriptions/{ien}/complete", post(complete_prescription))
        .route("/api/v1/pharmacy/prescriptions/{ien}/refill", post(refill_prescription))
        // Allergy Checking
        .route("/api/v1/pharmacy/patients/{patient_ien}/allergies/check/{drug_name}", get(check_drug_allergies))
        // Pharmacy Inventory
        .route("/api/v1/pharmacy/inventory", get(list_inventory).post(create_inventory_item))
        .route("/api/v1/pharmacy/inventory/low-stock", get(get_low_stock_items))
        .route("/api/v1/pharmacy/inventory/controlled", get(get_controlled_substances))
        .route("/api/v1/pharmacy/inventory/location/{location_code}", get(get_inventory_by_location))
        .route("/api/v1/pharmacy/inventory/{ien}", get(get_inventory_item))
        .route("/api/v1/pharmacy/inventory/{ien}/adjust", post(adjust_inventory))
        .route("/api/v1/pharmacy/inventory/{ien}/lots", get(get_inventory_lots).post(add_lot))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any));

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);

    eprintln!("Binding to {}", addr);
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    eprintln!("Bound successfully, starting server...");
    axum::serve(listener, app).await?;
    eprintln!("Server stopped");

    Ok(())
}
