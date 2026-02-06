// Re-export AppState for handler modules
pub use super::AppState;

pub mod auth_handlers;
pub mod billing;
pub mod cds_handlers;
pub mod communications_handlers;
pub mod ehr;
pub mod opd_handlers;
pub mod service_handlers;
pub mod vault_handlers;
pub mod workflow_handlers;
pub mod worklist_handlers;

pub use auth_handlers::*;
pub use billing::*;
pub use cds_handlers::*;
pub use communications_handlers::*;
pub use ehr::*;
pub use opd_handlers::*;
pub use service_handlers::*;
pub use vault_handlers::*;
pub use workflow_handlers::*;
pub use worklist_handlers::*;

