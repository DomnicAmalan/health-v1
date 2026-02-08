---
sidebar_position: 6
title: Empty States
description: Empty state patterns per route
---

# Empty States

<!-- TODO: Design and document empty state patterns for each major view -->

## Overview

Every data view should have a meaningful empty state instead of a blank screen.

## Principles

1. **Explain what would appear** - "No patients found" not just a blank table
2. **Suggest next action** - "Add your first patient" with a CTA button
3. **Use illustration** - Simple, contextual illustrations
4. **Match the context** - Different messages for "no results" vs "first time"

## Views Requiring Empty States

- Patient list (no patients registered)
- Appointment schedule (no appointments today)
- Lab results (no pending results)
- Encounter history (first visit)
- Prescription list (no active prescriptions)
- Invoice list (no invoices)
- Workflow instances (no active workflows)
