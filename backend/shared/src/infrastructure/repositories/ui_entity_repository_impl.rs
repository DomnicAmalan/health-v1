use crate::domain::entities::{UiPage, UiButton, UiField, UiApiEndpoint};
use crate::domain::repositories::UiEntityRepository;
use crate::shared::AppResult;
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;
use crate::infrastructure::database::RepositoryErrorExt;

pub struct UiEntityRepositoryImpl {
    pool: PgPool,
}

impl UiEntityRepositoryImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UiEntityRepository for UiEntityRepositoryImpl {
    // Page methods
    async fn register_page(&self, page: UiPage) -> AppResult<UiPage> {
        sqlx::query_as!(
            UiPage,
            r#"
            INSERT INTO ui_pages (id, name, path, description, metadata, created_at, updated_at,
                                  deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, name, path, description, metadata as "metadata!", created_at, updated_at,
                      deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            "#,
            page.id,
            &page.name,
            &page.path,
            page.description.as_deref(),
            &page.metadata,
            page.created_at,
            page.updated_at,
            page.deleted_at,
            page.deleted_by,
            page.request_id.as_deref(),
            page.created_by,
            page.updated_by,
            page.system_id.as_deref(),
            page.version
        )
        .fetch_one(&self.pool)
        .await
        .map_db_error("insert", "ui_page")
    }

    async fn find_page_by_id(&self, id: Uuid) -> AppResult<Option<UiPage>> {
        sqlx::query_as!(
            UiPage,
            r#"
            SELECT id, name, path, description, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_pages
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_page")
    }

    async fn find_page_by_name(&self, name: &str) -> AppResult<Option<UiPage>> {
        sqlx::query_as!(
            UiPage,
            r#"
            SELECT id, name, path, description, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_pages
            WHERE name = $1 AND deleted_at IS NULL
            "#,
            name
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_page")
    }

    async fn find_page_by_path(&self, path: &str) -> AppResult<Option<UiPage>> {
        sqlx::query_as!(
            UiPage,
            r#"
            SELECT id, name, path, description, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_pages
            WHERE path = $1 AND deleted_at IS NULL
            "#,
            path
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_page")
    }

    async fn list_pages(&self) -> AppResult<Vec<UiPage>> {
        sqlx::query_as!(
            UiPage,
            r#"
            SELECT id, name, path, description, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_pages
            WHERE deleted_at IS NULL
            ORDER BY name
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_db_error("fetch_all", "ui_page")
    }

    async fn update_page(&self, page: UiPage) -> AppResult<UiPage> {
        sqlx::query_as!(
            UiPage,
            r#"
            UPDATE ui_pages
            SET name = $2, path = $3, description = $4, metadata = $5, updated_at = $6,
                deleted_at = $7, deleted_by = $8, request_id = $9, updated_by = $10,
                system_id = $11, version = $12
            WHERE id = $1
            RETURNING id, name, path, description, metadata as "metadata!", created_at, updated_at,
                      deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            "#,
            page.id,
            &page.name,
            &page.path,
            page.description.as_deref(),
            &page.metadata,
            page.updated_at,
            page.deleted_at,
            page.deleted_by,
            page.request_id.as_deref(),
            page.updated_by,
            page.system_id.as_deref(),
            page.version
        )
        .fetch_one(&self.pool)
        .await
        .map_db_error("update", "ui_page")
    }

    async fn soft_delete_page(&self, id: Uuid, deleted_by: Option<Uuid>) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE ui_pages
            SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), version = version + 1
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            id,
            deleted_by
        )
        .execute(&self.pool)
        .await
        .map_db_error("delete", "ui_page")?;
        Ok(())
    }

    // Button methods
    async fn register_button(&self, button: UiButton) -> AppResult<UiButton> {
        sqlx::query_as!(
            UiButton,
            r#"
            INSERT INTO ui_buttons (id, page_id, button_id, label, action, metadata, created_at, updated_at,
                                    deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, page_id as "page_id!", button_id, label, action, metadata as "metadata!", created_at, updated_at,
                      deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            "#,
            button.id,
            button.page_id,
            &button.button_id,
            &button.label,
            button.action.as_deref(),
            &button.metadata,
            button.created_at,
            button.updated_at,
            button.deleted_at,
            button.deleted_by,
            button.request_id.as_deref(),
            button.created_by,
            button.updated_by,
            button.system_id.as_deref(),
            button.version
        )
        .fetch_one(&self.pool)
        .await
        .map_db_error("insert", "ui_button")
    }

    async fn find_button_by_id(&self, id: Uuid) -> AppResult<Option<UiButton>> {
        sqlx::query_as!(
            UiButton,
            r#"
            SELECT id, page_id as "page_id!", button_id, label, action, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_buttons
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_button")
    }

    async fn find_button_by_page_and_id(&self, page_id: Uuid, button_id: &str) -> AppResult<Option<UiButton>> {
        sqlx::query_as!(
            UiButton,
            r#"
            SELECT id, page_id as "page_id!", button_id, label, action, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_buttons
            WHERE page_id = $1 AND button_id = $2 AND deleted_at IS NULL
            "#,
            page_id,
            button_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_button")
    }

    async fn list_buttons_for_page(&self, page_id: Uuid) -> AppResult<Vec<UiButton>> {
        sqlx::query_as!(
            UiButton,
            r#"
            SELECT id, page_id as "page_id!", button_id, label, action, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_buttons
            WHERE page_id = $1 AND deleted_at IS NULL
            ORDER BY label
            "#,
            page_id
        )
        .fetch_all(&self.pool)
        .await
        .map_db_error("fetch_all", "ui_button")
    }

    async fn update_button(&self, button: UiButton) -> AppResult<UiButton> {
        sqlx::query_as!(
            UiButton,
            r#"
            UPDATE ui_buttons
            SET page_id = $2, button_id = $3, label = $4, action = $5, metadata = $6, updated_at = $7,
                deleted_at = $8, deleted_by = $9, request_id = $10, updated_by = $11,
                system_id = $12, version = $13
            WHERE id = $1
            RETURNING id, page_id as "page_id!", button_id, label, action, metadata as "metadata!", created_at, updated_at,
                      deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            "#,
            button.id,
            button.page_id,
            &button.button_id,
            &button.label,
            button.action.as_deref(),
            &button.metadata,
            button.updated_at,
            button.deleted_at,
            button.deleted_by,
            button.request_id.as_deref(),
            button.updated_by,
            button.system_id.as_deref(),
            button.version
        )
        .fetch_one(&self.pool)
        .await
        .map_db_error("update", "ui_button")
    }

    async fn soft_delete_button(&self, id: Uuid, deleted_by: Option<Uuid>) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE ui_buttons
            SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), version = version + 1
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            id,
            deleted_by
        )
        .execute(&self.pool)
        .await
        .map_db_error("delete", "ui_button")?;
        Ok(())
    }

    // Field methods
    async fn register_field(&self, field: UiField) -> AppResult<UiField> {
        sqlx::query_as!(
            UiField,
            r#"
            INSERT INTO ui_fields (id, page_id, field_id, label, field_type, metadata, created_at, updated_at,
                                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, page_id as "page_id!", field_id, label, field_type, metadata as "metadata!", created_at, updated_at,
                      deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            "#,
            field.id,
            field.page_id,
            &field.field_id,
            &field.label,
            &field.field_type,
            &field.metadata,
            field.created_at,
            field.updated_at,
            field.deleted_at,
            field.deleted_by,
            field.request_id.as_deref(),
            field.created_by,
            field.updated_by,
            field.system_id.as_deref(),
            field.version
        )
        .fetch_one(&self.pool)
        .await
        .map_db_error("insert", "ui_field")
    }

    async fn find_field_by_id(&self, id: Uuid) -> AppResult<Option<UiField>> {
        sqlx::query_as!(
            UiField,
            r#"
            SELECT id, page_id as "page_id!", field_id, label, field_type, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_fields
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_field")
    }

    async fn find_field_by_page_and_id(&self, page_id: Uuid, field_id: &str) -> AppResult<Option<UiField>> {
        sqlx::query_as!(
            UiField,
            r#"
            SELECT id, page_id as "page_id!", field_id, label, field_type, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_fields
            WHERE page_id = $1 AND field_id = $2 AND deleted_at IS NULL
            "#,
            page_id,
            field_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_field")
    }

    async fn list_fields_for_page(&self, page_id: Uuid) -> AppResult<Vec<UiField>> {
        sqlx::query_as!(
            UiField,
            r#"
            SELECT id, page_id as "page_id!", field_id, label, field_type, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_fields
            WHERE page_id = $1 AND deleted_at IS NULL
            ORDER BY label
            "#,
            page_id
        )
        .fetch_all(&self.pool)
        .await
        .map_db_error("fetch_all", "ui_field")
    }

    async fn update_field(&self, field: UiField) -> AppResult<UiField> {
        sqlx::query_as!(
            UiField,
            r#"
            UPDATE ui_fields
            SET page_id = $2, field_id = $3, label = $4, field_type = $5, metadata = $6, updated_at = $7,
                deleted_at = $8, deleted_by = $9, request_id = $10, updated_by = $11,
                system_id = $12, version = $13
            WHERE id = $1
            RETURNING id, page_id as "page_id!", field_id, label, field_type, metadata as "metadata!", created_at, updated_at,
                      deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            "#,
            field.id,
            field.page_id,
            &field.field_id,
            &field.label,
            &field.field_type,
            &field.metadata,
            field.updated_at,
            field.deleted_at,
            field.deleted_by,
            field.request_id.as_deref(),
            field.updated_by,
            field.system_id.as_deref(),
            field.version
        )
        .fetch_one(&self.pool)
        .await
        .map_db_error("update", "ui_field")
    }

    async fn soft_delete_field(&self, id: Uuid, deleted_by: Option<Uuid>) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE ui_fields
            SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), version = version + 1
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            id,
            deleted_by
        )
        .execute(&self.pool)
        .await
        .map_db_error("delete", "ui_field")?;
        Ok(())
    }

    // API endpoint methods
    async fn register_api(&self, api: UiApiEndpoint) -> AppResult<UiApiEndpoint> {
        sqlx::query_as!(
            UiApiEndpoint,
            r#"
            INSERT INTO ui_api_endpoints (id, endpoint, method, description, metadata, created_at, updated_at,
                                           deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, endpoint, method, description, metadata as "metadata!", created_at, updated_at,
                      deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            "#,
            api.id,
            &api.endpoint,
            &api.method,
            api.description.as_deref(),
            &api.metadata,
            api.created_at,
            api.updated_at,
            api.deleted_at,
            api.deleted_by,
            api.request_id.as_deref(),
            api.created_by,
            api.updated_by,
            api.system_id.as_deref(),
            api.version
        )
        .fetch_one(&self.pool)
        .await
        .map_db_error("insert", "ui_api_endpoint")
    }

    async fn find_api_by_id(&self, id: Uuid) -> AppResult<Option<UiApiEndpoint>> {
        sqlx::query_as!(
            UiApiEndpoint,
            r#"
            SELECT id, endpoint, method, description, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_api_endpoints
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_api_endpoint")
    }

    async fn find_api_by_endpoint_and_method(&self, endpoint: &str, method: &str) -> AppResult<Option<UiApiEndpoint>> {
        sqlx::query_as!(
            UiApiEndpoint,
            r#"
            SELECT id, endpoint, method, description, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_api_endpoints
            WHERE endpoint = $1 AND method = $2 AND deleted_at IS NULL
            "#,
            endpoint,
            method
        )
        .fetch_optional(&self.pool)
        .await
        .map_db_error("fetch", "ui_api_endpoint")
    }

    async fn list_apis(&self) -> AppResult<Vec<UiApiEndpoint>> {
        sqlx::query_as!(
            UiApiEndpoint,
            r#"
            SELECT id, endpoint, method, description, metadata as "metadata!", created_at, updated_at,
                   deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            FROM ui_api_endpoints
            WHERE deleted_at IS NULL
            ORDER BY method, endpoint
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_db_error("fetch_all", "ui_api_endpoint")
    }

    async fn update_api(&self, api: UiApiEndpoint) -> AppResult<UiApiEndpoint> {
        sqlx::query_as!(
            UiApiEndpoint,
            r#"
            UPDATE ui_api_endpoints
            SET endpoint = $2, method = $3, description = $4, metadata = $5, updated_at = $6,
                deleted_at = $7, deleted_by = $8, request_id = $9, updated_by = $10,
                system_id = $11, version = $12
            WHERE id = $1
            RETURNING id, endpoint, method, description, metadata as "metadata!", created_at, updated_at,
                      deleted_at, deleted_by, request_id, created_by, updated_by, system_id, version
            "#,
            api.id,
            &api.endpoint,
            &api.method,
            api.description.as_deref(),
            &api.metadata,
            api.updated_at,
            api.deleted_at,
            api.deleted_by,
            api.request_id.as_deref(),
            api.updated_by,
            api.system_id.as_deref(),
            api.version
        )
        .fetch_one(&self.pool)
        .await
        .map_db_error("update", "ui_api_endpoint")
    }

    async fn soft_delete_api(&self, id: Uuid, deleted_by: Option<Uuid>) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE ui_api_endpoints
            SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), version = version + 1
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            id,
            deleted_by
        )
        .execute(&self.pool)
        .await
        .map_db_error("delete", "ui_api_endpoint")?;
        Ok(())
    }
}
