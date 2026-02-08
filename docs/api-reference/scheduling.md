---
sidebar_position: 6
title: Scheduling
description: Appointment scheduling API
---

# Scheduling API

<!-- TODO: Document scheduling endpoints -->

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/ehr/appointments | List appointments |
| POST | /v1/ehr/appointments | Create appointment |
| PUT | /v1/ehr/appointments/:id | Update appointment |
| POST | /v1/ehr/appointments/:id/check-in | Check in patient |

## Appointment State Machine

States: Scheduled, Confirmed, CheckedIn, InRoom, Completed, Cancelled, NoShow

Transitions are controlled by the configurable state machine framework with role-based guards.
