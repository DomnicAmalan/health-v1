---
sidebar_position: 5
title: Orders
description: Lab, imaging, and medication order APIs
---

# Orders API

<!-- TODO: Document order endpoints -->

## Lab Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/ehr/lab-tests | List lab orders |
| POST | /v1/ehr/lab-tests | Create lab order |
| PUT | /v1/ehr/lab-tests/:id | Update lab order |

## Imaging Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/ehr/imaging-orders | List imaging orders |
| POST | /v1/ehr/imaging-orders | Create imaging order |

## Clinical Decision Support

Orders are validated against clinical rules before acceptance.
