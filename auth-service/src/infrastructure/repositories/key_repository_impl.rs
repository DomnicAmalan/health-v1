use crate::domain::entities::EncryptionKey;
use crate::domain::repositories::KeyRepository;
use crate::shared::AppResult;
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

pub struct KeyRepositoryImpl {
    pool: PgPool,
}

impl KeyRepositoryImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl KeyRepository for KeyRepositoryImpl {
    async fn create(&self, key: EncryptionKey) -> AppResult<EncryptionKey> {
        sqlx::query_as::<_, EncryptionKey>(
            r#"
            INSERT INTO encryption_keys (id, entity_id, entity_type, encrypted_key, nonce, key_algorithm, created_at, rotated_at, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, entity_id, entity_type, encrypted_key, nonce, key_algorithm, created_at, rotated_at, is_active
            "#
        )
        .bind(key.id)
        .bind(key.entity_id)
        .bind(&key.entity_type)
        .bind(&key.encrypted_key)
        .bind(&key.nonce)
        .bind(&key.key_algorithm)
        .bind(key.created_at)
        .bind(key.rotated_at)
        .bind(key.is_active)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))
    }

    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<EncryptionKey>> {
        sqlx::query_as::<_, EncryptionKey>(
            r#"
            SELECT id, entity_id, entity_type, encrypted_key, nonce, key_algorithm, created_at, rotated_at, is_active
            FROM encryption_keys
            WHERE id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))
    }

    async fn find_by_entity(&self, entity_id: Uuid, entity_type: &str) -> AppResult<Option<EncryptionKey>> {
        sqlx::query_as::<_, EncryptionKey>(
            r#"
            SELECT id, entity_id, entity_type, encrypted_key, nonce, key_algorithm, created_at, rotated_at, is_active
            FROM encryption_keys
            WHERE entity_id = $1 AND entity_type = $2
            ORDER BY created_at DESC
            LIMIT 1
            "#
        )
        .bind(entity_id)
        .bind(entity_type)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))
    }

    async fn find_active_by_entity(&self, entity_id: Uuid, entity_type: &str) -> AppResult<Option<EncryptionKey>> {
        sqlx::query_as::<_, EncryptionKey>(
            r#"
            SELECT id, entity_id, entity_type, encrypted_key, nonce, key_algorithm, created_at, rotated_at, is_active
            FROM encryption_keys
            WHERE entity_id = $1 AND entity_type = $2 AND is_active = true
            ORDER BY created_at DESC
            LIMIT 1
            "#
        )
        .bind(entity_id)
        .bind(entity_type)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))
    }

    async fn update(&self, key: EncryptionKey) -> AppResult<EncryptionKey> {
        sqlx::query_as::<_, EncryptionKey>(
            r#"
            UPDATE encryption_keys
            SET encrypted_key = $2, nonce = $3, key_algorithm = $4, rotated_at = $5, is_active = $6
            WHERE id = $1
            RETURNING id, entity_id, entity_type, encrypted_key, nonce, key_algorithm, created_at, rotated_at, is_active
            "#
        )
        .bind(key.id)
        .bind(&key.encrypted_key)
        .bind(&key.nonce)
        .bind(&key.key_algorithm)
        .bind(key.rotated_at)
        .bind(key.is_active)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))
    }

    async fn deactivate_all_for_entity(&self, entity_id: Uuid, entity_type: &str) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE encryption_keys
            SET is_active = false
            WHERE entity_id = $1 AND entity_type = $2 AND is_active = true
            "#
        )
        .bind(entity_id)
        .bind(entity_type)
        .execute(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;
        
        Ok(())
    }
}

