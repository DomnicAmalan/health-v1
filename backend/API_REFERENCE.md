# Health V1 API Reference

Complete API documentation for the Health V1 healthcare system.

**Base URL**: `http://localhost:8080`
**API Version**: v1
**Authentication**: Bearer token in `Authorization` header

---

## Table of Contents

1. [Authentication](#authentication)
2. [Patients](#patients)
3. [Appointments](#appointments)
4. [Clinical Encounters](#clinical-encounters)
5. [Clinical Notes](#clinical-notes)
6. [Vital Signs](#vital-signs)
7. [Problem List](#problem-list)
8. [Lab Orders](#lab-orders)
9. [Imaging Orders](#imaging-orders)
10. [Pharmacy](#pharmacy)
11. [Billing](#billing)

---

## Authentication

### Login
```http
POST /v1/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response 200**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "string",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "roles": ["role1", "role2"]
  }
}
```

### Logout
```http
POST /v1/auth/logout
Authorization: Bearer <token>
```

**Response 204**: No content

---

## Patients

### List Patients
```http
GET /v1/ehr/patients?limit=50&offset=0
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` (integer, default: 50, max: 1000): Number of records
- `offset` (integer, default: 0): Pagination offset
- `search` (string): Search by name, MRN
- `status` (string): Filter by status

**Response 200**:
```json
{
  "patients": [
    {
      "id": "uuid",
      "mrn": "MRN001",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1980-01-01",
      "gender": "male",
      "phone": "+1234567890",
      "email": "john.doe@example.com",
      "status": "active"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### Get Patient
```http
GET /v1/ehr/patients/:id
Authorization: Bearer <token>
```

**Response 200**: Patient object

### Get Patient Banner
```http
GET /v1/ehr/patients/:id/banner
Authorization: Bearer <token>
```

Returns quick summary for patient header display.

---

## Appointments

### Create Appointment
```http
POST /v1/ehr/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "uuid",
  "providerId": "uuid",
  "appointmentType": "new_patient", // new_patient, follow_up, urgent, etc.
  "scheduledDatetime": "2024-12-01T10:00:00Z",
  "durationMinutes": 30,
  "reason": "Annual checkup",
  "chiefComplaint": "Routine wellness visit",
  "locationId": "uuid",
  "department": "Primary Care"
}
```

**Response 201**: Appointment object

### List Appointments
```http
GET /v1/ehr/appointments?patientId=uuid&status=scheduled
Authorization: Bearer <token>
```

**Query Parameters**:
- `patientId` (uuid): Filter by patient
- `providerId` (uuid): Filter by provider
- `status` (string): scheduled, confirmed, checked_in, in_progress, completed, cancelled, no_show
- `startDate` (ISO 8601): Filter from date
- `endDate` (ISO 8601): Filter to date
- `limit`, `offset`: Pagination

### Check-In Appointment
```http
POST /v1/ehr/appointments/:id/check-in
Authorization: Bearer <token>
```

**Response 200**: Updated appointment with `checkInTime` set

### Cancel Appointment
```http
POST /v1/ehr/appointments/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "cancellationReason": "Patient requested cancellation"
}
```

---

## Clinical Encounters

### Create Encounter
```http
POST /v1/ehr/encounters
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "uuid",
  "providerId": "uuid",
  "encounterType": "outpatient", // outpatient, emergency, inpatient, observation, telehealth
  "encounterClass": "ambulatory",
  "appointmentId": "uuid",
  "chiefComplaint": "Chest pain",
  "reasonForVisit": "Follow-up for hypertension"
}
```

**Response 201**: Encounter object

### Start Encounter
```http
POST /v1/ehr/encounters/:id/start
Authorization: Bearer <token>
```

Transitions encounter to `in_progress` status.

### Finish Encounter
```http
POST /v1/ehr/encounters/:id/finish
Authorization: Bearer <token>
```

Transitions to `finished` status, auto-calculates duration.

### Add Diagnosis
```http
POST /v1/ehr/encounters/:id/diagnoses
Authorization: Bearer <token>
Content-Type: application/json

{
  "diagnosisCode": "I10",
  "diagnosisDescription": "Essential (primary) hypertension",
  "diagnosisType": "primary", // primary, secondary
  "isPrimary": true
}
```

### Add Procedure
```http
POST /v1/ehr/encounters/:id/procedures
Authorization: Bearer <token>
Content-Type: application/json

{
  "procedureCode": "99213",
  "procedureDescription": "Office visit, established patient",
  "performedBy": "uuid"
}
```

---

## Clinical Notes

### Create Clinical Note
```http
POST /v1/ehr/clinical-notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "encounterId": "uuid",
  "patientId": "uuid",
  "noteType": "progress_note",
  "noteTitle": "Progress Note - 2024-12-01",
  "subjective": "Patient reports improved chest pain...",
  "objective": "BP: 130/80, HR: 72, RR: 16, Temp: 98.6F...",
  "assessment": "1. Hypertension - improved control...",
  "plan": "1. Continue current medications...",
  "diagnoses": [
    {
      "icd10Code": "I10",
      "description": "Essential (primary) hypertension",
      "isPrimary": true
    }
  ],
  "procedures": [
    {
      "cptCode": "99213",
      "description": "Office visit",
      "quantity": 1
    }
  ]
}
```

**Response 201**: Clinical note object with `status: "draft"`

### Sign Clinical Note
```http
POST /v1/ehr/clinical-notes/:id/sign
Authorization: Bearer <token>
Content-Type: application/json

{
  "attestation": "I attest that this documentation is accurate and complete."
}
```

**Response 200**: Note with `status: "signed"`, `signedDatetime` set

**Note**: Signed notes cannot be edited, only amended.

### List Note Templates
```http
GET /v1/ehr/clinical-notes/templates
Authorization: Bearer <token>
```

Returns available note templates (Progress Note, H&P, Discharge Summary, etc.)

---

## Vital Signs

### Record Vital Signs
```http
POST /v1/ehr/vital-signs
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "uuid",
  "encounterId": "uuid",
  "bloodPressureSystolic": 130,
  "bloodPressureDiastolic": 80,
  "heartRate": 72,
  "respiratoryRate": 16,
  "temperature": 98.6,
  "temperatureUnit": "fahrenheit",
  "oxygenSaturation": 98,
  "weight": 70.5,
  "weightUnit": "kg",
  "height": 175,
  "heightUnit": "cm",
  "painScore": 0,
  "position": "sitting",
  "notes": "Patient resting, no distress"
}
```

**Response 201**: Vital signs object with:
- Auto-calculated BMI
- `isAbnormal` flag if out of normal range
- `isCritical` flag if critically abnormal
- `abnormalFlags` JSON with specific flags (bp_critical_high, tachycardia, etc.)

### Get Patient Vital Trends
```http
GET /v1/ehr/vital-signs/patient/:patientId/trends?days=30
Authorization: Bearer <token>
```

Returns time-series data for BP, HR, temperature, weight over specified days.

---

## Problem List

### Add Problem
```http
POST /v1/ehr/problems
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "uuid",
  "problemName": "Essential (primary) hypertension",
  "icd10Code": "I10",
  "icd10Description": "Essential (primary) hypertension",
  "snomedCode": "59621000",
  "snomedDescription": "Hypertension",
  "status": "active",
  "onsetDate": "2020-01-01",
  "severity": "moderate",
  "acuity": "chronic",
  "isChronic": true,
  "isPrincipalDiagnosis": true,
  "problemComment": "Well-controlled on current medications",
  "encounterId": "uuid",
  "providerId": "uuid",
  "reviewFrequencyDays": 90
}
```

**Response 201**: Problem object

### Resolve Problem
```http
POST /v1/ehr/problems/:id/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "resolvedReason": "Condition resolved with treatment"
}
```

Auto-sets `resolvedDate` to current date.

### Add Problem Comment
```http
POST /v1/ehr/problems/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "commentText": "Patient reports symptoms improved significantly",
  "encounterId": "uuid"
}
```

### List Problem History
```http
GET /v1/ehr/problems/:id/history
Authorization: Bearer <token>
```

Returns audit trail of all status changes.

---

## Lab Orders

### Create Lab Order
```http
POST /v1/ehr/lab-orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "uuid",
  "encounterId": "uuid",
  "orderingProviderId": "uuid",
  "priority": "routine", // stat, urgent, routine
  "clinicalIndication": "Annual wellness checkup",
  "specialInstructions": "Fasting required",
  "tests": [
    {
      "testId": "uuid",
      "testName": "Complete Blood Count (CBC)"
    },
    {
      "testId": "uuid",
      "testName": "Basic Metabolic Panel"
    }
  ]
}
```

**Response 201**: Lab order object with auto-generated `orderNumber`

### Collect Specimen
```http
PATCH /v1/ehr/lab-orders/:id/collect
Authorization: Bearer <token>
Content-Type: application/json

{
  "specimenId": "SPEC-20241201-001",
  "collectedBy": "uuid",
  "collectionDatetime": "2024-12-01T09:00:00Z"
}
```

Transitions order to `collected` status.

### Receive Specimen (Lab)
```http
PATCH /v1/ehr/lab-orders/:id/receive
Authorization: Bearer <token>
```

Transitions order to `in_lab` status.

### Enter Results
```http
POST /v1/ehr/lab-orders/:id/results
Authorization: Bearer <token>
Content-Type: application/json

{
  "results": [
    {
      "testId": "uuid",
      "resultValue": "12.5",
      "resultUnit": "g/dL",
      "isAbnormal": false,
      "isCritical": false,
      "resultComment": "Within normal limits"
    }
  ]
}
```

Sets `resultStatus: "preliminary"`, logs warning if any critical values.

### Verify Results
```http
PATCH /v1/ehr/lab-orders/:id/verify
Authorization: Bearer <token>
```

Sets `resultStatus: "final"`, transitions to `completed`.

### Cancel Lab Order
```http
POST /v1/ehr/lab-orders/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "cancellationReason": "Order entered in error"
}
```

---

## Imaging Orders

### Create Imaging Order
```http
POST /v1/ehr/imaging-orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "uuid",
  "encounterId": "uuid",
  "orderingProviderId": "uuid",
  "modalityCode": "XR", // XR, CT, MRI, US, NM, PET
  "studyName": "Chest X-Ray, PA and Lateral",
  "bodyPart": "Chest",
  "laterality": "bilateral",
  "clinicalIndication": "Shortness of breath, rule out pneumonia",
  "clinicalHistory": "Patient with 3-day history of cough and fever",
  "relevantDiagnoses": [
    {
      "icd10Code": "R06.02",
      "description": "Shortness of breath"
    }
  ],
  "priority": "routine", // stat, urgent, routine
  "requiresContrast": false,
  "requiresSedation": false,
  "requiresFasting": false,
  "specialInstructions": "Portable if patient unable to ambulate"
}
```

**Response 201**: Imaging order with auto-generated `orderNumber`

### Schedule Study
```http
PUT /v1/ehr/imaging-orders/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "scheduledDatetime": "2024-12-01T14:00:00Z",
  "status": "scheduled"
}
```

Auto-generates `accessionNumber` when scheduled (format: YYYYMMDD-ORG-SEQNUM)

### Perform Study
```http
POST /v1/ehr/imaging-orders/:id/perform
Authorization: Bearer <token>
Content-Type: application/json

{
  "performingTechnologistId": "uuid",
  "performingLocation": "Radiology - Room 2",
  "equipmentUsed": "GE Discovery XR650",
  "pacsStudyInstanceUid": "1.2.840.113619.2.55.3.123456789",
  "seriesCount": 2,
  "imageCount": 4
}
```

Transitions to `in_progress` status, records PACS integration details.

### Enter Report
```http
POST /v1/ehr/imaging-orders/:id/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "final", // preliminary or final
  "findings": "PA and lateral chest radiographs demonstrate...",
  "impression": "1. No acute cardiopulmonary process.\n2. Normal chest radiograph.",
  "recommendations": "Clinical correlation recommended.",
  "isCriticalFinding": false
}
```

- `preliminary`: Sets `reportStatus: "preliminary"`
- `final`: Sets `reportStatus: "final"`, transitions order to `completed`

### Cancel Imaging Order
```http
POST /v1/ehr/imaging-orders/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "cancellationReason": "Patient declined procedure"
}
```

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (success, no body) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, invalid state transition) |
| 422 | Unprocessable Entity (business rule violation) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Patient not found",
    "details": {
      "field": "patientId",
      "reason": "Patient with ID xxx does not exist"
    }
  }
}
```

---

## Rate Limiting

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour

Headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638360000
```

---

## Pagination

All list endpoints support pagination:

```http
GET /v1/ehr/patients?limit=50&offset=100
```

Response includes:
```json
{
  "items": [...],
  "total": 1000,
  "limit": 50,
  "offset": 100
}
```

**Tiger Style Limits**:
- Default limit: 50
- Maximum limit: 1000
- All queries have 5-second timeout

---

## Filtering & Sorting

Common query parameters:
- `search`: Full-text search
- `status`: Filter by status
- `startDate`, `endDate`: Date range filters
- `sortBy`: Field to sort by
- `sortOrder`: `asc` or `desc`

---

## Versioning

API version is included in the URL path: `/v1/`

Future versions will be released as `/v2/`, `/v3/`, etc. Previous versions will be supported for at least 12 months after new version release.

---

## Webhooks (Future)

Planned webhook events:
- `lab_result.completed`
- `imaging_report.signed`
- `appointment.cancelled`
- `clinical_note.signed`
- `vital_signs.critical`

---

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Migration Guide](./MIGRATIONS.md)
- [Security & Compliance](./SECURITY.md)
