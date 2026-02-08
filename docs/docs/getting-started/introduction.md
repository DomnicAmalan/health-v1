---
sidebar_position: 1
title: Introduction
description: Overview of the Health V1 healthcare platform
---

# Introduction

Health V1 is an open-source, full-stack healthcare platform built as a monorepo. It combines high-performance Rust backend services with modern TypeScript/React desktop applications to deliver a secure, HIPAA-compliant system for managing electronic health records, billing, pharmacy operations, clinical workflows, and secrets management.

The platform is designed for clinics and healthcare organizations that need a reliable, auditable system for day-to-day clinical and administrative operations.

## What is Health V1?

Health V1 provides an integrated suite of tools that healthcare teams use daily:

- **Electronic Health Records (EHR)** -- Patient demographics, encounter management, clinical notes, vital signs, problem lists, lab orders, imaging orders, anatomy findings, and body system assessments.
- **Billing and Invoicing** -- Service catalogs, invoice generation, and payment processing with financial-grade transaction safety, idempotency keys, and full audit trails.
- **Pharmacy Management** -- Prescription tracking and pharmacy workflow integration within the EHR system.
- **Clinical Workflows** -- Visual workflow designer with configurable state machines for modeling clinical and administrative processes such as patient intake, referral routing, and discharge planning.
- **Secrets Vault (RustyVault)** -- A HashiCorp Vault-compatible secrets management service with AppRole authentication, userpass authentication, token management, policy-based access control, and encrypted storage.
- **Analytics and Compliance** -- Built-in audit logging for all PHI access, HIPAA-compliant data handling with 7-year retention, and reporting tools for compliance reviews.

## Key Features

### Electronic Health Records

The EHR module covers the core clinical data model:

- **Patient Management** -- Registration, demographics, duplicate detection with merge capabilities, and MRN assignment.
- **Encounters** -- Visit tracking with provider assignment, scheduling, and status management.
- **Clinical Documentation** -- Clinical notes, problem lists, vital signs, and body system assessments.
- **Orders** -- Lab test ordering, imaging order management, and result tracking.
- **Pharmacy** -- Prescription management integrated with the patient record.

### Billing

Healthcare billing is treated as a financial system with strict safety guarantees:

- Service catalog management for procedure and service pricing.
- Invoice generation tied to encounters and services rendered.
- Payment processing with idempotency to prevent duplicate charges.
- Complete audit trail for every financial state change.

### Workflow Engine

A visual workflow system allows clinical teams to model and automate processes:

- Drag-and-drop workflow designer in the frontend.
- Configurable state machines in the backend with validated transitions.
- Connector configuration for integrating workflow steps with external systems.

### Secrets Management (RustyVault)

RustyVault is a standalone service compatible with the HashiCorp Vault API:

- AppRole and userpass authentication methods.
- Token-based access with configurable TTLs.
- Policy-based authorization using path-matching rules.
- Realm and application isolation for multi-tenant secret storage.
- Encrypted local storage with master key encryption.

### Authorization Engine

The `authz-core` library provides a flexible authorization framework:

- Role-Based Access Control (RBAC) for standard permission models.
- Attribute-Based Access Control (ABAC) for fine-grained, context-aware policies.
- Composable policy evaluation used across all backend services.

## Architecture at a Glance

Health V1 is organized into three major layers: backend services, frontend applications, and shared libraries.

### Backend Services (Rust)

All backend services live under the `/backend` directory and share common infrastructure:

| Service | Purpose |
|---------|---------|
| **shared** | Common types, `AppError` error handling, database utilities, domain entities, and repository traits |
| **authz-core** | Authorization engine with RBAC and ABAC policy evaluation |
| **admin-service** | Admin API for user management, role assignment, and system configuration |
| **api-service** | Main API serving the client application with EHR, billing, pharmacy, and workflow endpoints |
| **rustyvault-service** | HashiCorp Vault-compatible secrets management with its own storage and auth subsystem |

All services are built on:

- **Axum 0.8** for HTTP routing and middleware.
- **SQLx** with PostgreSQL for compile-time verified database queries.
- **thiserror** for typed error enums and **anyhow** for error context propagation.
- **tracing** for structured, leveled logging throughout the request lifecycle.

### Frontend Applications (TypeScript/React)

Frontend applications live under `/cli/packages/apps/` and are built as Tauri desktop applications:

| Application | Default Port | Purpose |
|-------------|-------------|---------|
| **RustyVault UI** | 8215 | Vault management interface for secrets, policies, and authentication configuration |
| **Admin Dashboard** | 5174 | Administrative interface for user management, roles, system settings, and workflow configuration |
| **Client App** | 5175 | Primary clinical application for EHR, billing, pharmacy, and day-to-day patient care workflows |

### Shared Libraries

Shared code is organized under `/cli/packages/libs/`:

| Library | Package Name | Purpose |
|---------|-------------|---------|
| **shared** | `@lazarus-life/shared` | TypeScript types, API client (`BaseApiClient`), route definitions, and shared utilities |
| **components** | `@lazarus-life/ui-components` | Reusable React UI components used across all frontend applications |

## Tech Stack

### Backend

| Technology | Role |
|-----------|------|
| **Rust** | Systems programming language for all backend services |
| **Axum 0.8** | Async HTTP framework with tower middleware support |
| **SQLx** | Compile-time verified SQL queries against PostgreSQL |
| **PostgreSQL** | Primary relational database for all persistent data |
| **tokio** | Async runtime for concurrent request handling |
| **thiserror / anyhow** | Error handling with typed enums and contextual error chains |
| **tracing** | Structured logging and distributed tracing |
| **serde** | Serialization and deserialization for JSON, TOML, and other formats |

### Frontend

| Technology | Role |
|-----------|------|
| **TypeScript** | Type-safe language for all frontend code |
| **React** | UI component framework |
| **Bun** | JavaScript runtime and package manager |
| **TanStack Router** | File-based routing with type-safe route parameters |
| **TanStack Query** | Server state management with caching, refetching, and optimistic updates |
| **Zustand** | Lightweight client-side state management |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **Tauri** | Desktop application framework for building native apps from web technologies |
| **Vite** | Frontend build tool and dev server with hot module replacement |
| **Biome** | Linter and formatter for TypeScript and JavaScript |
| **Playwright** | End-to-end testing framework for browser-based tests |
| **Vitest** | Unit testing framework compatible with Vite |

### Infrastructure

| Technology | Role |
|-----------|------|
| **Docker / Docker Compose** | Containerized development, testing, and production environments |
| **Make** | Universal command interface orchestrating all build, test, and development tasks |
| **SQLx Migrations** | Database schema versioning with forward and rollback scripts |

## Next Steps

- [Quick Start](./quick-start.md) -- Get the platform running in 5 minutes.
- [Environment Configuration](./environment.md) -- Understand the unified environment variable strategy.
- [Command Reference](./commands.md) -- Full reference for all `make` commands.
