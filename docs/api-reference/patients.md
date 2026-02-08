---
sidebar_position: 3
title: Patients
description: Patient CRUD, search, merge, and duplicate detection
---

# Patients API

The Patients API manages patient demographics within the EHR module. All patient data is stored in PostgreSQL with compile-time checked SQL queries. Patients are scoped to an organization and soft-deleted (never permanently removed).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/ehr/patients` | List patients (paginated) |
| GET | `/v1/ehr/patients/search` | Search patients by name, MRN, phone, or email |
| GET | `/v1/ehr/patients/:id` | Get patient by UUID |
| GET | `/v1/ehr/patients/mrn/:mrn` | Get patient by Medical Record Number |
| GET | `/v1/ehr/patients/ien/:ien` | Get patient by VistA Internal Entry Number |
| POST | `/v1/ehr/patients` | Create a new patient |
| PUT | `/v1/ehr/patients/:id` | Update patient demographics |
| DELETE | `/v1/ehr/patients/:id` | Soft-delete a patient |
| GET | `/v1/ehr/patients/:id/banner` | Get patient banner summary |
| POST | `/v1/ehr/patients/find-duplicates` | Find potential duplicate patients |
| POST | `/v1/ehr/patients/merge` | Merge two patient records |

All endpoints require authentication. All patient API access is audit logged for HIPAA compliance.

---

## GET /v1/ehr/patients

List patients with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 100 | Maximum records to return (max: 1000) |
| `offset` | integer | 0 | Number of records to skip |
| `status` | string | -- | Filter by status (`active`, `inactive`, `deceased`) |
| `providerId` | UUID | -- | Filter by primary care provider |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "organizationId": "660e8400-e29b-41d4-a716-446655440000",
      "ien": 12345,
      "mrn": "MRN-000001",
      "firstName": "Jane",
      "lastName": "Doe",
      "middleName": null,
      "suffix": null,
      "dateOfBirth": "1990-05-15",
      "age": 35,
      "sex": "F",
      "maritalStatus": "single",
      "race": null,
      "ethnicity": null,
      "preferredLanguage": "en",
      "veteranStatus": false,
      "email": "jane.doe@example.com",
      "phoneHome": null,
      "phoneWork": null,
      "phoneMobile": "+1-555-0100",
      "phonePreferred": "mobile",
      "addressLine1": "123 Main St",
      "addressLine2": null,
      "city": "Springfield",
      "state": "IL",
      "zipCode": "62701",
      "country": "US",
      "emergencyContactName": "John Doe",
      "emergencyContactPhone": "+1-555-0101",
      "emergencyContactRelationship": "spouse",
      "primaryCareProviderId": "770e8400-e29b-41d4-a716-446655440000",
      "primaryCareProviderName": "Dr. Smith",
      "status": "active",
      "deceasedDate": null,
      "confidentialityCode": null,
      "vipFlag": false,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

Results are ordered by `lastName, firstName`.

---

## GET /v1/ehr/patients/search

Search for patients by name, MRN, phone number, or email. Results are ranked with MRN matches first, then last name matches, then other matches.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `q` | string | Yes | -- | Search term (minimum 1 character) |
| `limit` | integer | No | 20 | Maximum results (max: 100) |

**Example:**

```
GET /v1/ehr/patients/search?q=doe&limit=10
```

The search performs case-insensitive `ILIKE` matching against `firstName`, `lastName`, `mrn`, `phoneMobile`, and `email`.

---

## GET /v1/ehr/patients/:id

Get a single patient by UUID.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Patient identifier |

**Success Response (200):**

Returns a single patient object (same schema as the list endpoint).

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Patient does not exist or has been deleted |

---

## GET /v1/ehr/patients/mrn/:mrn

Look up a patient by their Medical Record Number.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `mrn` | string | Medical Record Number (e.g., `MRN-000001`) |

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | No patient with the given MRN |

---

## GET /v1/ehr/patients/ien/:ien

Look up a patient by their VistA Internal Entry Number (IEN). Used for integration with VistA/YottaDB systems.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `ien` | integer | VistA Internal Entry Number |

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | No patient with the given IEN |

---

## POST /v1/ehr/patients

Create a new patient record.

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "sex": "F",
  "mrn": null,
  "middleName": null,
  "suffix": null,
  "maritalStatus": "single",
  "race": null,
  "ethnicity": null,
  "preferredLanguage": "en",
  "veteranStatus": false,
  "email": "jane.doe@example.com",
  "phoneHome": null,
  "phoneWork": null,
  "phoneMobile": "+1-555-0100",
  "addressLine1": "123 Main St",
  "addressLine2": null,
  "city": "Springfield",
  "state": "IL",
  "zipCode": "62701",
  "country": "US",
  "emergencyContactName": "John Doe",
  "emergencyContactPhone": "+1-555-0101",
  "emergencyContactRelationship": "spouse",
  "primaryCareProviderId": null
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `firstName` | string | Yes | Patient's first name |
| `lastName` | string | Yes | Patient's last name |
| `dateOfBirth` | date | Yes | Date of birth (YYYY-MM-DD), must not be in the future |
| `sex` | string | Yes | Biological sex: `M`, `F`, `O`, or `U` |
| `mrn` | string | No | Medical Record Number (auto-generated if omitted) |
| `middleName` | string | No | Middle name |
| `suffix` | string | No | Name suffix (Jr., III, etc.) |
| `maritalStatus` | string | No | Marital status |
| `race` | string | No | Race |
| `ethnicity` | string | No | Ethnicity |
| `preferredLanguage` | string | No | ISO language code |
| `veteranStatus` | boolean | No | Military veteran flag (default: false) |
| `email` | string | No | Email address |
| `phoneHome` | string | No | Home phone number |
| `phoneWork` | string | No | Work phone number |
| `phoneMobile` | string | No | Mobile phone number |
| `addressLine1` | string | No | Street address line 1 |
| `addressLine2` | string | No | Street address line 2 |
| `city` | string | No | City |
| `state` | string | No | State/province |
| `zipCode` | string | No | ZIP/postal code |
| `country` | string | No | Country code |
| `emergencyContactName` | string | No | Emergency contact full name |
| `emergencyContactPhone` | string | No | Emergency contact phone |
| `emergencyContactRelationship` | string | No | Relationship to patient |
| `primaryCareProviderId` | UUID | No | Assigned primary care provider |

**Validation Rules:**

- `sex` must be one of: `M` (Male), `F` (Female), `O` (Other), `U` (Unknown)
- `dateOfBirth` must not be in the future
- `firstName` and `lastName` must not be empty

**Success Response (200):**

Returns the created patient object with server-generated fields (`id`, `mrn` if auto-generated, `createdAt`, `updatedAt`).

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid sex value or future date of birth |
| 409 | `CONFLICT` | Duplicate MRN within the organization |

---

## PUT /v1/ehr/patients/:id

Update an existing patient's demographics. Only provided fields are updated; omitted fields retain their current values (partial update via `COALESCE`).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Patient identifier |

**Request Body:**

All fields are optional. Include only the fields you want to change.

```json
{
  "phoneMobile": "+1-555-0200",
  "addressLine1": "456 Oak Ave",
  "city": "Chicago",
  "state": "IL",
  "status": "active"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `middleName` | string | Middle name |
| `suffix` | string | Name suffix |
| `dateOfBirth` | date | Date of birth |
| `sex` | string | Biological sex |
| `maritalStatus` | string | Marital status |
| `race` | string | Race |
| `ethnicity` | string | Ethnicity |
| `preferredLanguage` | string | Language preference |
| `email` | string | Email address |
| `phoneHome` | string | Home phone |
| `phoneWork` | string | Work phone |
| `phoneMobile` | string | Mobile phone |
| `phonePreferred` | string | Preferred phone type |
| `addressLine1` | string | Street address line 1 |
| `addressLine2` | string | Street address line 2 |
| `city` | string | City |
| `state` | string | State/province |
| `zipCode` | string | ZIP/postal code |
| `country` | string | Country |
| `emergencyContactName` | string | Emergency contact name |
| `emergencyContactPhone` | string | Emergency contact phone |
| `emergencyContactRelationship` | string | Relationship |
| `primaryCareProviderId` | UUID | Primary care provider |
| `status` | string | Patient status (`active`, `inactive`) |

**Success Response (200):**

Returns the full updated patient object.

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Patient does not exist |

---

## DELETE /v1/ehr/patients/:id

Soft-delete a patient. Sets `deleted_at` to the current timestamp. The patient record is retained in the database but excluded from all queries.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Patient identifier |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deleted": true
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Patient does not exist or already deleted |

---

## GET /v1/ehr/patients/:id/banner

Get a summary view of a patient suitable for display in a patient banner component. Includes counts of active clinical data aggregated from related tables.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Patient identifier |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "mrn": "MRN-000001",
    "fullName": "Jane Doe",
    "dateOfBirth": "1990-05-15",
    "age": 35,
    "sex": "F",
    "primaryCareProviderName": "Dr. Smith",
    "allergiesCount": 3,
    "activeProblemsCount": 2,
    "activeMedicationsCount": 5,
    "lastVisitDate": "2025-06-10T14:00:00Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Patient identifier |
| `mrn` | string | Medical Record Number |
| `fullName` | string | Concatenated first and last name |
| `dateOfBirth` | date | Date of birth |
| `age` | integer | Calculated age |
| `sex` | string | Biological sex |
| `primaryCareProviderName` | string | Assigned PCP name |
| `allergiesCount` | integer | Number of active drug allergies |
| `activeProblemsCount` | integer | Number of active problems on the problem list |
| `activeMedicationsCount` | integer | Number of active prescriptions |
| `lastVisitDate` | datetime | Most recent completed encounter date |

The counts are queried live from the `drug_allergies`, `problem_list`, `prescriptions`, and `encounters` tables.

---

## POST /v1/ehr/patients/find-duplicates

Check for potential duplicate patients before creating a new record. Returns a scored list of matches based on demographic data.

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "ssnLastFour": "1234"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `firstName` | string | Yes | First name to match |
| `lastName` | string | Yes | Last name to match |
| `dateOfBirth` | date | Yes | Date of birth to match (must not be in the future) |
| `ssnLastFour` | string | No | Last four digits of SSN for additional matching |

**Scoring Algorithm:**

The duplicate detection uses a point-based scoring system:

| Criterion | Points | Match Type |
|-----------|:------:|------------|
| First name exact match (case-insensitive) | 30 | Name |
| Last name exact match (case-insensitive) | 30 | Name |
| Date of birth exact match | 40 | DOB |

A patient must match on at least the name pair (first + last) or the date of birth to appear in results. Maximum score is 100 points.

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "patientId": "550e8400-e29b-41d4-a716-446655440000",
      "mrn": "MRN-000001",
      "fullName": "Jane Doe",
      "dateOfBirth": "1990-05-15",
      "matchScore": 100,
      "matchReasons": ["first_name", "last_name", "date_of_birth"]
    },
    {
      "patientId": "550e8400-e29b-41d4-a716-446655440001",
      "mrn": "MRN-000042",
      "fullName": "Janet Doe",
      "dateOfBirth": "1990-05-15",
      "matchScore": 70,
      "matchReasons": ["last_name", "date_of_birth"]
    }
  ]
}
```

Results are ordered by `matchScore` descending, limited to 10 matches. Patients with status `merged` are excluded.

**Validation Rules:**

- `firstName` and `lastName` must not be empty
- `dateOfBirth` must not be in the future

---

## POST /v1/ehr/patients/merge

Merge two patient records by moving all clinical data from the duplicate to the survivor. This is an atomic operation performed within a database transaction.

**Request Body:**

```json
{
  "survivorId": "550e8400-e29b-41d4-a716-446655440000",
  "duplicateId": "550e8400-e29b-41d4-a716-446655440001",
  "mergeReason": "Duplicate registration at front desk"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `survivorId` | UUID | Yes | The patient record that will survive (receives all data) |
| `duplicateId` | UUID | Yes | The duplicate patient record to be merged and deactivated |
| `mergeReason` | string | No | Reason for the merge (stored in audit trail) |

**What happens during a merge:**

1. Both patient records are verified to exist and not already be merged
2. A database transaction begins
3. All related records are moved from the duplicate to the survivor:
   - Encounters
   - Appointments
   - Drug allergies
   - Problem list entries
   - Prescriptions
   - Vital signs
   - Clinical notes
4. A merge history record is created in `patient_merge_history`
5. The duplicate patient's status is set to `merged`
6. The transaction commits

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "survivorId": "550e8400-e29b-41d4-a716-446655440000",
    "mergedId": "550e8400-e29b-41d4-a716-446655440001",
    "recordsMoved": {
      "encounters": 3,
      "appointments": 1,
      "allergies": 2,
      "problems": 1,
      "prescriptions": 4,
      "vitalSigns": 12,
      "clinicalNotes": 5
    }
  }
}
```

**Validation Rules:**

- `survivorId` and `duplicateId` must be different (cannot merge a patient into itself)
- Both patients must exist, not be soft-deleted, and not already have status `merged`

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Attempting to merge a patient into itself |
| 404 | `NOT_FOUND` | Survivor or duplicate patient not found or already merged |

---

## PHI Considerations

All patient endpoints contain Protected Health Information (PHI). The following safeguards are in place:

- **Audit logging**: Every API call that reads or modifies patient data is logged via the `useAuditLog` hook on the frontend and `tracing::instrument` on the backend. Logs are retained for 7 years per HIPAA requirements.

- **PHI fields**: The following fields are classified as PHI and must always be tracked when accessed:
  - SSN (stored separately, not in the patient record)
  - Email
  - Phone numbers (home, work, mobile)
  - Medical Record Number (MRN)
  - Date of birth
  - Physical address
  - Emergency contact information

- **Error sanitization**: Error messages are scrubbed of any PHI patterns before being returned to the client.

- **Soft deletes**: Patient records are never physically deleted. The `DELETE` endpoint sets `deleted_at` and the record is excluded from queries.

## Frontend Integration

The client application uses TanStack Query hooks for all patient operations:

```typescript
import {
  useEhrPatients,
  useEhrPatient,
  useEhrPatientBanner,
  useCreateEhrPatient,
  useUpdateEhrPatient,
  useDeleteEhrPatient,
  useFindDuplicatePatients,
  useMergePatients,
} from "@/hooks/api/ehr/useEhrPatients";

// List patients with pagination
const { data, isLoading } = useEhrPatients({ limit: 50, offset: 0 });

// Get single patient
const { data: patient } = useEhrPatient(patientId);

// Get patient banner
const { data: banner } = useEhrPatientBanner(patientId);

// Create patient (mutation)
const createMutation = useCreateEhrPatient();
await createMutation.mutateAsync({
  firstName: "Jane",
  lastName: "Doe",
  dateOfBirth: "1990-05-15",
  sex: "F",
});

// Find duplicates before creating
const duplicateMutation = useFindDuplicatePatients();
const duplicates = await duplicateMutation.mutateAsync({
  firstName: "Jane",
  lastName: "Doe",
  dateOfBirth: "1990-05-15",
});

// Merge patients
const mergeMutation = useMergePatients();
await mergeMutation.mutateAsync({
  survivorId: "...",
  duplicateId: "...",
  mergeReason: "Duplicate registration",
});
```

All hooks include Zod runtime validation for both request and response payloads. Query results are cached for 30 seconds (`staleTime: 30_000`), except for the patient banner which is cached for 60 seconds.
