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
use crate::shared::{AppError, AppResult};

/// Database row for EHR patient
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
            "male" => Gender::Male,
            "female" => Gender::Female,
            "other" => Gender::Other,
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

    fn gender_to_string(gender: &Gender) -> &'static str {
        match gender {
            Gender::Male => "male",
            Gender::Female => "female",
            Gender::Other => "other",
            Gender::Unknown => "unknown",
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
        let gender = Self::gender_to_string(&patient.gender);
        let status = Self::status_to_string(&patient.status);

        let row: EhrPatientRow = sqlx::query_as(
            r#"
            INSERT INTO ehr_patients (
                id, organization_id, last_name, first_name, middle_name, suffix,
                preferred_name, date_of_birth, gender, ssn_last_four, mrn,
                email, phone_home, phone_mobile, phone_work,
                address_line1, address_line2, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                insurance_carrier, insurance_policy_number, insurance_group_number,
                status, deceased_date, primary_provider_id, primary_location_id,
                mumps_data, request_id, created_by, updated_by, system_id
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                $29, $30, $31, $32, $33, $34, $35, $36
            )
            RETURNING *
            "#,
        )
        .bind(patient.id)
        .bind(patient.organization_id)
        .bind(&patient.last_name)
        .bind(&patient.first_name)
        .bind(&patient.middle_name)
        .bind(&patient.suffix)
        .bind(&patient.preferred_name)
        .bind(patient.date_of_birth)
        .bind(gender)
        .bind(&patient.ssn_last_four)
        .bind(&patient.mrn)
        .bind(&patient.email)
        .bind(&patient.phone_home)
        .bind(&patient.phone_mobile)
        .bind(&patient.phone_work)
        .bind(&patient.address_line1)
        .bind(&patient.address_line2)
        .bind(&patient.city)
        .bind(&patient.state)
        .bind(&patient.zip_code)
        .bind(&patient.country)
        .bind(&patient.emergency_contact_name)
        .bind(&patient.emergency_contact_phone)
        .bind(&patient.emergency_contact_relationship)
        .bind(&patient.insurance_carrier)
        .bind(&patient.insurance_policy_number)
        .bind(&patient.insurance_group_number)
        .bind(status)
        .bind(patient.deceased_date)
        .bind(patient.primary_provider_id)
        .bind(patient.primary_location_id)
        .bind(&patient.mumps_data)
        .bind(&patient.request_id)
        .bind(patient.created_by)
        .bind(patient.updated_by)
        .bind(&patient.system_id)
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("query", "record")?;

        Ok(row.into())
    }

    async fn find_by_id(&self, id: Uuid, organization_id: Uuid) -> AppResult<Option<EhrPatient>> {
        let row: Option<EhrPatientRow> = sqlx::query_as(
            r#"
            SELECT * FROM ehr_patients
            WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
            "#,
        )
        .bind(id)
        .bind(organization_id)
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("query", "record")?;

        Ok(row.map(Into::into))
    }

    async fn find_by_ien(&self, ien: i64, organization_id: Uuid) -> AppResult<Option<EhrPatient>> {
        let row: Option<EhrPatientRow> = sqlx::query_as(
            r#"
            SELECT * FROM ehr_patients
            WHERE ien = $1 AND organization_id = $2 AND deleted_at IS NULL
            "#,
        )
        .bind(ien)
        .bind(organization_id)
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("query", "record")?;

        Ok(row.map(Into::into))
    }

    async fn find_by_mrn(&self, mrn: &str, organization_id: Uuid) -> AppResult<Option<EhrPatient>> {
        let row: Option<EhrPatientRow> = sqlx::query_as(
            r#"
            SELECT * FROM ehr_patients
            WHERE mrn = $1 AND organization_id = $2 AND deleted_at IS NULL
            "#,
        )
        .bind(mrn)
        .bind(organization_id)
        .fetch_optional(self.database_service.pool())
        .await
        .map_db_error("query", "record")?;

        Ok(row.map(Into::into))
    }

    async fn update(&self, patient: EhrPatient) -> AppResult<EhrPatient> {
        let gender = Self::gender_to_string(&patient.gender);
        let status = Self::status_to_string(&patient.status);

        let row: EhrPatientRow = sqlx::query_as(
            r#"
            UPDATE ehr_patients SET
                last_name = $3, first_name = $4, middle_name = $5, suffix = $6,
                preferred_name = $7, date_of_birth = $8, gender = $9, ssn_last_four = $10,
                email = $11, phone_home = $12, phone_mobile = $13, phone_work = $14,
                address_line1 = $15, address_line2 = $16, city = $17, state = $18,
                zip_code = $19, country = $20,
                emergency_contact_name = $21, emergency_contact_phone = $22,
                emergency_contact_relationship = $23,
                insurance_carrier = $24, insurance_policy_number = $25, insurance_group_number = $26,
                status = $27, deceased_date = $28,
                primary_provider_id = $29, primary_location_id = $30,
                mumps_data = $31, updated_by = $32, updated_at = NOW(),
                version = version + 1
            WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
            RETURNING *
            "#,
        )
        .bind(patient.id)
        .bind(patient.organization_id)
        .bind(&patient.last_name)
        .bind(&patient.first_name)
        .bind(&patient.middle_name)
        .bind(&patient.suffix)
        .bind(&patient.preferred_name)
        .bind(patient.date_of_birth)
        .bind(gender)
        .bind(&patient.ssn_last_four)
        .bind(&patient.email)
        .bind(&patient.phone_home)
        .bind(&patient.phone_mobile)
        .bind(&patient.phone_work)
        .bind(&patient.address_line1)
        .bind(&patient.address_line2)
        .bind(&patient.city)
        .bind(&patient.state)
        .bind(&patient.zip_code)
        .bind(&patient.country)
        .bind(&patient.emergency_contact_name)
        .bind(&patient.emergency_contact_phone)
        .bind(&patient.emergency_contact_relationship)
        .bind(&patient.insurance_carrier)
        .bind(&patient.insurance_policy_number)
        .bind(&patient.insurance_group_number)
        .bind(status)
        .bind(patient.deceased_date)
        .bind(patient.primary_provider_id)
        .bind(patient.primary_location_id)
        .bind(&patient.mumps_data)
        .bind(patient.updated_by)
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("query", "record")?;

        Ok(row.into())
    }

    async fn delete(&self, id: Uuid, organization_id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE ehr_patients SET deleted_at = NOW()
            WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
            "#,
        )
        .bind(id)
        .bind(organization_id)
        .execute(self.database_service.pool())
        .await
        .map_db_error("query", "record")?;

        Ok(())
    }

    async fn search(
        &self,
        organization_id: Uuid,
        criteria: PatientSearchCriteria,
        pagination: Pagination,
    ) -> AppResult<PaginatedResult<EhrPatient>> {
        // Build dynamic WHERE clause
        let mut conditions: Vec<String> = vec![
            "organization_id = $1".to_string(),
            "deleted_at IS NULL".to_string(),
        ];
        let mut param_idx = 2;

        if criteria.name.is_some() {
            conditions.push("(last_name ILIKE $2 OR first_name ILIKE $2)".to_string());
            param_idx = 3;
        }
        if criteria.mrn.is_some() {
            conditions.push(format!("mrn = ${}", param_idx));
            param_idx += 1;
        }
        if criteria.date_of_birth.is_some() {
            conditions.push(format!("date_of_birth = ${}", param_idx));
            param_idx += 1;
        }
        if criteria.status.is_some() {
            conditions.push(format!("status = ${}", param_idx));
        }

        let where_clause = conditions.join(" AND ");
use crate::infrastructure::database::RepositoryErrorExt;

        // Count query
        let count_sql = format!(
            "SELECT COUNT(*) FROM ehr_patients WHERE {}",
            where_clause
        );

        let mut count_query = sqlx::query_scalar(&count_sql)
            .bind(organization_id);

        if let Some(ref name) = criteria.name {
            count_query = count_query.bind(format!("%{}%", name));
        }
        if let Some(ref mrn) = criteria.mrn {
            count_query = count_query.bind(mrn);
        }
        if let Some(dob) = criteria.date_of_birth {
            count_query = count_query.bind(dob);
        }
        if let Some(ref status) = criteria.status {
            count_query = count_query.bind(Self::status_to_string(status));
        }

        let total: i64 = count_query
            .fetch_one(self.database_service.pool())
            .await
            .map_db_error("query", "record")?;

        // Data query
        let data_sql = format!(
            "SELECT * FROM ehr_patients WHERE {} ORDER BY last_name, first_name LIMIT {} OFFSET {}",
            where_clause, pagination.limit, pagination.offset
        );

        let mut data_query = sqlx::query_as::<_, EhrPatientRow>(&data_sql)
            .bind(organization_id);

        if let Some(ref name) = criteria.name {
            data_query = data_query.bind(format!("%{}%", name));
        }
        if let Some(ref mrn) = criteria.mrn {
            data_query = data_query.bind(mrn);
        }
        if let Some(dob) = criteria.date_of_birth {
            data_query = data_query.bind(dob);
        }
        if let Some(ref status) = criteria.status {
            data_query = data_query.bind(Self::status_to_string(status));
        }

        let rows: Vec<EhrPatientRow> = data_query
            .fetch_all(self.database_service.pool())
            .await
            .map_db_error("query", "record")?;

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
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM ehr_patients WHERE organization_id = $1 AND deleted_at IS NULL",
        )
        .bind(organization_id)
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("query", "record")?;

        Ok(count.0)
    }

    async fn next_ien(&self, organization_id: Uuid) -> AppResult<i64> {
        let result: (i64,) = sqlx::query_as(
            r#"
            SELECT COALESCE(MAX(ien), 0) + 1 FROM ehr_patients
            WHERE organization_id = $1
            "#,
        )
        .bind(organization_id)
        .fetch_one(self.database_service.pool())
        .await
        .map_db_error("query", "record")?;

        Ok(result.0)
    }
}
