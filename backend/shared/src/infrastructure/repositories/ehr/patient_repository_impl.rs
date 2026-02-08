//! EHR Patient Repository Implementation

use async_trait::async_trait;
use chrono::{DateTime, NaiveDate, Utc};
use sqlx::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use crate::domain::entities::ehr::{EhrPatient, Gender, PatientStatus};
use crate::domain::repositories::ehr::patient_repository::{
    EhrPatientRepository, PaginatedResult, Pagination, PatientSearchCriteria,
};
use crate::infrastructure::database::{DatabaseService, RepositoryErrorExt};
use crate::shared::AppResult;

/// Database row for EHR patient
/// Maps actual DB column names (via SQL aliases) to entity field names
#[derive(Debug, FromRow)]
struct EhrPatientRow {
    id: Uuid,
    ien: i64,
    organization_id: Uuid,
    last_name: String,
    first_name: String,
    middle_name: Option<String>,
    suffix: Option<String>,
    preferred_name: Option<String>,
    date_of_birth: NaiveDate,
    gender: String,
    ssn_last_four: Option<String>,
    mrn: String,
    email: Option<String>,
    phone_home: Option<String>,
    phone_mobile: Option<String>,
    phone_work: Option<String>,
    address_line1: Option<String>,
    address_line2: Option<String>,
    city: Option<String>,
    state: Option<String>,
    zip_code: Option<String>,
    country: Option<String>,
    emergency_contact_name: Option<String>,
    emergency_contact_phone: Option<String>,
    emergency_contact_relationship: Option<String>,
    insurance_carrier: Option<String>,
    insurance_policy_number: Option<String>,
    insurance_group_number: Option<String>,
    status: String,
    deceased_date: Option<NaiveDate>,
    primary_provider_id: Option<Uuid>,
    primary_location_id: Option<Uuid>,
    mumps_data: Option<serde_json::Value>,
    request_id: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    created_by: Option<Uuid>,
    updated_by: Option<Uuid>,
    system_id: Option<String>,
    version: i64,
}

impl From<EhrPatientRow> for EhrPatient {
    fn from(row: EhrPatientRow) -> Self {
        let gender = match row.gender.as_str() {
            "M" | "male" => Gender::Male,
            "F" | "female" => Gender::Female,
            "O" | "other" => Gender::Other,
            _ => Gender::Unknown,
        };

        let status = match row.status.as_str() {
            "active" => PatientStatus::Active,
            "inactive" => PatientStatus::Inactive,
            "deceased" => PatientStatus::Deceased,
            _ => PatientStatus::Active,
        };

        EhrPatient {
            id: row.id,
            ien: row.ien,
            organization_id: row.organization_id,
            last_name: row.last_name,
            first_name: row.first_name,
            middle_name: row.middle_name,
            suffix: row.suffix,
            preferred_name: row.preferred_name,
            date_of_birth: row.date_of_birth,
            gender,
            ssn_last_four: row.ssn_last_four,
            mrn: row.mrn,
            email: row.email,
            phone_home: row.phone_home,
            phone_mobile: row.phone_mobile,
            phone_work: row.phone_work,
            address_line1: row.address_line1,
            address_line2: row.address_line2,
            city: row.city,
            state: row.state,
            zip_code: row.zip_code,
            country: row.country,
            emergency_contact_name: row.emergency_contact_name,
            emergency_contact_phone: row.emergency_contact_phone,
            emergency_contact_relationship: row.emergency_contact_relationship,
            insurance_carrier: row.insurance_carrier,
            insurance_policy_number: row.insurance_policy_number,
            insurance_group_number: row.insurance_group_number,
            status,
            deceased_date: row.deceased_date,
            primary_provider_id: row.primary_provider_id,
            primary_location_id: row.primary_location_id,
            mumps_data: row.mumps_data,
            request_id: row.request_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            created_by: row.created_by,
            updated_by: row.updated_by,
            system_id: row.system_id,
            version: row.version,
        }
    }
}

/// PostgreSQL implementation of EHR Patient Repository
pub struct EhrPatientRepositoryImpl {
    database_service: Arc<DatabaseService>,
}

impl EhrPatientRepositoryImpl {
    pub fn new(database_service: Arc<DatabaseService>) -> Self {
        Self { database_service }
    }

    /// Convert Gender enum to DB value (sex column uses M/F/O/U)
    fn gender_to_db(gender: &Gender) -> &'static str {
        match gender {
            Gender::Male => "M",
            Gender::Female => "F",
            Gender::Other => "O",
            Gender::Unknown => "U",
        }
    }

    fn status_to_string(status: &PatientStatus) -> &'static str {
        match status {
            PatientStatus::Active => "active",
            PatientStatus::Inactive => "inactive",
            PatientStatus::Deceased => "deceased",
        }
    }
}

#[async_trait]
impl EhrPatientRepository for EhrPatientRepositoryImpl {
    async fn create(&self, patient: EhrPatient) -> AppResult<EhrPatient> {
        let sex = Self::gender_to_db(&patient.gender);
        let status = Self::status_to_string(&patient.status);

        // Map entity fields to actual DB columns:
        // preferred_name -> maiden_name, gender -> sex,
        // insurance_carrier -> insurance_primary_carrier, etc.
        let row = sqlx::query_as!(
            EhrPatientRow,
            r#"
            INSERT INTO ehr_patients (
                id, organization_id, last_name, first_name, middle_name, suffix,
                maiden_name, date_of_birth, sex, mrn,
                email, phone_home, phone_mobile, phone_work,
                address_line1, address_line2, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                insurance_primary_carrier, insurance_primary_policy_number, insurance_primary_group_number,
                status, deceased_date, primary_care_provider_id, primary_facility_id,
                mumps_data, created_by, updated_by
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
                $28, $29, $30, $31, $32, $33
            )
            RETURNING
                id, ien::bigint as "ien!", organization_id,
                COALESCE(last_name, '') as "last_name!",
                COALESCE(first_name, '') as "first_name!",
                middle_name, suffix,
                maiden_name as preferred_name,
                date_of_birth as "date_of_birth!",
                COALESCE(sex, 'U') as "gender!",
                NULL::text as ssn_last_four,
                mrn,
                email, phone_home, phone_mobile, phone_work,
                address_line1, address_line2, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                insurance_primary_carrier as insurance_carrier,
                insurance_primary_policy_number as insurance_policy_number,
                insurance_primary_group_number as insurance_group_number,
                COALESCE(status, 'active') as "status!",
                deceased_date,
                primary_care_provider_id as primary_provider_id,
                primary_facility_id as primary_location_id,
                mumps_data,
                NULL::text as request_id,
                created_at, updated_at, created_by, updated_by,
                NULL::text as system_id,
                version
            "#,
            patient.id,
            patient.organization_id,
            &patient.last_name,
            &patient.first_name,
            patient.middle_name.as_deref(),
            patient.suffix.as_deref(),
            patient.preferred_name.as_deref(),
            patient.date_of_birth,
            sex,
            &patient.mrn,
            patient.email.as_deref(),
            patient.phone_home.as_deref(),
            patient.phone_mobile.as_deref(),
            patient.phone_work.as_deref(),
            patient.address_line1.as_deref(),
            patient.address_line2.as_deref(),
            patient.city.as_deref(),
            patient.state.as_deref(),
            patient.zip_code.as_deref(),
            patient.country.as_deref(),
            patient.emergency_contact_name.as_deref(),
            patient.emergency_contact_phone.as_deref(),
            patient.emergency_contact_relationship.as_deref(),
            patient.insurance_carrier.as_deref(),
            patient.insurance_policy_number.as_deref(),
            patient.insurance_group_number.as_deref(),
            status,
            patient.deceased_date,
            patient.primary_provider_id,
            patient.primary_location_id,
            patient.mumps_data.as_ref(),
            patient.created_by,
            patient.updated_by
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("insert", "ehr_patient")?;

        Ok(row.into())
    }

    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrPatient>> {
        let row = sqlx::query_as!(
            EhrPatientRow,
            r#"
            SELECT
                id, ien::bigint as "ien!", organization_id,
                COALESCE(last_name, '') as "last_name!",
                COALESCE(first_name, '') as "first_name!",
                middle_name, suffix,
                maiden_name as preferred_name,
                date_of_birth as "date_of_birth!",
                COALESCE(sex, 'U') as "gender!",
                NULL::text as ssn_last_four,
                mrn,
                email, phone_home, phone_mobile, phone_work,
                address_line1, address_line2, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                insurance_primary_carrier as insurance_carrier,
                insurance_primary_policy_number as insurance_policy_number,
                insurance_primary_group_number as insurance_group_number,
                COALESCE(status, 'active') as "status!",
                deceased_date,
                primary_care_provider_id as primary_provider_id,
                primary_facility_id as primary_location_id,
                mumps_data,
                NULL::text as request_id,
                created_at, updated_at, created_by, updated_by,
                NULL::text as system_id,
                version
            FROM ehr_patients
            WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
            "#,
            id,
            organization_id
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("fetch", "ehr_patient")?;

        Ok(row.map(Into::into))
    }

    async fn find_by_ien(&self, ien: i64, organization_id: Uuid) -> AppResult<Option<EhrPatient>> {
        let row = sqlx::query_as!(
            EhrPatientRow,
            r#"
            SELECT
                id, ien::bigint as "ien!", organization_id,
                COALESCE(last_name, '') as "last_name!",
                COALESCE(first_name, '') as "first_name!",
                middle_name, suffix,
                maiden_name as preferred_name,
                date_of_birth as "date_of_birth!",
                COALESCE(sex, 'U') as "gender!",
                NULL::text as ssn_last_four,
                mrn,
                email, phone_home, phone_mobile, phone_work,
                address_line1, address_line2, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                insurance_primary_carrier as insurance_carrier,
                insurance_primary_policy_number as insurance_policy_number,
                insurance_primary_group_number as insurance_group_number,
                COALESCE(status, 'active') as "status!",
                deceased_date,
                primary_care_provider_id as primary_provider_id,
                primary_facility_id as primary_location_id,
                mumps_data,
                NULL::text as request_id,
                created_at, updated_at, created_by, updated_by,
                NULL::text as system_id,
                version
            FROM ehr_patients
            WHERE ien = $1::int AND organization_id = $2 AND deleted_at IS NULL
            "#,
            ien as i32,
            organization_id
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("fetch", "ehr_patient")?;

        Ok(row.map(Into::into))
    }

    async fn find_by_mrn(&self, mrn: &str, organization_id: Uuid) -> AppResult<Option<EhrPatient>> {
        let row = sqlx::query_as!(
            EhrPatientRow,
            r#"
            SELECT
                id, ien::bigint as "ien!", organization_id,
                COALESCE(last_name, '') as "last_name!",
                COALESCE(first_name, '') as "first_name!",
                middle_name, suffix,
                maiden_name as preferred_name,
                date_of_birth as "date_of_birth!",
                COALESCE(sex, 'U') as "gender!",
                NULL::text as ssn_last_four,
                mrn,
                email, phone_home, phone_mobile, phone_work,
                address_line1, address_line2, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                insurance_primary_carrier as insurance_carrier,
                insurance_primary_policy_number as insurance_policy_number,
                insurance_primary_group_number as insurance_group_number,
                COALESCE(status, 'active') as "status!",
                deceased_date,
                primary_care_provider_id as primary_provider_id,
                primary_facility_id as primary_location_id,
                mumps_data,
                NULL::text as request_id,
                created_at, updated_at, created_by, updated_by,
                NULL::text as system_id,
                version
            FROM ehr_patients
            WHERE mrn = $1 AND organization_id = $2 AND deleted_at IS NULL
            "#,
            mrn,
            organization_id
        )
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("fetch", "ehr_patient")?;

        Ok(row.map(Into::into))
    }

    async fn update(&self, patient: EhrPatient) -> AppResult<EhrPatient> {
        let sex = Self::gender_to_db(&patient.gender);
        let status = Self::status_to_string(&patient.status);

        let row = sqlx::query_as!(
            EhrPatientRow,
            r#"
            UPDATE ehr_patients SET
                last_name = $3, first_name = $4, middle_name = $5, suffix = $6,
                maiden_name = $7, date_of_birth = $8, sex = $9,
                email = $10, phone_home = $11, phone_mobile = $12, phone_work = $13,
                address_line1 = $14, address_line2 = $15, city = $16, state = $17,
                zip_code = $18, country = $19,
                emergency_contact_name = $20, emergency_contact_phone = $21,
                emergency_contact_relationship = $22,
                insurance_primary_carrier = $23, insurance_primary_policy_number = $24,
                insurance_primary_group_number = $25,
                status = $26, deceased_date = $27,
                primary_care_provider_id = $28, primary_facility_id = $29,
                mumps_data = $30, updated_by = $31, updated_at = NOW(),
                version = version + 1
            WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
            RETURNING
                id, ien::bigint as "ien!", organization_id,
                COALESCE(last_name, '') as "last_name!",
                COALESCE(first_name, '') as "first_name!",
                middle_name, suffix,
                maiden_name as preferred_name,
                date_of_birth as "date_of_birth!",
                COALESCE(sex, 'U') as "gender!",
                NULL::text as ssn_last_four,
                mrn,
                email, phone_home, phone_mobile, phone_work,
                address_line1, address_line2, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                insurance_primary_carrier as insurance_carrier,
                insurance_primary_policy_number as insurance_policy_number,
                insurance_primary_group_number as insurance_group_number,
                COALESCE(status, 'active') as "status!",
                deceased_date,
                primary_care_provider_id as primary_provider_id,
                primary_facility_id as primary_location_id,
                mumps_data,
                NULL::text as request_id,
                created_at, updated_at, created_by, updated_by,
                NULL::text as system_id,
                version
            "#,
            patient.id,
            patient.organization_id,
            &patient.last_name,
            &patient.first_name,
            patient.middle_name.as_deref(),
            patient.suffix.as_deref(),
            patient.preferred_name.as_deref(),
            patient.date_of_birth,
            sex,
            patient.email.as_deref(),
            patient.phone_home.as_deref(),
            patient.phone_mobile.as_deref(),
            patient.phone_work.as_deref(),
            patient.address_line1.as_deref(),
            patient.address_line2.as_deref(),
            patient.city.as_deref(),
            patient.state.as_deref(),
            patient.zip_code.as_deref(),
            patient.country.as_deref(),
            patient.emergency_contact_name.as_deref(),
            patient.emergency_contact_phone.as_deref(),
            patient.emergency_contact_relationship.as_deref(),
            patient.insurance_carrier.as_deref(),
            patient.insurance_policy_number.as_deref(),
            patient.insurance_group_number.as_deref(),
            status,
            patient.deceased_date,
            patient.primary_provider_id,
            patient.primary_location_id,
            patient.mumps_data.as_ref(),
            patient.updated_by
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("update", "ehr_patient")?;

        Ok(row.into())
    }

    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE ehr_patients SET deleted_at = NOW()
            WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
            "#,
            id,
            organization_id
        )
        .execute(self.database_service.pool())
        .await
        .map_db_error("delete", "ehr_patient")?;

        Ok(())
    }

    async fn search(
        &self,
        organization_id: Uuid,
        criteria: PatientSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrPatient>> {
        let name_pattern = criteria.name.as_ref().map(|n| format!("%{}%", n));
        let status_str = criteria.status.as_ref().map(|s| Self::status_to_string(s).to_string());
        let limit = pagination.limit.min(1000) as i64;
        let offset = pagination.offset as i64;

        // Compile-time checked: use COALESCE/NULL-check pattern for optional filters
        let total = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as "count!"
            FROM ehr_patients
            WHERE organization_id = $1
              AND deleted_at IS NULL
              AND ($2::text IS NULL OR (last_name ILIKE $2 OR first_name ILIKE $2))
              AND ($3::text IS NULL OR mrn = $3)
              AND ($4::date IS NULL OR date_of_birth = $4)
              AND ($5::text IS NULL OR status = $5)
            "#,
            organization_id,
            name_pattern.as_deref(),
            criteria.mrn.as_deref(),
            criteria.date_of_birth,
            status_str.as_deref()
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("count", "ehr_patient")?;

        let rows = sqlx::query_as!(
            EhrPatientRow,
            r#"
            SELECT
                id, ien::bigint as "ien!", organization_id,
                COALESCE(last_name, '') as "last_name!",
                COALESCE(first_name, '') as "first_name!",
                middle_name, suffix,
                maiden_name as preferred_name,
                date_of_birth as "date_of_birth!",
                COALESCE(sex, 'U') as "gender!",
                NULL::text as ssn_last_four,
                mrn,
                email, phone_home, phone_mobile, phone_work,
                address_line1, address_line2, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                insurance_primary_carrier as insurance_carrier,
                insurance_primary_policy_number as insurance_policy_number,
                insurance_primary_group_number as insurance_group_number,
                COALESCE(status, 'active') as "status!",
                deceased_date,
                primary_care_provider_id as primary_provider_id,
                primary_facility_id as primary_location_id,
                mumps_data,
                NULL::text as request_id,
                created_at, updated_at, created_by, updated_by,
                NULL::text as system_id,
                version
            FROM ehr_patients
            WHERE organization_id = $1
              AND deleted_at IS NULL
              AND ($2::text IS NULL OR (last_name ILIKE $2 OR first_name ILIKE $2))
              AND ($3::text IS NULL OR mrn = $3)
              AND ($4::date IS NULL OR date_of_birth = $4)
              AND ($5::text IS NULL OR status = $5)
            ORDER BY last_name, first_name
            LIMIT $6 OFFSET $7
            "#,
            organization_id,
            name_pattern.as_deref(),
            criteria.mrn.as_deref(),
            criteria.date_of_birth,
            status_str.as_deref(),
            limit,
            offset
        )
        .fetch_all(self.database_service.pool())
        .await
        .map_db_error("search", "ehr_patient")?;

        Ok(PaginatedResult {
            items: rows.into_iter().map(Into::into).collect(),
            total,
            limit: pagination.limit,
            offset: pagination.offset,
        })
    }

    async fn list(
        &self,
        organization_id: Uuid,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrPatient>> {
        self.search(organization_id, PatientSearchCriteria::default(), pagination).await
    }

    async fn count(&self, organization_id: Uuid) -> AppResult<i64> {
        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) as "count!" FROM ehr_patients WHERE organization_id = $1 AND deleted_at IS NULL"#,
            organization_id
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("count", "ehr_patient")?;

        Ok(count)
    }

    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64> {
        let result = sqlx::query_scalar!(
            r#"
            SELECT (COALESCE(MAX(ien), 0) + 1)::bigint as "next_ien!"
            FROM ehr_patients
            WHERE organization_id = $1
            "#,
            organization_id
        )
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("next_ien", "ehr_patient")?;

        Ok(result)
    }
}
