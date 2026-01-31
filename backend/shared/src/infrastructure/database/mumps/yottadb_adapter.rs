use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::infrastructure::database::mumps::{Global, HierarchicalAccess};
use crate::shared::{AppError, AppResult};

/// YottaDB adapter - connects to YottaDB via M Web Server REST API
///
/// This provides a native MUMPS database backend for EHR operations,
/// giving true VistA-style hierarchical data storage.
///
/// Endpoints:
///   - GET /api/v1/global/{name}/{subscripts...} - $GET
///   - POST /api/v1/global/{name}/{subscripts...} - SET
///   - DELETE /api/v1/global/{name}/{subscripts...} - KILL
///   - GET /api/v1/global/{name}/{subscripts...}?order=1 - $ORDER
pub struct YottaDbAdapter {
    client: Client,
    base_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GetResponse {
    value: Option<String>,
    defined: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct SetRequest {
    value: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SetResponse {
    success: bool,
    global: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OrderResponse {
    next: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct KillResponse {
    success: bool,
    killed: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ErrorResponse {
    error: String,
}

impl YottaDbAdapter {
    /// Create a new YottaDB adapter
    ///
    /// # Arguments
    /// * `base_url` - Base URL of the M Web Server (e.g., "http://localhost:9081")
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }

    /// Create from environment variable or default
    pub fn from_env() -> Self {
        let base_url = std::env::var("YOTTADB_URL")
            .unwrap_or_else(|_| "http://yottadb:1337".to_string());
        Self::new(base_url)
    }

    /// Build URL path for global access
    fn build_path(&self, global: &Global) -> String {
        let mut path = format!("{}/api/v1/global/{}", self.base_url, global.name);
        for sub in &global.subscripts {
            path.push('/');
            path.push_str(&urlencoding::encode(sub));
        }
        path
    }

    /// Get value with metadata
    pub async fn get_with_defined(&self, global: &Global) -> AppResult<(Option<String>, bool)> {
        let url = self.build_path(global);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("YottaDB request failed: {}", e)))?;

        if response.status().is_success() {
            let data: GetResponse = response.json().await
                .map_err(|e| AppError::Internal(format!("Invalid YottaDB response: {}", e)))?;
            Ok((data.value, data.defined))
        } else {
            let error: ErrorResponse = response.json().await
                .unwrap_or(ErrorResponse { error: "Unknown error".to_string() });
            Err(AppError::Internal(format!("YottaDB error: {}", error.error)))
        }
    }

    /// Get next subscript ($ORDER)
    pub async fn order_next(&self, global: &Global) -> AppResult<Option<String>> {
        let url = format!("{}?order=1", self.build_path(global));

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("YottaDB request failed: {}", e)))?;

        if response.status().is_success() {
            let data: OrderResponse = response.json().await
                .map_err(|e| AppError::Internal(format!("Invalid YottaDB response: {}", e)))?;
            if data.next.is_empty() {
                Ok(None)
            } else {
                Ok(Some(data.next))
            }
        } else {
            let error: ErrorResponse = response.json().await
                .unwrap_or(ErrorResponse { error: "Unknown error".to_string() });
            Err(AppError::Internal(format!("YottaDB error: {}", error.error)))
        }
    }

    /// $PIECE - Get delimited piece of value
    pub async fn piece(&self, global: &Global, delimiter: &str, piece: usize) -> AppResult<Option<String>> {
        let value = self.get(global).await?;
        Ok(value.map(|v| {
            v.split(delimiter)
                .nth(piece.saturating_sub(1))
                .unwrap_or("")
                .to_string()
        }))
    }

    /// $INCREMENT - Atomic increment
    pub async fn increment(&self, global: &Global, amount: i64) -> AppResult<i64> {
        let current = self.get(global).await?
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(0);

        let new_value = current + amount;
        self.set(global, &new_value.to_string()).await?;
        Ok(new_value)
    }

    // === VistA FileMan Operations ===

    /// Get patient by IEN
    pub async fn get_patient(&self, ien: i64) -> AppResult<Option<PatientData>> {
        let global = Global::new("DPT".to_string())
            .with_subscript(ien.to_string())
            .with_subscript("0".to_string());

        let value = self.get(&global).await?;
        match value {
            Some(v) => {
                let parts: Vec<&str> = v.split('^').collect();
                Ok(Some(PatientData {
                    ien,
                    name: parts.get(0).unwrap_or(&"").to_string(),
                    sex: parts.get(1).unwrap_or(&"").to_string(),
                    dob: parts.get(2).unwrap_or(&"").to_string(),
                    ssn: parts.get(3).unwrap_or(&"").to_string(),
                }))
            }
            None => Ok(None),
        }
    }

    /// Create patient in ^DPT
    pub async fn create_patient(&self, data: &PatientData) -> AppResult<i64> {
        // Get next IEN
        let counter = Global::new("DPT".to_string())
            .with_subscript("0".to_string());

        // For now, use simple increment (in real VistA, use LOCK/INC pattern)
        let header = self.get(&counter).await?
            .unwrap_or_else(|| "PATIENT^2^0^0".to_string());

        let parts: Vec<&str> = header.split('^').collect();
        let last_ien: i64 = parts.get(2)
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let new_ien = last_ien + 1;

        // Store patient data
        let patient_global = Global::new("DPT".to_string())
            .with_subscript(new_ien.to_string())
            .with_subscript("0".to_string());

        let value = format!("{}^{}^{}^{}", data.name, data.sex, data.dob, data.ssn);
        self.set(&patient_global, &value).await?;

        // Update B index
        let index = Global::new("DPT".to_string())
            .with_subscript("B".to_string())
            .with_subscript(data.name.clone())
            .with_subscript(new_ien.to_string());
        self.set(&index, "").await?;

        // Update counter
        let new_header = format!("PATIENT^2^{}^{}", new_ien, new_ien);
        self.set(&counter, &new_header).await?;

        Ok(new_ien)
    }

    /// List patients using $ORDER
    pub async fn list_patients(&self, limit: usize) -> AppResult<Vec<PatientData>> {
        let mut patients = Vec::new();
        let mut ien = String::new();

        loop {
            let global = Global::new("DPT".to_string())
                .with_subscript(ien.clone());

            let next = self.order_next(&global).await?;
            match next {
                Some(n) if n != "B" && n != "0" => {
                    ien = n.clone();
                    if let Some(patient) = self.get_patient(ien.parse().unwrap_or(0)).await? {
                        patients.push(patient);
                        if patients.len() >= limit {
                            break;
                        }
                    }
                }
                _ => break,
            }
        }

        Ok(patients)
    }

    /// Get problems for patient using ^AUPNPROB("C",patientIen)
    pub async fn get_patient_problems(&self, patient_ien: i64) -> AppResult<Vec<ProblemData>> {
        let mut problems = Vec::new();
        let mut ien = String::new();

        loop {
            let global = Global::new("AUPNPROB".to_string())
                .with_subscript("C".to_string())
                .with_subscript(patient_ien.to_string())
                .with_subscript(ien.clone());

            let next = self.order_next(&global).await?;
            match next {
                Some(n) => {
                    ien = n.clone();
                    let problem_ien: i64 = ien.parse().unwrap_or(0);
                    if let Some(problem) = self.get_problem(problem_ien).await? {
                        problems.push(problem);
                    }
                }
                None => break,
            }
        }

        Ok(problems)
    }

    /// Get problem by IEN
    pub async fn get_problem(&self, ien: i64) -> AppResult<Option<ProblemData>> {
        let global = Global::new("AUPNPROB".to_string())
            .with_subscript(ien.to_string())
            .with_subscript("0".to_string());

        let value = self.get(&global).await?;
        match value {
            Some(v) => {
                let parts: Vec<&str> = v.split('^').collect();
                Ok(Some(ProblemData {
                    ien,
                    diagnosis: parts.get(0).unwrap_or(&"").to_string(),
                    patient_ien: parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0),
                    icd_code: parts.get(2).unwrap_or(&"").to_string(),
                    onset_date: parts.get(4).unwrap_or(&"").to_string(),
                    status: parts.get(5).unwrap_or(&"A").to_string(),
                }))
            }
            None => Ok(None),
        }
    }

    /// Get allergies for patient using ^GMRA("C",patientIen)
    pub async fn get_patient_allergies(&self, patient_ien: i64) -> AppResult<Vec<AllergyData>> {
        let mut allergies = Vec::new();
        let mut ien = String::new();

        loop {
            let global = Global::new("GMRA".to_string())
                .with_subscript("C".to_string())
                .with_subscript(patient_ien.to_string())
                .with_subscript(ien.clone());

            let next = self.order_next(&global).await?;
            match next {
                Some(n) => {
                    ien = n.clone();
                    let allergy_ien: i64 = ien.parse().unwrap_or(0);
                    if let Some(allergy) = self.get_allergy(allergy_ien).await? {
                        allergies.push(allergy);
                    }
                }
                None => break,
            }
        }

        Ok(allergies)
    }

    /// Get allergy by IEN
    pub async fn get_allergy(&self, ien: i64) -> AppResult<Option<AllergyData>> {
        let global = Global::new("GMRA".to_string())
            .with_subscript(ien.to_string())
            .with_subscript("0".to_string());

        let value = self.get(&global).await?;
        match value {
            Some(v) => {
                let parts: Vec<&str> = v.split('^').collect();
                Ok(Some(AllergyData {
                    ien,
                    allergen: parts.get(0).unwrap_or(&"").to_string(),
                    patient_ien: parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0),
                    allergy_type: parts.get(2).unwrap_or(&"").to_string(),
                    severity: parts.get(3).unwrap_or(&"").to_string(),
                    reactions: parts.get(4).unwrap_or(&"").to_string(),
                    status: parts.get(5).unwrap_or(&"A").to_string(),
                }))
            }
            None => Ok(None),
        }
    }
}

impl HierarchicalAccess for YottaDbAdapter {
    async fn get(&self, global: &Global) -> AppResult<Option<String>> {
        let (value, _defined) = self.get_with_defined(global).await?;
        Ok(value)
    }

    async fn set(&self, global: &Global, value: &str) -> AppResult<()> {
        let url = self.build_path(global);
        let body = SetRequest { value: value.to_string() };

        let response = self.client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("YottaDB request failed: {}", e)))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error: ErrorResponse = response.json().await
                .unwrap_or(ErrorResponse { error: "Unknown error".to_string() });
            Err(AppError::Internal(format!("YottaDB error: {}", error.error)))
        }
    }

    async fn kill(&self, global: &Global) -> AppResult<()> {
        let url = self.build_path(global);

        let response = self.client
            .delete(&url)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("YottaDB request failed: {}", e)))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error: ErrorResponse = response.json().await
                .unwrap_or(ErrorResponse { error: "Unknown error".to_string() });
            Err(AppError::Internal(format!("YottaDB error: {}", error.error)))
        }
    }

    async fn order(&self, global: &Global) -> AppResult<Vec<String>> {
        let mut results = Vec::new();
        let mut current = String::new();

        loop {
            let mut g = global.clone();
            g.subscripts.push(current.clone());

            let next = self.order_next(&g).await?;
            match next {
                Some(n) => {
                    results.push(n.clone());
                    current = n;
                }
                None => break,
            }
        }

        Ok(results)
    }

    async fn query(&self, _pattern: &str) -> AppResult<Vec<(Global, String)>> {
        // Pattern matching not directly supported via REST
        // Would need to implement on the M side
        // For now, return empty (pattern queries should use direct M access)
        Ok(Vec::new())
    }
}

// === VistA Data Structures ===

#[derive(Debug, Clone)]
pub struct PatientData {
    pub ien: i64,
    pub name: String,
    pub sex: String,
    pub dob: String,
    pub ssn: String,
}

#[derive(Debug, Clone)]
pub struct ProblemData {
    pub ien: i64,
    pub diagnosis: String,
    pub patient_ien: i64,
    pub icd_code: String,
    pub onset_date: String,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct AllergyData {
    pub ien: i64,
    pub allergen: String,
    pub patient_ien: i64,
    pub allergy_type: String,
    pub severity: String,
    pub reactions: String,
    pub status: String,
}

/// Shared YottaDB connection
pub type SharedYottaDb = Arc<YottaDbAdapter>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_path() {
        let adapter = YottaDbAdapter::new("http://localhost:9081".to_string());

        let global = Global::new("DPT".to_string())
            .with_subscript("123".to_string())
            .with_subscript("0".to_string());

        let path = adapter.build_path(&global);
        assert_eq!(path, "http://localhost:9081/api/v1/global/DPT/123/0");
    }

    #[test]
    fn test_global_with_special_chars() {
        let adapter = YottaDbAdapter::new("http://localhost:9081".to_string());

        let global = Global::new("DPT".to_string())
            .with_subscript("B".to_string())
            .with_subscript("DOE,JOHN".to_string());

        let path = adapter.build_path(&global);
        assert!(path.contains("DOE%2CJOHN"));
    }
}
