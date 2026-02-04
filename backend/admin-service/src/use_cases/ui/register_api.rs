use shared::domain::entities::UiApiEndpoint;
use shared::infrastructure::validation::validate_non_empty;
use shared::domain::repositories::UiEntityRepository;
use shared::infrastructure::validation::validate_non_empty;
use shared::infrastructure::zanzibar::RelationshipStore;
use shared::infrastructure::validation::validate_non_empty;
use shared::AppResult;
use shared::infrastructure::validation::validate_non_empty;
use std::sync::Arc;

pub struct RegisterApiUseCase {
    ui_entity_repository: Box<dyn UiEntityRepository>,
    #[allow(dead_code)]
    relationship_store: Arc<RelationshipStore>,
}

impl RegisterApiUseCase {
    pub fn new(
        ui_entity_repository: Box<dyn UiEntityRepository>,
        relationship_store: Arc<RelationshipStore>,
    ) -> Self {
        Self {
            ui_entity_repository,
            relationship_store,
        }
    }

    pub async fn execute(
        &self,
        endpoint: &str,
        method: &str,
        description: Option<String>,
    ) -> AppResult<UiApiEndpoint> {
        // ✨ DRY: Using validate_non_empty utility
        validate_non_empty(endpoint, "API endpoint")?;
        validate_non_empty(method, "HTTP method")?;

        // Validate HTTP method
        let method_upper = method.to_uppercase();
        if !["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].contains(&method_upper.as_str()) {
            return Err(shared::AppError::Validation(
                format!("Invalid HTTP method: {}", method)
            ));
        }

        // Check if API endpoint already exists
        if let Some(_existing) = self.ui_entity_repository
            .find_api_by_endpoint_and_method(endpoint, &method_upper)
            .await?
        {
            return Err(shared::AppError::Validation(
                format!("API endpoint {} {} already exists", method_upper, endpoint)
            ));
        }

        // Create API endpoint
        let api = UiApiEndpoint::new(
            endpoint.to_string(),
            method_upper,
            description,
        );

        let created_api = self.ui_entity_repository.register_api(api).await?;

        // Note: Default Zanzibar relationships for APIs can be created here if needed

        Ok(created_api)
    }
}

