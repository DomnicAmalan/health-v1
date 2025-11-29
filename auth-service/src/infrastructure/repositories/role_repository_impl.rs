use crate::domain::entities::Role;
use crate::domain::repositories::RoleRepository;
use crate::shared::AppResult;
use async_trait::async_trait;
use sqlx::{PgPool, Row};
use uuid::Uuid;
use chrono::Utc;

pub struct RoleRepositoryImpl {
    pool: PgPool,
}

impl RoleRepositoryImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl RoleRepository for RoleRepositoryImpl {
    async fn create(&self, mut role: Role) -> AppResult<Role> {
        let now = Utc::now();
        let role_id = role.id;
        
        // Insert role
        sqlx::query(
            r#"
            INSERT INTO roles (id, name, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            "#
        )
        .bind(role.id)
        .bind(&role.name)
        .bind(&role.description)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;

        // Insert permissions
        for permission_id in &role.permissions {
            sqlx::query(
                r#"
                INSERT INTO role_permissions (role_id, permission_id, created_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (role_id, permission_id) DO NOTHING
                "#
            )
            .bind(role_id)
            .bind(permission_id)
            .bind(now)
            .execute(&self.pool)
            .await
            .map_err(|e| crate::shared::AppError::Database(e))?;
        }

        Ok(role)
    }

    async fn find_by_id(&self, id: Uuid) -> AppResult<Option<Role>> {
        let row = sqlx::query(
            r#"
            SELECT id, name, description
            FROM roles
            WHERE id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;

        if let Some(row) = row {
            let role_id: Uuid = row.get("id");
            let permissions = self.get_role_permissions(role_id).await?;
            Ok(Some(Role {
                id: role_id,
                name: row.get("name"),
                description: row.get("description"),
                permissions,
            }))
        } else {
            Ok(None)
        }
    }

    async fn find_by_name(&self, name: &str) -> AppResult<Option<Role>> {
        let row = sqlx::query(
            r#"
            SELECT id, name, description
            FROM roles
            WHERE name = $1
            "#
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;

        if let Some(row) = row {
            let role_id: Uuid = row.try_get("id")
                .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                    index: "id".to_string(),
                    source: Box::new(e),
                }))?;
            let permissions = self.get_role_permissions(role_id).await?;
            Ok(Some(Role {
                id: role_id,
                name: row.try_get("name")
                    .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                        index: "name".to_string(),
                        source: Box::new(e),
                    }))?,
                description: row.try_get("description")
                    .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                        index: "description".to_string(),
                        source: Box::new(e),
                    }))?,
                permissions,
            }))
        } else {
            Ok(None)
        }
    }

    async fn list(&self) -> AppResult<Vec<Role>> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, description
            FROM roles
            ORDER BY name
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;

        let mut roles = Vec::new();
        for row in rows {
            let role_id: Uuid = row.try_get("id")
                .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                    index: "id".to_string(),
                    source: Box::new(e),
                }))?;
            let permissions = self.get_role_permissions(role_id).await?;
            roles.push(Role {
                id: role_id,
                name: row.try_get("name")
                    .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                        index: "name".to_string(),
                        source: Box::new(e),
                    }))?,
                description: row.try_get("description")
                    .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                        index: "description".to_string(),
                        source: Box::new(e),
                    }))?,
                permissions,
            });
        }

        Ok(roles)
    }

    async fn add_permission_to_role(&self, role_id: Uuid, permission_id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (role_id, permission_id) DO NOTHING
            "#
        )
        .bind(role_id)
        .bind(permission_id)
        .bind(Utc::now())
        .execute(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;
        
        Ok(())
    }

    async fn remove_permission_from_role(&self, role_id: Uuid, permission_id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            DELETE FROM role_permissions
            WHERE role_id = $1 AND permission_id = $2
            "#
        )
        .bind(role_id)
        .bind(permission_id)
        .execute(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;
        
        Ok(())
    }

    async fn get_role_permissions(&self, role_id: Uuid) -> AppResult<Vec<Uuid>> {
        let rows = sqlx::query(
            r#"
            SELECT permission_id
            FROM role_permissions
            WHERE role_id = $1
            ORDER BY created_at
            "#
        )
        .bind(role_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;

        Ok(rows.into_iter().map(|r| {
            r.try_get::<Uuid, _>("permission_id")
                .unwrap_or_else(|_| Uuid::nil())
        }).filter(|id| *id != Uuid::nil()).collect())
    }

    async fn get_user_roles(&self, user_id: Uuid) -> AppResult<Vec<Role>> {
        let rows = sqlx::query(
            r#"
            SELECT r.id, r.name, r.description
            FROM roles r
            INNER JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
            ORDER BY r.name
            "#
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| crate::shared::AppError::Database(e))?;

        let mut roles = Vec::new();
        for row in rows {
            let role_id: Uuid = row.try_get("id")
                .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                    index: "id".to_string(),
                    source: Box::new(e),
                }))?;
            let permissions = self.get_role_permissions(role_id).await?;
            roles.push(Role {
                id: role_id,
                name: row.try_get("name")
                    .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                        index: "name".to_string(),
                        source: Box::new(e),
                    }))?,
                description: row.try_get("description")
                    .map_err(|e| crate::shared::AppError::Database(sqlx::Error::ColumnDecode {
                        index: "description".to_string(),
                        source: Box::new(e),
                    }))?,
                permissions,
            });
        }

        Ok(roles)
    }
}

