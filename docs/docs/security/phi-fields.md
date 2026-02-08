---
sidebar_position: 2
title: PHI Fields Reference
description: Which fields are PHI and masking rules
---

# PHI Fields Reference

<!-- TODO: Document all PHI field definitions, masking rules, and de-identification procedures -->

## PHI Field Categories

The following fields are classified as Protected Health Information (PHI) under HIPAA:

- **SSN** - Social Security Number
- **Email** - Patient email address
- **Phone** - Patient phone number
- **MRN** - Medical Record Number
- **Date of Birth** - Patient date of birth
- **Physical Address** - Patient home/mailing address
- **Insurance Information** - Policy numbers, group IDs
- **Credit Card** - Payment card information

## Masking Rules

PHI fields must be masked in all log output, error messages, and non-clinical displays.

## De-identification

Use the HIPAA Safe Harbor method for de-identifying datasets. The `/de-identify` skill can assist with this process.
