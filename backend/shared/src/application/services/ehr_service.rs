//! EHR Service - Orchestrates EHR operations using YottaDB
//!
//! This service provides high-level EHR operations that use YottaDB
//! for MUMPS-style hierarchical storage while maintaining PostgreSQL
//! for relational queries and indexing.

use std::sync::Arc;

use crate::infrastructure::database::mumps::{YottaDbAdapter, Global, HierarchicalAccess};
use crate::shared::{AppError, AppResult};

/// EHR Service for clinical data management
pub struct EhrService {
    yottadb: Arc<YottaDbAdapter>,
}

impl EhrService {
    /// Create new EHR service
    pub fn new(yottadb: Arc<YottaDbAdapter>) -> Self {
        Self { yottadb }
    }

    /// Create from environment
    pub fn from_env() -> Self {
        let yottadb = Arc::new(YottaDbAdapter::from_env());
        Self { yottadb }
    }

    // === Patient Operations ===

    /// List all patients
    pub async fn list_patients(&self, limit: usize, offset: usize) -> AppResult<Vec<EhrPatientDto>> {
        let patients = self.yottadb.list_patients(limit + offset).await?;

        Ok(patients
            .into_iter()
            .skip(offset)
            .take(limit)
            .map(|p| EhrPatientDto::from_yottadb(p))
            .collect())
    }

    /// Get patient by IEN
    pub async fn get_patient_by_ien(&self, ien: i64) -> AppResult<Option<EhrPatientDto>> {
        let patient = self.yottadb.get_patient(ien).await?;
        Ok(patient.map(EhrPatientDto::from_yottadb))
    }

    /// Create new patient in YottaDB
    pub async fn create_patient(&self, request: CreatePatientDto) -> AppResult<EhrPatientDto> {
        use crate::infrastructure::database::mumps::PatientData;

        // Format name as VistA style: LAST,FIRST
        let name = format!("{},{}", request.last_name.to_uppercase(), request.first_name.to_uppercase());

        let patient_data = PatientData {
            ien: 0, // Will be assigned by YottaDB
            name,
            sex: request.sex.chars().next().unwrap_or('U').to_string(),
            dob: request.date_of_birth,
            ssn: request.ssn.unwrap_or_default(),
        };

        let ien = self.yottadb.create_patient(&patient_data).await?;

        // Fetch the created patient
        let patient = self.yottadb.get_patient(ien).await?
            .ok_or_else(|| AppError::Internal("Failed to fetch created patient".to_string()))?;

        Ok(EhrPatientDto::from_yottadb(patient))
    }

    /// Search patients by name
    pub async fn search_patients(&self, query: &str, limit: usize) -> AppResult<Vec<EhrPatientDto>> {
        // Use B index for name lookup
        let search_upper = query.to_uppercase();
        let mut results = Vec::new();
        let mut name = String::new();

        // $ORDER through B index
        loop {
            let global = Global::new("DPT".to_string())
                .with_subscript("B".to_string())
                .with_subscript(name.clone());

            let next = self.yottadb.order_next(&global).await?;
            match next {
                Some(n) => {
                    name = n.clone();
                    if !name.to_uppercase().starts_with(&search_upper) {
                        if name.to_uppercase() > search_upper {
                            break;
                        }
                        continue;
                    }

                    // Get IENs for this name
                    let mut ien_str = String::new();
                    loop {
                        let ien_global = Global::new("DPT".to_string())
                            .with_subscript("B".to_string())
                            .with_subscript(name.clone())
                            .with_subscript(ien_str.clone());

                        let next_ien = self.yottadb.order_next(&ien_global).await?;
                        match next_ien {
                            Some(i) => {
                                ien_str = i.clone();
                                if let Ok(ien) = ien_str.parse::<i64>() {
                                    if let Some(patient) = self.yottadb.get_patient(ien).await? {
                                        results.push(EhrPatientDto::from_yottadb(patient));
                                        if results.len() >= limit {
                                            return Ok(results);
                                        }
                                    }
                                }
                            }
                            None => break,
                        }
                    }
                }
                None => break,
            }
        }

        Ok(results)
    }

    // === Problem Operations ===

    /// Get problems for patient
    pub async fn get_patient_problems(&self, patient_ien: i64) -> AppResult<Vec<EhrProblemDto>> {
        let problems = self.yottadb.get_patient_problems(patient_ien).await?;
        Ok(problems.into_iter().map(EhrProblemDto::from_yottadb).collect())
    }

    /// Add problem to patient
    pub async fn add_problem(&self, request: CreateProblemDto) -> AppResult<EhrProblemDto> {
        // Get next IEN for problem
        let counter = Global::new("AUPNPROB".to_string())
            .with_subscript("0".to_string());

        let header = self.yottadb.get(&counter).await?
            .unwrap_or_else(|| "PROBLEM^9000011^0^0".to_string());

        let parts: Vec<&str> = header.split('^').collect();
        let last_ien: i64 = parts.get(2)
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let new_ien = last_ien + 1;

        // Store problem data
        let problem_global = Global::new("AUPNPROB".to_string())
            .with_subscript(new_ien.to_string())
            .with_subscript("0".to_string());

        let onset = request.onset_date.unwrap_or_default();
        let value = format!(
            "{}^{}^{}^{}^{}^{}",
            request.diagnosis,
            request.patient_ien,
            request.icd_code.unwrap_or_default(),
            request.snomed_code.unwrap_or_default(),
            onset,
            "A" // Active status
        );
        self.yottadb.set(&problem_global, &value).await?;

        // Add to C index (by patient)
        let index = Global::new("AUPNPROB".to_string())
            .with_subscript("C".to_string())
            .with_subscript(request.patient_ien.to_string())
            .with_subscript(new_ien.to_string());
        self.yottadb.set(&index, "").await?;

        // Update counter
        let new_header = format!("PROBLEM^9000011^{}^{}", new_ien, new_ien);
        self.yottadb.set(&counter, &new_header).await?;

        // Return created problem
        let problem = self.yottadb.get_problem(new_ien).await?
            .ok_or_else(|| AppError::Internal("Failed to fetch created problem".to_string()))?;

        Ok(EhrProblemDto::from_yottadb(problem))
    }

    // === Allergy Operations ===

    /// Get allergies for patient
    pub async fn get_patient_allergies(&self, patient_ien: i64) -> AppResult<Vec<EhrAllergyDto>> {
        let allergies = self.yottadb.get_patient_allergies(patient_ien).await?;
        Ok(allergies.into_iter().map(EhrAllergyDto::from_yottadb).collect())
    }

    /// Add allergy to patient
    pub async fn add_allergy(&self, request: CreateAllergyDto) -> AppResult<EhrAllergyDto> {
        // Get next IEN for allergy
        let counter = Global::new("GMRA".to_string())
            .with_subscript("0".to_string());

        let header = self.yottadb.get(&counter).await?
            .unwrap_or_else(|| "ALLERGY^120.8^0^0".to_string());

        let parts: Vec<&str> = header.split('^').collect();
        let last_ien: i64 = parts.get(2)
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let new_ien = last_ien + 1;

        // Store allergy data
        let allergy_global = Global::new("GMRA".to_string())
            .with_subscript(new_ien.to_string())
            .with_subscript("0".to_string());

        let value = format!(
            "{}^{}^{}^{}^{}^A",
            request.allergen,
            request.patient_ien,
            request.allergy_type,
            request.severity.unwrap_or_else(|| "MO".to_string()),
            request.reactions.unwrap_or_default()
        );
        self.yottadb.set(&allergy_global, &value).await?;

        // Add to C index (by patient)
        let index = Global::new("GMRA".to_string())
            .with_subscript("C".to_string())
            .with_subscript(request.patient_ien.to_string())
            .with_subscript(new_ien.to_string());
        self.yottadb.set(&index, "").await?;

        // Update counter
        let new_header = format!("ALLERGY^120.8^{}^{}", new_ien, new_ien);
        self.yottadb.set(&counter, &new_header).await?;

        // Return created allergy
        let allergy = self.yottadb.get_allergy(new_ien).await?
            .ok_or_else(|| AppError::Internal("Failed to fetch created allergy".to_string()))?;

        Ok(EhrAllergyDto::from_yottadb(allergy))
    }

    // === Direct Global Access ===

    /// Direct MUMPS $GET
    pub async fn global_get(&self, global_ref: &str) -> AppResult<Option<String>> {
        let global = Global::from_string(global_ref)
            .map_err(|e| AppError::Validation(e))?;
        self.yottadb.get(&global).await
    }

    /// Direct MUMPS SET
    pub async fn global_set(&self, global_ref: &str, value: &str) -> AppResult<()> {
        let global = Global::from_string(global_ref)
            .map_err(|e| AppError::Validation(e))?;
        self.yottadb.set(&global, value).await
    }

    /// Direct MUMPS KILL
    pub async fn global_kill(&self, global_ref: &str) -> AppResult<()> {
        let global = Global::from_string(global_ref)
            .map_err(|e| AppError::Validation(e))?;
        self.yottadb.kill(&global).await
    }

    /// Direct MUMPS $ORDER
    pub async fn global_order(&self, global_ref: &str) -> AppResult<Vec<String>> {
        let global = Global::from_string(global_ref)
            .map_err(|e| AppError::Validation(e))?;
        self.yottadb.order(&global).await
    }
}

// === DTOs ===

use serde::{Deserialize, Serialize};

/// Patient DTO for API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EhrPatientDto {
    pub ien: i64,
    pub name: String,
    pub first_name: String,
    pub last_name: String,
    pub sex: String,
    pub date_of_birth: String,
    pub ssn: Option<String>,
    pub mrn: Option<String>,
}

impl EhrPatientDto {
    fn from_yottadb(data: crate::infrastructure::database::mumps::PatientData) -> Self {
        // Parse VistA name format: LAST,FIRST
        let (last, first) = if let Some(pos) = data.name.find(',') {
            (data.name[..pos].to_string(), data.name[pos+1..].trim().to_string())
        } else {
            (data.name.clone(), String::new())
        };

        Self {
            ien: data.ien,
            name: data.name,
            first_name: first,
            last_name: last,
            sex: data.sex,
            date_of_birth: data.dob,
            ssn: if data.ssn.is_empty() { None } else { Some(data.ssn) },
            mrn: None, // Would need to fetch from separate field
        }
    }
}

/// Problem DTO for API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EhrProblemDto {
    pub ien: i64,
    pub diagnosis: String,
    pub patient_ien: i64,
    pub icd_code: Option<String>,
    pub onset_date: Option<String>,
    pub status: String,
}

impl EhrProblemDto {
    fn from_yottadb(data: crate::infrastructure::database::mumps::ProblemData) -> Self {
        Self {
            ien: data.ien,
            diagnosis: data.diagnosis,
            patient_ien: data.patient_ien,
            icd_code: if data.icd_code.is_empty() { None } else { Some(data.icd_code) },
            onset_date: if data.onset_date.is_empty() { None } else { Some(data.onset_date) },
            status: match data.status.as_str() {
                "A" => "active".to_string(),
                "I" => "inactive".to_string(),
                _ => data.status,
            },
        }
    }
}

/// Allergy DTO for API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EhrAllergyDto {
    pub ien: i64,
    pub allergen: String,
    pub patient_ien: i64,
    pub allergy_type: String,
    pub severity: String,
    pub reactions: Option<String>,
    pub status: String,
}

impl EhrAllergyDto {
    fn from_yottadb(data: crate::infrastructure::database::mumps::AllergyData) -> Self {
        Self {
            ien: data.ien,
            allergen: data.allergen,
            patient_ien: data.patient_ien,
            allergy_type: match data.allergy_type.as_str() {
                "D" => "drug".to_string(),
                "F" => "food".to_string(),
                "E" => "environmental".to_string(),
                "O" => "other".to_string(),
                _ => data.allergy_type,
            },
            severity: match data.severity.as_str() {
                "MI" => "mild".to_string(),
                "MO" => "moderate".to_string(),
                "SE" => "severe".to_string(),
                "LT" => "life_threatening".to_string(),
                _ => data.severity,
            },
            reactions: if data.reactions.is_empty() { None } else { Some(data.reactions) },
            status: match data.status.as_str() {
                "A" => "active".to_string(),
                "I" => "inactive".to_string(),
                "E" => "entered_in_error".to_string(),
                _ => data.status,
            },
        }
    }
}

/// Create patient request
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePatientDto {
    pub first_name: String,
    pub last_name: String,
    pub sex: String,
    pub date_of_birth: String,
    pub ssn: Option<String>,
    pub mrn: Option<String>,
}

/// Create problem request
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProblemDto {
    pub patient_ien: i64,
    pub diagnosis: String,
    pub icd_code: Option<String>,
    pub snomed_code: Option<String>,
    pub onset_date: Option<String>,
}

/// Create allergy request
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAllergyDto {
    pub patient_ien: i64,
    pub allergen: String,
    pub allergy_type: String,
    pub severity: Option<String>,
    pub reactions: Option<String>,
}

/// Shared EHR service instance
pub type SharedEhrService = Arc<EhrService>;
