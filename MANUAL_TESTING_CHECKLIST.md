# Manual Testing Checklist - Sidebar Modules

**Date:** _____________
**Tester:** _____________
**Browser:** Chrome / Firefox / Safari
**URL:** http://localhost:5175

---

## How to Use This Checklist

1. **Open the application** in your browser: http://localhost:5175
2. **Open DevTools Console** (F12 or Cmd+Option+I)
3. **Go through each module** in the sidebar
4. **Check the boxes** as you test
5. **Note any issues** in the Issues column

---

## Pre-Testing Setup

- [ ] Backend services running (`docker ps` shows all containers up)
- [ ] Client app running on port 5175
- [ ] Logged in with test user credentials
- [ ] Browser DevTools Console open

---

## CLINICAL GROUP

### ✓ Dashboard (/)
**Test:** Click "Dashboard" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Console shows no errors
- [ ] Content displays (stats, cards, etc.)
- [ ] All buttons visible

**Issues:** _______________

---

### ✓ Patients (/patients)
**Test:** Click "Patients" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Patient list/table displays
- [ ] Search bar functional
- [ ] "New Patient" button visible
- [ ] Click "New Patient" button
  - [ ] Modal opens OR shows error message
  - [ ] If no modal: Note missing functionality
- [ ] Click a patient row
  - [ ] Navigates to patient chart
  - [ ] Patient details load

**Issues:** _______________

**New Patient Button Status:**
- [ ] Works (modal opens)
- [ ] Broken (nothing happens)
- [ ] Missing modal component

---

### ✓ Clinical (/clinical)
**Test:** Click "Clinical" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Clinical templates display
- [ ] "Create Note" button visible (if exists)
- [ ] Templates are clickable

**Issues:** _______________

---

### ✓ Orders (/orders)
**Test:** Click "Orders" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Orders list displays
- [ ] "Create Order" button visible (if exists)
- [ ] Filters work (if present)

**Issues:** _______________

---

### ✓ Results (/results)
**Test:** Click "Results" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Results list displays
- [ ] Critical alerts highlighted (if any)
- [ ] Review button works (if present)

**Issues:** _______________

---

## OPERATIONS GROUP

### ✓ OPD (/opd)
**Test:** Click "OPD" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tab navigation visible (Queue, Consultation Rooms, etc.)
- [ ] Switch between tabs
  - [ ] Patient Queue tab
  - [ ] Consultation Rooms tab
  - [ ] Dashboard tab
  - [ ] Settings tab
- [ ] Check-in button functional (if exists)

**Issues:** _______________

---

### ✓ IPD (/ipd)
**Test:** Click "IPD" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Active Admissions, Pending Discharges, etc.)
- [ ] Switch between tabs
  - [ ] Active Admissions tab
  - [ ] Pending Discharges tab
  - [ ] Census tab
  - [ ] Dashboard tab
  - [ ] Settings tab
- [ ] Admission form visible
- [ ] Fill admission form (test)
  - [ ] Patient ID field works
  - [ ] Ward selection works
  - [ ] Bed selection works
  - [ ] Submit button functional
  - [ ] Confirmation dialog opens

**Issues:** _______________

**Admission Form Status:**
- [ ] Fully functional
- [ ] Partially works
- [ ] Broken

---

### ✓ Scheduling (/scheduling)
**Test:** Click "Scheduling" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Calendar displays
- [ ] Date navigation works
- [ ] "New Appointment" button visible
- [ ] Click appointment form
  - [ ] Modal opens
  - [ ] All fields present
  - [ ] Date/time picker works
  - [ ] Submit button functional

**Issues:** _______________

---

## DEPARTMENTS GROUP

### ✓ Beds (/beds)
**Test:** Click "Beds" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Board, List, History, Settings)
- [ ] Switch to Board tab
  - [ ] Bed cards display
  - [ ] Status color-coded (Vacant/Occupied)
- [ ] Click "Add Bed" button
  - [ ] Modal opens
  - [ ] **Form fields:**
    - [ ] Bed Code input
    - [ ] Ward ID input
    - [ ] Bed Type dropdown (8 options)
    - [ ] Location input
  - [ ] Required field validation works
  - [ ] Submit button functional
- [ ] Click a bed card
  - [ ] Bed Details dialog opens
  - [ ] Information displays
  - [ ] "Allocate Bed" button (if vacant)

**Issues:** _______________

**Add Bed Modal Status:**
- [ ] Fully functional
- [ ] Partially works
- [ ] Broken

---

### ✓ Wards (/wards)
**Test:** Click "Wards" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (List, Census, Dashboard, Settings)
- [ ] Ward list displays
- [ ] Stats cards show correct counts
- [ ] Click "Add Ward" button
  - [ ] Modal opens
  - [ ] **Form fields:**
    - [ ] Ward Code input (required)
    - [ ] Ward Name input (required)
    - [ ] Specialty dropdown (13 options)
    - [ ] Total Beds input (required, number)
    - [ ] Location input
    - [ ] Description textarea
  - [ ] Required field validation works
  - [ ] Number validation for beds
  - [ ] Submit button functional
- [ ] Click a ward card
  - [ ] Ward Details dialog opens
  - [ ] Ward information displays
  - [ ] "View Beds" button works

**Issues:** _______________

**Add Ward Modal Status:**
- [ ] Fully functional
- [ ] Partially works
- [ ] Broken

---

### ✓ OT - Operating Theatre (/ot)
**Test:** Click "OT" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Schedule, Theatres, Dashboard, Settings)
- [ ] Theatre list displays
- [ ] Click "Schedule Surgery" button
  - [ ] Modal opens
  - [ ] **Form fields:**
    - [ ] Patient ID (required)
    - [ ] Procedure Name (required)
    - [ ] Surgeon ID (required)
    - [ ] Anesthesiologist ID
    - [ ] Operating Theatre dropdown (required)
    - [ ] Date picker (required, min: today)
    - [ ] Time dropdown (08:00-17:00, required)
    - [ ] Duration in minutes (required, min: 30, step: 30)
    - [ ] Pre-operative Notes textarea
  - [ ] Date restricts past dates
  - [ ] Time dropdown shows 30-min slots
  - [ ] Duration validation (min 30, step 30)
  - [ ] Required field validation works
  - [ ] Submit button functional

**Issues:** _______________

**Schedule Surgery Modal Status:**
- [ ] Fully functional
- [ ] Partially works
- [ ] Broken

---

## DIAGNOSTICS GROUP

### ✓ Lab (/lab)
**Test:** Click "Lab" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Dashboard, Sample Collection, Worklist, Results)
- [ ] Switch between tabs
- [ ] Dashboard shows stats
- [ ] Create lab order button (if exists)
  - [ ] Modal opens
  - [ ] Form functional

**Issues:** _______________

---

### ✓ Radiology (/radiology)
**Test:** Click "Radiology" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Dashboard, Scheduling, Worklist, Exams, Reports)
- [ ] Switch between tabs
- [ ] Dashboard displays
- [ ] Create radiology order button (if exists)

**Issues:** _______________

---

### ✓ Pharmacy (/pharmacy)
**Test:** Click "Pharmacy" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Drug Catalog, Pending, Ready, All Prescriptions)
- [ ] Switch between tabs
- [ ] Drug search works
- [ ] Prescription verification button (if exists)

**Issues:** _______________

---

## FINANCIAL GROUP

### ✓ Billing (/billing)
**Test:** Click "Billing" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Invoices, Payments, Services, Settings)
- [ ] Switch between tabs
- [ ] Invoice list displays
- [ ] "Create Invoice" button (if exists)
- [ ] "Record Payment" button (if exists)
  - [ ] Modal opens
  - [ ] Payment form functional

**Issues:** _______________

---

### ✓ Revenue (/revenue)
**Test:** Click "Revenue" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] KPI cards display
- [ ] Charts render
  - [ ] Revenue Trend Chart
  - [ ] Revenue by Insurance Chart
- [ ] No console errors (Cube.js may take time to load)

**Issues:** _______________

---

## ANALYTICS GROUP

### ✓ Analytics (/analytics)
**Test:** Click "Analytics" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Clinical, Financial, Operational, Compliance, Cube Analytics)
- [ ] Switch between tabs
- [ ] Charts render on each tab
- [ ] Filters work (time period selector)
- [ ] Export button visible (if exists)

**Issues:** _______________

---

### ✓ Compliance (/compliance-status)
**Test:** Click "Compliance" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Compliance status displays
- [ ] Assessment list shows (if exists)

**Issues:** _______________

---

### ✓ Workflows (/workflows)
**Test:** Click "Workflows" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Definitions, Instances, Tasks)
- [ ] Switch between tabs
- [ ] Workflow list displays

**Issues:** _______________

---

## SYSTEM GROUP

### ✓ Form Builder (/form-builder)
**Test:** Click "Form Builder" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] UI/Physical toggle visible
- [ ] Form builder interface displays
- [ ] Field palette visible (if UI mode)

**Issues:** _______________

---

### ✓ My Training (/my-training)
**Test:** Click "My Training" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Course list displays
- [ ] Progress bars show
- [ ] Certificate download button (if applicable)

**Issues:** _______________

---

### ✓ Settings (/settings)
**Test:** Click "Settings" in sidebar

- [ ] Sidebar item is clickable
- [ ] Page loads without errors
- [ ] Tabs visible (Profile, Notifications, Security)
- [ ] Switch between tabs
- [ ] Profile form editable
- [ ] Save button functional

**Issues:** _______________

---

## Patient Chart Testing

**Navigate to:** /patients → Click any patient

### Patient Chart Tabs

- [ ] Summary tab loads
- [ ] Problems tab loads
  - [ ] "Add Problem" button visible
  - [ ] Click "Add Problem"
    - [ ] Modal opens
    - [ ] **Fields:**
      - [ ] Diagnosis (required)
      - [ ] ICD-10 Code
      - [ ] SNOMED CT Code
      - [ ] Onset Date picker
      - [ ] Status dropdown
      - [ ] Clinical Notes
    - [ ] Validation works
    - [ ] Submit functional

- [ ] Medications tab loads
  - [ ] "Add Medication" button visible
  - [ ] Click "Add Medication"
    - [ ] Modal opens
    - [ ] **Fields:**
      - [ ] Drug Name (required)
      - [ ] Dose (required)
      - [ ] Route dropdown (12 options)
      - [ ] Frequency dropdown (11 options)
      - [ ] Date pickers
      - [ ] Instructions textarea
    - [ ] Dropdowns populate
    - [ ] Validation works
    - [ ] Submit functional

- [ ] Allergies tab loads
  - [ ] "Add Allergy" button visible
  - [ ] Click "Add Allergy"
    - [ ] Modal opens
    - [ ] **Fields:**
      - [ ] Allergen (required)
      - [ ] Allergy Type dropdown (4 options)
      - [ ] Severity dropdown (4 levels)
      - [ ] Reactions (required)
      - [ ] Clinical Notes
    - [ ] Severity guidelines display
    - [ ] Validation works
    - [ ] Submit functional

- [ ] Vitals tab loads
  - [ ] "Record Vitals" button visible
  - [ ] Click "Record Vitals"
    - [ ] Modal opens
    - [ ] **All vital fields present:**
      - [ ] Date & Time
      - [ ] BP (Systolic/Diastolic)
      - [ ] Heart Rate
      - [ ] Temperature
      - [ ] Respiratory Rate
      - [ ] O2 Saturation
      - [ ] Weight
      - [ ] Height
      - [ ] BMI (auto-calculated, disabled)
      - [ ] Pain Scale
    - [ ] BMI calculates automatically
    - [ ] Min/max validation works
    - [ ] Submit functional
  - [ ] Click a vital sign entry
    - [ ] Trend dialog opens
    - [ ] Chart displays
    - [ ] Stats show

- [ ] Labs tab loads
  - [ ] "Order Lab" button visible
  - [ ] Click "Order Lab"
    - [ ] Modal opens
    - [ ] **Fields:**
      - [ ] Lab Panel dropdown (9 options)
      - [ ] Priority dropdown (3 levels)
      - [ ] Fasting checkbox
      - [ ] Clinical Indication
      - [ ] Custom Tests (conditional)
    - [ ] Tests Included displays
    - [ ] Priority info shows
    - [ ] CUSTOM option shows textarea
    - [ ] Validation works
    - [ ] Submit functional

- [ ] Clinical Notes tab loads
- [ ] Appointments tab loads

**Patient Chart Issues:** _______________

---

## Critical Issues Found

**List any blocking issues here:**

1. _______________
2. _______________
3. _______________

---

## Summary

**Total Modules Tested:** _____ / 24

**Working Perfectly:** _____ modules

**Working with Minor Issues:** _____ modules

**Broken/Not Working:** _____ modules

**Missing Functionality:**
- [ ] Add Patient modal
- [ ] Other: _______________

---

## Next Steps

Based on testing results:

1. **Fix broken navigation** (if any items don't navigate)
2. **Create missing modals:**
   - Add Patient Dialog
   - Other missing dialogs: _______________
3. **Fix non-functional buttons**
4. **Address console errors**

---

## Console Errors Log

**Record any console errors here:**

```
[Paste errors]
```

---

**Testing Completed By:** _____________

**Date:** _____________

**Time Spent:** _____ minutes

**Overall Status:** ☐ PASS ☐ FAIL ☐ NEEDS WORK
