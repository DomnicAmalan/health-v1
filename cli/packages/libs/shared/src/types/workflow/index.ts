/**
 * Workflow Engine Types
 * Visual workflow designer and execution types
 */

// ============================================================================
// Node Types
// ============================================================================

/** Types of nodes in a workflow */
export type NodeType =
  | "start"
  | "end"
  | "action"
  | "decision"
  | "parallel_split"
  | "parallel_join"
  | "human_task"
  | "timer"
  | "sub_workflow"
  | "script"
  | "notification"
  | "rule";

/** A node in the workflow graph */
export interface WorkflowNode {
  /** Unique node ID */
  id: string;
  /** Node type */
  nodeType: NodeType;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Position for visual designer [x, y] */
  position: [number, number];
  /** Node-specific configuration */
  config: NodeConfig;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** Node configuration */
export interface NodeConfig {
  // Action node
  /** Action to perform */
  action?: string;
  /** Parameters for the action */
  parameters?: Record<string, unknown>;

  // Decision node
  /** Condition expression */
  condition?: string;
  /** Rule ID for rule-based decisions */
  ruleId?: string;

  // Human task
  /** Assignee (role or user ID) */
  assignee?: string;
  /** Form schema for task input */
  formSchema?: Record<string, unknown>;
  /** Due date offset (e.g., "+1d", "+2h") */
  dueOffset?: string;
  /** Escalation rules */
  escalation?: EscalationConfig;

  // Timer node
  /** Duration (e.g., "PT1H", "P1D") */
  duration?: string;
  /** Specific datetime */
  until?: string;
  /** Cron expression for recurring */
  cron?: string;

  // SubWorkflow
  /** Referenced workflow ID */
  workflowId?: string;
  /** Input mapping */
  inputMapping?: Record<string, string>;
  /** Output mapping */
  outputMapping?: Record<string, string>;

  // Script node
  /** Script language */
  language?: "javascript" | "python" | "expression";
  /** Script code */
  script?: string;

  // Notification node
  /** Notification type */
  notificationType?: "email" | "sms" | "push" | "webhook";
  /** Recipients */
  recipients?: string[];
  /** Template ID */
  templateId?: string;
}

/** Escalation configuration */
export interface EscalationConfig {
  /** Time before escalation (e.g., "+1d") */
  after: string;
  /** Escalation target */
  escalateTo: string;
  /** Escalation action */
  action: string;
}

// ============================================================================
// Edge Types
// ============================================================================

/** An edge connecting nodes */
export interface WorkflowEdge {
  /** Unique edge ID */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Condition label (for decision branches) */
  label?: string;
  /** Condition expression */
  condition?: string;
  /** Priority (for multiple matching edges) */
  priority?: number;
}

// ============================================================================
// Workflow Definition
// ============================================================================

/** A complete workflow definition */
export interface WorkflowDefinition {
  /** Unique workflow ID */
  id: string;
  /** Workflow name */
  name: string;
  /** Description */
  description?: string;
  /** Version number */
  version: number;
  /** Workflow category */
  category?: string;
  /** Nodes in the workflow */
  nodes: WorkflowNode[];
  /** Edges connecting nodes */
  edges: WorkflowEdge[];
  /** Input variables schema */
  inputSchema?: Record<string, unknown>;
  /** Output variables schema */
  outputSchema?: Record<string, unknown>;
  /** Whether the workflow is active */
  isActive: boolean;
  /** Organization ID */
  organizationId?: string;
  /** Tags */
  tags?: string[];
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
  /** Created by user ID */
  createdBy?: string;
}

// ============================================================================
// Workflow Instance (Execution)
// ============================================================================

/** Workflow execution status */
export type WorkflowStatus =
  | "running"
  | "waiting"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/** A workflow execution instance */
export interface WorkflowInstance {
  /** Unique instance ID */
  id: string;
  /** Workflow definition ID */
  workflowId: string;
  /** Workflow version at start */
  workflowVersion: number;
  /** Current status */
  status: WorkflowStatus;
  /** Current node ID(s) */
  currentNodes: string[];
  /** Workflow variables */
  variables: Record<string, unknown>;
  /** Execution history */
  history: ExecutionStep[];
  /** Started timestamp */
  startedAt: string;
  /** Completed timestamp */
  completedAt?: string;
  /** Error message if failed */
  error?: string;
  /** Parent instance ID (for sub-workflows) */
  parentInstanceId?: string;
  /** Correlation ID */
  correlationId?: string;
}

/** A single execution step */
export interface ExecutionStep {
  /** Step ID */
  id: string;
  /** Node ID that was executed */
  nodeId: string;
  /** Node name */
  nodeName: string;
  /** Start time */
  startedAt: string;
  /** End time */
  endedAt?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Input data */
  input?: unknown;
  /** Output data */
  output?: unknown;
  /** Error if failed */
  error?: string;
  /** Decision taken */
  decision?: string;
}

// ============================================================================
// Human Tasks
// ============================================================================

/** Human task status */
export type TaskStatus = "pending" | "claimed" | "completed" | "expired" | "cancelled";

/** A human task for user interaction */
export interface HumanTask {
  /** Task ID */
  id: string;
  /** Workflow instance ID */
  instanceId: string;
  /** Node ID */
  nodeId: string;
  /** Task name */
  name: string;
  /** Task description */
  description?: string;
  /** Assignee */
  assignee: string;
  /** Form schema */
  formSchema?: Record<string, unknown>;
  /** Form data (pre-filled) */
  formData?: Record<string, unknown>;
  /** Status */
  status: TaskStatus;
  /** Due date */
  dueDate?: string;
  /** Priority */
  priority?: "urgent" | "high" | "normal" | "low";
  /** Created timestamp */
  createdAt: string;
  /** Claimed by user ID */
  claimedBy?: string;
  /** Completed timestamp */
  completedAt?: string;
  /** Result data */
  result?: unknown;
}

// ============================================================================
// Rules Engine Types
// ============================================================================

/** Rule categories */
export type RuleCategory =
  | "tax"
  | "drug_scheduling"
  | "compliance"
  | "billing"
  | "clinical"
  | "workflow"
  | "validation"
  | "authorization"
  | "notification"
  | "custom";

/** A decision rule */
export interface DecisionRule {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Rule category */
  category: RuleCategory;
  /** Decision table content (GoRules format) */
  content: unknown;
  /** Whether the rule is active */
  isActive: boolean;
  /** Version number */
  version: number;
  /** When the rule becomes effective */
  effectiveFrom?: string;
  /** When the rule expires */
  effectiveTo?: string;
  /** Organization ID */
  organizationId?: string;
  /** Jurisdiction ID */
  jurisdictionId?: string;
  /** Tags */
  tags?: string[];
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/** Rule evaluation context */
export interface RuleContext {
  /** Jurisdiction information */
  jurisdiction?: JurisdictionContext;
  /** Service/item being evaluated */
  service?: ServiceContext;
  /** Patient context */
  patient?: PatientContext;
  /** User context */
  user?: UserContext;
  /** Amount for financial calculations */
  amount?: number;
  /** Additional custom data */
  custom?: Record<string, unknown>;
}

/** Jurisdiction context */
export interface JurisdictionContext {
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode: string;
  /** Region/state code */
  regionCode?: string;
  /** City */
  city?: string;
  /** Postal code */
  postalCode?: string;
}

/** Service context */
export interface ServiceContext {
  /** Service type */
  serviceType?: string;
  /** Service code */
  code?: string;
  /** Department */
  department?: string;
  /** Is healthcare service */
  isHealthcare?: boolean;
}

/** Patient context for clinical rules */
export interface PatientContext {
  /** Patient ID */
  patientId: string;
  /** Age in years */
  age?: number;
  /** Weight in kg */
  weightKg?: number;
  /** Gender */
  gender?: string;
  /** Current diagnoses (ICD codes) */
  diagnoses?: string[];
  /** Current medications */
  medications?: string[];
  /** Known allergies */
  allergies?: string[];
  /** Lab values */
  labValues?: Record<string, number>;
}

/** User context for authorization */
export interface UserContext {
  /** User ID */
  userId: string;
  /** User roles */
  roles?: string[];
  /** User permissions */
  permissions?: string[];
  /** Organization ID */
  organizationId?: string;
  /** Department */
  department?: string;
}

/** Rule evaluation result */
export interface RuleResult {
  /** Whether the rule matched */
  matched: boolean;
  /** Output data */
  output: unknown;
  /** Trace information */
  trace?: unknown;
  /** Performance in ms */
  performanceMs?: number;
}

/** Tax calculation result from rules engine */
export interface RulesTaxResult {
  /** Tax system type */
  taxSystem: string;
  /** Tax components */
  components: RulesTaxComponent[];
  /** Total tax amount */
  totalTax: number;
  /** Healthcare exemption applied */
  healthcareExempt: boolean;
}

/** Tax component from rules calculation (simplified) */
export interface RulesTaxComponent {
  /** Component code */
  code: string;
  /** Component name */
  name: string;
  /** Tax rate percentage */
  rate: number;
  /** Tax amount */
  amount: number;
}

/** Clinical alert from decision support system */
export interface DecisionSupportAlert {
  /** Alert type */
  alertType: "interaction" | "contraindication" | "allergy" | "dosing";
  /** Severity */
  severity: "critical" | "high" | "medium" | "low";
  /** Alert message */
  message: string;
  /** Recommended action */
  recommendation?: string;
  /** Related items */
  relatedItems?: string[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Create workflow request */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  category?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  tags?: string[];
}

/** Update workflow request */
export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  category?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  isActive?: boolean;
  tags?: string[];
}

/** Start workflow request */
export interface StartWorkflowRequest {
  workflowId: string;
  variables?: Record<string, unknown>;
  correlationId?: string;
}

/** Complete task request */
export interface CompleteTaskRequest {
  taskId: string;
  result: Record<string, unknown>;
}

/** Create rule request */
export interface CreateRuleRequest {
  name: string;
  description?: string;
  category: RuleCategory;
  content: unknown;
  effectiveFrom?: string;
  effectiveTo?: string;
  jurisdictionId?: string;
  tags?: string[];
}

/** Update rule request */
export interface UpdateRuleRequest {
  name?: string;
  description?: string;
  category?: RuleCategory;
  content?: unknown;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  jurisdictionId?: string;
  tags?: string[];
}

/** Evaluate rule request */
export interface EvaluateRuleRequest {
  ruleId: string;
  context: RuleContext;
}

// ============================================================================
// Workflow Designer Types
// ============================================================================

/** Designer viewport state */
export interface ViewportState {
  /** Pan offset [x, y] */
  offset: [number, number];
  /** Zoom level (1.0 = 100%) */
  zoom: number;
}

/** Designer selection state */
export interface SelectionState {
  /** Selected node IDs */
  nodes: string[];
  /** Selected edge IDs */
  edges: string[];
}

/** Node template for the palette */
export interface NodeTemplate {
  /** Node type */
  type: NodeType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Icon name */
  icon: string;
  /** Default configuration */
  defaultConfig: Partial<NodeConfig>;
}

/** Available node templates */
export const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: "start",
    name: "Start",
    description: "Entry point of the workflow",
    icon: "Play",
    defaultConfig: {},
  },
  {
    type: "end",
    name: "End",
    description: "Completion point of the workflow",
    icon: "Square",
    defaultConfig: {},
  },
  {
    type: "action",
    name: "Action",
    description: "Perform an automated action",
    icon: "Zap",
    defaultConfig: {},
  },
  {
    type: "decision",
    name: "Decision",
    description: "Branch based on a condition",
    icon: "GitBranch",
    defaultConfig: {},
  },
  {
    type: "human_task",
    name: "Human Task",
    description: "Wait for user input",
    icon: "User",
    defaultConfig: {
      assignee: "user",
      dueOffset: "+1d",
    },
  },
  {
    type: "timer",
    name: "Timer",
    description: "Wait for a duration or until a time",
    icon: "Clock",
    defaultConfig: {
      duration: "PT1H",
    },
  },
  {
    type: "notification",
    name: "Notification",
    description: "Send an alert or notification",
    icon: "Bell",
    defaultConfig: {
      notificationType: "email",
      recipients: [],
    },
  },
  {
    type: "rule",
    name: "Business Rule",
    description: "Evaluate a business rule",
    icon: "Scale",
    defaultConfig: {},
  },
  {
    type: "script",
    name: "Script",
    description: "Execute custom logic",
    icon: "Code",
    defaultConfig: {
      language: "javascript",
      script: "",
    },
  },
  {
    type: "sub_workflow",
    name: "Sub-Workflow",
    description: "Execute another workflow",
    icon: "GitMerge",
    defaultConfig: {},
  },
  {
    type: "parallel_split",
    name: "Parallel Split",
    description: "Execute branches in parallel",
    icon: "Split",
    defaultConfig: {},
  },
  {
    type: "parallel_join",
    name: "Parallel Join",
    description: "Wait for parallel branches",
    icon: "Merge",
    defaultConfig: {},
  },
];
