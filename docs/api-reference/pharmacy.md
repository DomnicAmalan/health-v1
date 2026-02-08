---
sidebar_position: 8
title: Pharmacy
description: Prescription and drug catalog APIs
---

# Pharmacy API

<!-- TODO: Document pharmacy endpoints -->

## Drug Catalog

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/pharmacy/drugs | Search drug catalog |
| GET | /v1/pharmacy/drugs/:id | Get drug details |

## Prescriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/pharmacy/prescriptions | List prescriptions |
| POST | /v1/pharmacy/prescriptions | Create prescription |

## Drug Interactions

| Method | Path | Description |
|--------|------|-------------|
| POST | /v1/pharmacy/interactions/check | Check drug interactions |
