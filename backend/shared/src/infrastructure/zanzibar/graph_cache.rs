use crate::infrastructure::zanzibar::graph_builder::AuthorizationGraph;
use crate::domain::repositories::RelationshipRepository;
use crate::shared::AppResult;
use std::sync::{Arc, RwLock};
use chrono::{DateTime, Utc, Duration};

/// Cache entry for authorization graph
#[allow(dead_code)]
struct CacheEntry {
    graph: Arc<AuthorizationGraph>, // Use Arc to avoid cloning the entire graph
    created_at: DateTime<Utc>, // Kept for future use (e.g., cache statistics)
    expires_at: DateTime<Utc>,
}

/// Graph cache manager
pub struct GraphCache {
    cache: Arc<RwLock<Option<CacheEntry>>>,
    ttl: Duration,
    enabled: bool,
}

impl GraphCache {
    pub fn new(ttl_seconds: i64, enabled: bool) -> Self {
        Self {
            cache: Arc::new(RwLock::new(None)),
            ttl: Duration::seconds(ttl_seconds),
            enabled,
        }
    }
    
    pub fn with_default_ttl() -> Self {
        Self::new(60, true) // 60 seconds default TTL, enabled by default
    }

    pub fn disabled() -> Self {
        Self::new(0, false)
    }
    
    /// Get graph from cache or build new one
    pub async fn get_or_build(
        &self,
        repository: &dyn RelationshipRepository,
    ) -> AppResult<Arc<AuthorizationGraph>> {
        // If cache is disabled, always build fresh
        if !self.enabled {
            return Ok(Arc::new(self.build_graph(repository).await?));
        }

        // Check cache
        {
            let cache = self.cache.read().unwrap();
            if let Some(entry) = cache.as_ref() {
                if Utc::now() < entry.expires_at {
                    return Ok(Arc::clone(&entry.graph));
                }
            }
        }
        
        // Cache miss or expired, build new graph
        let graph = Arc::new(self.build_graph(repository).await?);
        
        // Update cache
        {
            let mut cache = self.cache.write().unwrap();
            *cache = Some(CacheEntry {
                graph: Arc::clone(&graph),
                created_at: Utc::now(),
                expires_at: Utc::now() + self.ttl,
            });
        }
        
        Ok(graph)
    }
    
    /// Build graph from repository
    async fn build_graph(
        &self,
        repository: &dyn RelationshipRepository,
    ) -> AppResult<AuthorizationGraph> {
        // Build graph from all relationships in repository
        AuthorizationGraph::build_from_repository(repository).await
    }
    
    /// Build graph from relationships list
    pub fn build_from_relationships(relationships: Vec<crate::domain::entities::Relationship>) -> Arc<AuthorizationGraph> {
        Arc::new(AuthorizationGraph::build_from_relationships(relationships))
    }
    
    /// Invalidate cache
    pub fn invalidate(&self) {
        let mut cache = self.cache.write().unwrap();
        *cache = None;
    }
    
    /// Force refresh cache
    pub async fn refresh(
        &self,
        repository: &dyn RelationshipRepository,
    ) -> AppResult<Arc<AuthorizationGraph>> {
        self.invalidate();
        self.get_or_build(repository).await
    }
    
    /// Check if cache is valid
    pub fn is_valid(&self) -> bool {
        if !self.enabled {
            return false;
        }
        let cache = self.cache.read().unwrap();
        if let Some(entry) = cache.as_ref() {
            Utc::now() < entry.expires_at
        } else {
            false
        }
    }

    /// Check if cache is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }
    
    /// Get cached graph (if valid) without building
    pub fn get_cached(&self) -> Option<Arc<AuthorizationGraph>> {
        let cache = self.cache.read().unwrap();
        if let Some(entry) = cache.as_ref() {
            if Utc::now() < entry.expires_at {
                return Some(Arc::clone(&entry.graph));
            }
        }
        None
    }
}

