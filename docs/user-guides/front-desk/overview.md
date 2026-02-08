---
sidebar_position: 1
title: Front Desk Overview
description: Front desk staff workflow overview in Health V1
---

# Front Desk Workflow Overview

Front desk staff are the operational backbone of the clinic. In Health V1, the front desk role covers appointment scheduling, patient check-in, new patient registration, and OPD queue management. The system provides tools for maintaining an efficient patient flow from arrival through departure.

## Daily Workflow

A typical day for front desk staff follows this pattern:

1. **Review the day's schedule** -- Open the appointment calendar to see all scheduled visits for the day, organized by provider and time slot.
2. **Check in arriving patients** -- As patients arrive, verify their identity and demographics, confirm insurance information, and mark them as checked in.
3. **Register new patients** -- For first-time visitors, create a new patient record with full demographic information. The system automatically checks for potential duplicate records.
4. **Manage the OPD queue** -- Monitor the outpatient department queue, track wait times, and coordinate patient flow to providers.
5. **Handle scheduling requests** -- Create new appointments, reschedule existing ones, and process cancellations throughout the day.

## Scheduling

### Viewing the Calendar

The scheduling calendar displays appointments across providers and time slots. Views are available in daily, weekly, and monthly formats. Each appointment shows the patient name, visit type, status, and any special flags.

### Creating Appointments

To schedule a new appointment:

1. Select the provider from the provider list.
2. Choose an available date and time slot.
3. Select the visit type (e.g., new patient, follow-up, annual physical, urgent).
4. Search for and select the patient (or register a new one).
5. Add any special instructions or notes.
6. Confirm the appointment.

### Appointment State Machine

Every appointment in Health V1 follows a defined state machine with these states:

- **Scheduled** -- The appointment has been created and is on the calendar.
- **Confirmed** -- The patient has confirmed their attendance (via reminder response or manual confirmation).
- **CheckedIn** -- The patient has arrived and been checked in by front desk staff.
- **InRoom** -- The patient has been roomed and is waiting for or being seen by the provider.
- **Completed** -- The visit is finished and the encounter has been closed.
- **Cancelled** -- The appointment was cancelled before the visit occurred.
- **NoShow** -- The patient did not arrive for the scheduled appointment.

The normal flow is: **Scheduled -> Confirmed -> CheckedIn -> InRoom -> Completed**

At appropriate points, an appointment can also transition to **Cancelled** or **NoShow**. State transitions are role-controlled, meaning only authorized users can move an appointment to certain states.

### Rescheduling and Cancelling

Existing appointments can be rescheduled to a new date, time, or provider. Cancellations require a reason code. Both actions are recorded in the appointment history for audit purposes.

## Patient Check-In

When a patient arrives for their appointment, the check-in process ensures all information is current and accurate.

### Check-In Steps

1. **Verify patient identity** -- Confirm the patient's name and date of birth against the record.
2. **Confirm demographics** -- Review and update address, phone number, email, and emergency contact if anything has changed.
3. **Verify insurance** -- Confirm the patient's current insurance coverage and collect the insurance card if needed.
4. **Update contact information** -- Make any necessary corrections to the patient's contact details.
5. **Mark as checked in** -- Transition the appointment status from Scheduled or Confirmed to CheckedIn.

Once checked in, the patient appears in the OPD queue and is visible to clinical staff for triage.

## New Patient Registration

### Entering Demographics

For new patients, front desk staff enter the complete demographic record:

- Full legal name (first, middle, last)
- Date of birth
- Sex and gender identity
- Social Security Number (collected securely, stored encrypted)
- Address (street, city, state, ZIP)
- Phone numbers (home, mobile, work)
- Email address
- Emergency contact information
- Insurance information (carrier, policy number, group number)
- Preferred language and communication preferences

### Duplicate Detection

Health V1 includes an automatic duplicate detection system that runs during patient registration. When new patient information is entered, the system searches for potential matches using a scoring algorithm that evaluates:

- **Name similarity** -- Fuzzy matching on first name, last name, and common misspellings.
- **Date of birth** -- Exact or near matches on DOB.
- **SSN** -- Exact match on Social Security Number when available.

Each potential match receives a confidence score. High-confidence matches are flagged for review before a new record can be created.

### Handling Duplicates

When potential duplicates are found, front desk staff have two options:

1. **Create new patient** -- If the match is a false positive (different person with similar information), proceed with creating a new record.
2. **Merge with existing** -- If the match is a true duplicate, use the merge workflow to consolidate the records.

## OPD Queue Management

### Viewing the Queue

The OPD queue shows all checked-in patients waiting to be seen, including:

- Patient name and MRN
- Check-in time and current wait time
- Assigned provider
- Visit type
- Current status in the encounter workflow

The queue is sorted by check-in time by default but can be filtered by provider or status.

### Managing Wait Times

Front desk staff monitor the queue to identify long wait times and coordinate with clinical staff. The system displays real-time wait metrics to help balance patient flow.

### Assigning to Providers

Patients can be assigned or reassigned to available providers based on schedule availability and clinical need. Assignment changes are tracked in the encounter history.

## Patient Merge

When duplicate patient records are identified -- either during registration or through periodic data quality reviews -- the merge workflow allows front desk staff to consolidate them.

### Merge Process

1. **Select the records to merge** -- Choose the primary (surviving) record and the secondary (duplicate) record.
2. **Review field-by-field** -- Compare demographics, contact information, and identifiers side by side. Select which values to keep for each field.
3. **Review clinical data** -- All clinical data (encounters, orders, results, notes) from both records will be combined under the surviving record.
4. **Confirm merge** -- Submit the merge for processing. This action is logged in the audit trail and cannot be undone.
5. **Post-merge verification** -- Verify that the merged record contains all expected data.

Merge operations require appropriate role permissions and are recorded permanently in the audit trail for compliance purposes.
