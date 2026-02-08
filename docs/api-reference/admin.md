---
sidebar_position: 10
title: Admin
description: User/role management and organization settings APIs
---

# Admin API

<!-- TODO: Document admin endpoints -->

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/users | List users |
| POST | /v1/users | Create user |
| GET | /v1/users/:id | Get user |
| PUT | /v1/users/:id | Update user |

## Roles & Permissions

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/admin/roles | List roles |
| POST | /v1/admin/roles | Create role |
| GET | /v1/admin/permissions | List permissions |

## Organizations

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/organizations | List organizations |
| POST | /v1/organizations | Create organization |
| GET | /v1/organizations/:id | Get organization |

## Setup

| Method | Path | Description |
|--------|------|-------------|
| POST | /v1/setup | Initial system setup |
| POST | /v1/setup/admin | Create admin user |
