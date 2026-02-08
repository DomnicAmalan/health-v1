---
sidebar_position: 7
title: Billing
description: Invoice, payment, and service catalog APIs
---

# Billing API

<!-- TODO: Document billing endpoints -->

## Service Catalog

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/billing/services | List services |
| POST | /v1/billing/services | Create service |

## Invoices

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/billing/invoices | List invoices |
| POST | /v1/billing/invoices | Create invoice |
| GET | /v1/billing/invoices/:id | Get invoice |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/billing/payments | List payments |
| POST | /v1/billing/payments | Record payment |

## Financial Safety

All billing operations use idempotency keys and audit trails per Tiger Style financial system requirements.
