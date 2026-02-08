---
sidebar_position: 1
title: Admin Overview
description: System administrator workflow overview in Health V1
---

# Admin Workflow Overview

System administrators in Health V1 are responsible for configuring the platform, managing users and permissions, monitoring compliance, and maintaining the secrets infrastructure. The admin dashboard is a separate application (accessible at port 5174) from the client application used by clinical staff, providing a dedicated interface for system configuration and oversight.

## User Management

### Creating Users

Administrators create user accounts through the admin dashboard. Each user account includes:

- Email address (used as the login identifier)
- Full name
- Role assignment (one or more roles)
- Organization and department assignment
- Account status (active, suspended, deactivated)

### Role Assignment (RBAC)

Health V1 uses Role-Based Access Control (RBAC) as the primary authorization mechanism. Roles define what areas of the system a user can access and what actions they can perform. Common roles include Doctor, Nurse, Front Desk, Admin, Lab Tech, Pharmacist, and Billing, but organizations can define custom roles to match their operational structure.

Each role is associated with a set of permissions that govern access to API endpoints, UI sections, and data categories. Users can hold multiple roles when their responsibilities span across functions.

### Permission Management (ABAC)

For fine-grained control beyond role-based access, Health V1 supports Attribute-Based Access Control (ABAC) policies. ABAC policies evaluate attributes of the user, the resource being accessed, and the context of the request to make authorization decisions. This allows rules such as:

- A doctor can only view patients assigned to their department.
- Lab results can only be released by users with a verification credential.
- Certain actions are restricted to specific time windows or locations.

ABAC policies are managed through the admin dashboard and evaluated by the authz-core engine at runtime.

## Organization Settings

### Organization-Level Configuration

Administrators configure settings that apply across the entire organization:

- Organization name, address, and contact information
- Default timezone and locale
- Clinical documentation templates
- Notification preferences
- Session timeout and security policies

### Departments and Wards

The organizational hierarchy is defined through departments and wards. Each department can have its own provider roster, scheduling rules, and workflow configurations. Wards define physical locations within the facility for patient tracking and room assignment.

## Workflow Configuration

### Defining Custom Workflows

Health V1 includes a workflow engine that allows administrators to define custom workflows for various clinical and operational processes. Workflows are built around state machines that define:

- **States** -- The discrete stages an entity (appointment, order, claim) passes through.
- **Transitions** -- The allowed movements between states.
- **Guards** -- Conditions that must be met for a transition to occur (e.g., role checks, data validation).
- **Actions** -- Automated operations triggered when a transition occurs (e.g., sending notifications, updating related records).

### Configuring State Machines

State machines can be configured for:

- **Appointments** -- Define the lifecycle from scheduling through completion, including custom states for your organization's workflow.
- **Orders** -- Configure the order lifecycle for labs, imaging, and medications.
- **Claims** -- Define the billing and insurance claim processing pipeline.
- **Custom entities** -- Create new workflows for organization-specific processes.

Transition access is role-controlled, meaning administrators specify which roles are allowed to trigger each transition. This ensures that only authorized staff can advance or modify the state of clinical and operational entities.

### Workflow Management Interface

The admin dashboard provides a visual interface for viewing and editing workflow definitions. Changes to workflow configurations take effect immediately and are versioned for audit purposes.

## Compliance Monitoring

### Audit Trail

All access to Protected Health Information (PHI) is logged automatically by the system. The audit trail captures:

- Who accessed the data (user identity)
- What data was accessed (resource type and identifier)
- When the access occurred (timestamp)
- How the data was accessed (action type: view, create, update, delete)
- From where the access originated (IP address, session identifier)

Audit records are retained for 7 years (2555 days) in accordance with HIPAA requirements. Audit data is immutable and cannot be modified or deleted.

### Compliance Dashboard

The compliance dashboard provides administrators with a real-time view of system compliance status, including:

- Recent PHI access events
- Unusual access patterns or potential violations
- User activity summaries
- Failed authentication attempts
- System health indicators relevant to compliance

### Generating Compliance Reports

Compliance reports can be generated for specific time periods, users, or data categories. Reports are formatted for submission to compliance officers and can support internal audits as well as external regulatory reviews. Reports can be generated through the admin dashboard UI or programmatically using the `/audit-report` skill.

## RustyVault Management

### Overview

RustyVault is Health V1's built-in secrets management service, compatible with the HashiCorp Vault API. It runs as a dedicated service on port 4117 and handles all sensitive credential storage, encryption key management, and secure configuration.

### Authentication Methods

RustyVault supports multiple authentication methods:

- **AppRole** -- For service-to-service authentication. Applications authenticate using a role ID and secret ID to obtain tokens.
- **Userpass** -- For human users accessing the vault through the UI or CLI. Username and password credentials are stored securely.
- **Token** -- Direct token-based authentication for programmatic access.

### Policy Management

Vault policies control what secrets and operations each authenticated identity can access. Policies use path-based rules to grant or deny access to specific secret paths and operations (read, write, delete, list).

### Encryption Key Rotation

Administrators can rotate the Data Encryption Keys (DEKs) used to encrypt sensitive data at rest. Key rotation is performed through the vault without any downtime and previous keys are retained for decryption of existing data. The rotation schedule and status are visible in the admin dashboard.

### RustyVault UI

The RustyVault UI (accessible at port 8215) provides a web-based interface for:

- Browsing and managing stored secrets
- Configuring authentication methods
- Managing policies
- Viewing audit logs specific to vault operations
- Triggering key rotation

Note that the Vault UI connects to the Vault service on port 4117 (not the main API service on port 8080). This is a separate service with its own authentication.

## System Health

### Service Monitoring

The admin dashboard displays the status of all backend services:

- API service (port 8080)
- RustyVault service (port 4117)
- Database connectivity
- Background job processors

### Log Viewing

Administrators can view structured logs from all services for troubleshooting. Logs use the `tracing` framework and include correlation IDs for request tracing across services.

## Admin Dashboard Access

The admin dashboard runs at port 5174, separate from the client application at port 5175. This separation ensures that administrative functions are isolated from clinical workflows and can have distinct access controls and security policies.

To access the admin dashboard:

1. Navigate to `http://localhost:5174` (or the configured admin URL in production).
2. Log in with an account that has the Admin role.
3. Use the sidebar navigation to access user management, workflow configuration, compliance, and vault management sections.
