//! Application Services

pub mod ehr_service;
pub mod rules_engine;
pub mod workflow_engine;
pub mod connectors;

pub use ehr_service::{
    EhrService, SharedEhrService,
    EhrPatientDto, EhrProblemDto, EhrAllergyDto,
    CreatePatientDto, CreateProblemDto, CreateAllergyDto,
};

pub use rules_engine::{
    RulesEngine, SharedRulesEngine, create_shared_rules_engine,
    DecisionRule, RuleCategory, RuleContext, RuleResult,
    JurisdictionContext, ServiceContext, PatientContext, UserContext,
    TaxResult, TaxComponent, DrugScheduleResult, ClinicalAlert, WorkflowDecision,
};

pub use workflow_engine::{
    WorkflowEngine, SharedWorkflowEngine,
    create_shared_workflow_engine, create_workflow_engine_with_rules,
    WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeType, NodeConfig,
    WorkflowInstance, WorkflowStatus, ExecutionStep,
    HumanTask, TaskStatus, EscalationConfig,
};
