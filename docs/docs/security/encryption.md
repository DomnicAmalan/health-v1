---
sidebar_position: 3
title: Encryption
description: DEK rotation and at-rest encryption
---

# Encryption

<!-- TODO: Document encryption architecture, DEK rotation procedures, and key management -->

## Overview

Health V1 uses a layered encryption approach for protecting data at rest.

## Master Key

The `MASTER_KEY` environment variable (32 bytes hex) is used as the root encryption key. This must be changed from the default value in production environments.

## Data Encryption Keys (DEK)

DEKs are managed through the RustyVault service and rotated periodically.

## Key Rotation

Use the `/encryption-ops` skill to manage DEK rotation and key operations.
