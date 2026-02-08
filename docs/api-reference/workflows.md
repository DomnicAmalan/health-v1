---
sidebar_position: 9
title: Workflows
description: Workflow definitions, instances, and task APIs
---

# Workflows API

<!-- TODO: Document workflow endpoints -->

## Workflow Definitions

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/workflows/definitions | List workflow definitions |
| POST | /v1/workflows/definitions | Create workflow definition |
| GET | /v1/workflows/definitions/:id | Get workflow definition |

## Workflow Instances

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/workflows/instances | List instances |
| POST | /v1/workflows/instances | Start workflow instance |
| GET | /v1/workflows/instances/:id | Get instance status |

## Workflow Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/workflows/tasks | List tasks |
| POST | /v1/workflows/tasks/:id/claim | Claim a task |
| POST | /v1/workflows/tasks/:id/complete | Complete a task |

## Connectors

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/workflows/connectors | List available connectors |
