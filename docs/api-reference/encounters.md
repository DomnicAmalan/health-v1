---
sidebar_position: 4
title: Encounters
description: Encounter management API
---

# Encounters API

<!-- TODO: Document encounter endpoints -->

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/ehr/encounters | List encounters |
| GET | /v1/ehr/encounters/:id | Get encounter by ID |
| POST | /v1/ehr/encounters | Create encounter |
| PUT | /v1/ehr/encounters/:id | Update encounter |

## Encounter Lifecycle

Encounters follow the workflow: Created -> In Progress -> Completed -> Signed
