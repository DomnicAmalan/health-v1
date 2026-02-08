---
sidebar_position: 1
title: Doctor Overview
description: Doctor workflow overview in Health V1
---

# Doctor Workflow Overview

The doctor workflow in Health V1 is designed around the daily rhythm of outpatient clinical practice: reviewing the schedule, seeing patients, documenting encounters, placing orders, and reviewing results. Every screen and tool is built to minimize clicks and keep clinical information accessible at the point of care.

## Daily Workflow

A typical day for a doctor in Health V1 follows this sequence:

1. **Review schedule** -- Open the daily schedule view to see upcoming appointments, patient names, visit types, and any special flags (VIP, alerts).
2. **See patients** -- Select a patient from the schedule to open their chart and begin the encounter.
3. **Write clinical notes** -- Document the visit using structured SOAP notes or free-text progress notes.
4. **Place orders** -- Order labs, imaging studies, or medications directly from within the encounter.
5. **Review results** -- Check incoming lab and imaging results, acknowledge critical values, and update the plan as needed.

## Patient Management

### Searching for Patients

Find patients using any combination of:

- Patient name (first, last, or partial match)
- MRN (Medical Record Number)
- Date of birth
- Phone number

The search returns results ranked by relevance, with key identifiers displayed for quick confirmation.

### Patient Banner

When a patient chart is open, the patient banner is always visible at the top of the screen. It provides critical summary information at a glance:

- **Full name, MRN, age, and sex**
- **Active allergies count** -- Number of documented allergies, with a visual indicator for high-risk patients
- **Active problems count** -- Number of items on the active problem list
- **Active medications count** -- Number of current medications
- **Last visit date** -- When the patient was last seen
- **VIP and alert flags** -- Special flags for patients who require additional attention or have safety alerts

Clicking on any section of the banner navigates to the detailed view for that category.

### Viewing and Editing Demographics

Doctors can view the full patient demographic record. Clinical information such as problem list entries, allergies, and medication lists can be updated directly from the patient chart. Administrative demographic changes (address, insurance) are typically handled by front desk staff.

## Clinical Notes

### SOAP Note Structure

Health V1 uses the standard SOAP format for clinical documentation:

- **Subjective** -- The patient's reported symptoms, history of present illness, review of systems, and relevant past medical, social, and family history.
- **Objective** -- Physical examination findings, vital signs recorded during the encounter, and any test results available at the time of documentation.
- **Assessment** -- The clinical assessment, including working diagnoses, differential diagnoses, and clinical reasoning.
- **Plan** -- The treatment plan, including orders placed, medications prescribed, follow-up instructions, and patient education provided.

### Progress Notes

For follow-up visits and ongoing care, progress notes document interval changes, response to treatment, and updates to the care plan. Progress notes can reference prior encounters for continuity.

### Templates

Pre-built templates are available for common visit types (e.g., annual physical, follow-up, acute visit). Templates pre-populate note sections with standard language and prompts, reducing documentation time while ensuring completeness. Templates can be customized at the organization level by administrators.

## Order Entry

### Lab Orders

Place laboratory test orders by selecting from the test catalog. Each order includes:

- Test name and panel selection
- Clinical indication
- Specimen collection instructions
- Priority level (routine or stat)

Orders are routed to the lab specimen collection queue automatically.

### Imaging Orders

Request diagnostic imaging studies including X-ray, CT, MRI, and ultrasound. Imaging orders include:

- Study type and body region
- Clinical indication and relevant history
- Priority level
- Special instructions for the imaging technologist

### Medication Orders

Prescribe medications with built-in clinical decision support:

- **Drug interaction checking** -- The system alerts when a new prescription interacts with existing medications.
- **Allergy cross-reference** -- Automatic checking against the patient's documented allergies.
- **Dosage calculators** -- Weight-based and age-based dosage recommendations.
- **Clinical decision support alerts** -- Evidence-based alerts for contraindications, duplicate therapy, and dosage limits.

## Results Review

### Lab Results

Completed lab results appear in the results review inbox. Each result displays:

- Test name and result value
- Reference range
- Abnormal flag (high, low, critical) with visual highlighting
- Ordering provider and order date
- Specimen collection and resulted timestamps

### Critical Value Alerts

Critical lab values that fall outside life-threatening thresholds trigger immediate alerts. These alerts require explicit acknowledgment from the provider before they can be dismissed. The acknowledgment is recorded in the audit trail.

### Result Trends

For tests that are repeated over time (e.g., hemoglobin, creatinine, glucose), the results review screen displays historical trends. This allows providers to visualize changes and assess treatment effectiveness.

## Encounter Workflow

Each patient visit follows a structured encounter workflow with defined states:

1. **Check-in** -- Front desk confirms the patient's arrival and marks them as checked in.
2. **Triage** -- Nursing staff record vital signs, chief complaint, and perform initial assessment.
3. **Exam Room** -- Patient is roomed and ready for the provider.
4. **Provider** -- The doctor sees the patient, documents the encounter, and places orders.
5. **Checkout** -- Visit is completed, follow-up is scheduled if needed, and billing is triggered.

The encounter state is visible throughout the workflow, and each transition is logged for audit purposes.

## Tools Available

The following tools are accessible from within the patient chart during an encounter:

- **Patient Banner** -- Persistent summary bar with key patient information
- **Encounter Timeline** -- Chronological view of all events within the current and past encounters
- **Problem List** -- Active and resolved problems with ICD codes
- **Medication List** -- Current, discontinued, and historical medications
- **Allergy List** -- Documented allergies with reaction type and severity
- **Vital Signs** -- Current and historical vital sign measurements
- **Orders** -- Active, pending, and completed orders across all categories
- **Results** -- Lab and imaging results with abnormal flagging
- **Clinical Notes** -- All encounter notes with search and filter capabilities
