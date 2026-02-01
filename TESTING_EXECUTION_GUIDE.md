# Testing Execution Guide

**Testing Session Date:** _______________
**Tester:** _______________
**Environment:** http://localhost:5175

## Pre-Test Setup

- [ ] Backend services running (`docker-compose ps` shows all healthy)
- [ ] Client app running on port 5175
- [ ] Browser DevTools Console open (F12)
- [ ] Test user credentials ready

## Testing Progress Tracker

### Module 1: Authentication & Setup (3 screens)
- [ ] Login (`/login`) - **Status:** _____ **Issues:** _____
- [ ] Setup (`/setup`) - **Status:** _____ **Issues:** _____
- [ ] Access Denied (`/access-denied`) - **Status:** _____ **Issues:** _____

### Module 2: Dashboard (1 screen)
- [ ] Main Dashboard (`/`) - **Status:** _____ **Issues:** _____

### Module 3: Clinical (5 screens)
- [ ] Patient List (`/patients`) - **Status:** _____ **Issues:** _____
- [ ] Patient Chart (`/patients/$patientId`) - **Status:** _____ **Issues:** _____
- [ ] Clinical Docs (`/clinical`) - **Status:** _____ **Issues:** _____
- [ ] Orders (`/orders`) - **Status:** _____ **Issues:** _____
- [ ] Results (`/results`) - **Status:** _____ **Issues:** _____

### Module 4: Diagnostic Services (2 screens)
- [ ] Laboratory (`/lab`) - **Status:** _____ **Issues:** _____
- [ ] Radiology (`/radiology`) - **Status:** _____ **Issues:** _____

### Module 5: Operations (2 screens)
- [ ] Scheduling (`/scheduling`) - **Status:** _____ **Issues:** _____
- [ ] Pharmacy (`/pharmacy`) - **Status:** _____ **Issues:** _____

### Module 6: Departments (5 screens)
- [ ] OPD (`/opd`) - **Status:** _____ **Issues:** _____
- [ ] IPD (`/ipd`) - **Status:** _____ **Issues:** _____
- [ ] Beds (`/beds`) - **Status:** _____ **Issues:** _____
- [ ] Wards (`/wards`) - **Status:** _____ **Issues:** _____
- [ ] Operating Theatre (`/ot`) - **Status:** _____ **Issues:** _____

### Module 7: Financial (3 screens)
- [ ] Billing (`/billing`) - **Status:** _____ **Issues:** _____
- [ ] Revenue (`/revenue`) - **Status:** _____ **Issues:** _____
- [ ] Analytics (`/analytics`) - **Status:** _____ **Issues:** _____

### Module 8: System (4 screens)
- [ ] Workflows (`/workflows`) - **Status:** _____ **Issues:** _____
- [ ] Form Builder (`/form-builder`) - **Status:** _____ **Issues:** _____
- [ ] My Training (`/my-training`) - **Status:** _____ **Issues:** _____
- [ ] Settings (`/settings`) - **Status:** _____ **Issues:** _____

---

## Detailed Testing Procedures

### 1. LOGIN SCREEN (`/login`)

**URL:** http://localhost:5175/login

**Test Steps:**

1. **Screen Load**
   - [ ] Page renders without console errors
   - [ ] Email input field visible
   - [ ] Password input field visible
   - [ ] Login button visible

2. **Input Field Validation**
   - [ ] Email field accepts text input
   - [ ] Password field masks characters (shows •••)
   - [ ] Try submitting empty form - should show validation errors
   - [ ] Enter invalid email format - should show format error
   - [ ] Enter valid email, empty password - should show password required

3. **Button States**
   - [ ] Login button disabled when fields empty
   - [ ] Login button enabled when both fields filled
   - [ ] Click login with valid credentials
   - [ ] Button shows loading spinner during authentication
   - [ ] Button disabled during loading

4. **Authentication Flow**
   - [ ] Valid credentials: Redirects to dashboard
   - [ ] Invalid credentials: Shows error message
   - [ ] Error message clears when correcting input

**Console Check:** Note any errors: _______________

---

### 2. PATIENT CHART (`/patients/$patientId`)

**URL:** http://localhost:5175/patients/1 (use actual patient ID)

**Test Steps:**

1. **Screen Load**
   - [ ] Patient banner displays with name, MRN, DOB
   - [ ] Tab navigation shows all 8 tabs
   - [ ] Summary tab loads by default

2. **Tab Navigation**
   - [ ] Summary tab clickable
   - [ ] Problems tab clickable
   - [ ] Medications tab clickable
   - [ ] Allergies tab clickable
   - [ ] Vitals tab clickable
   - [ ] Labs tab clickable
   - [ ] Clinical Notes tab clickable
   - [ ] Appointments tab clickable
   - [ ] Active tab highlighted
   - [ ] Content changes when switching tabs

---

### PROBLEMS TAB - Add Problem Dialog

**Trigger:** Click "Add Problem" button

1. **Modal Opens**
   - [ ] Dialog overlay appears
   - [ ] Modal centered on screen
   - [ ] Modal title shows "Add Problem"
   - [ ] Close (X) button visible

2. **Form Fields**
   - [ ] Diagnosis input field (required indicator visible)
   - [ ] ICD-10 Code input field
   - [ ] SNOMED CT Code input field
   - [ ] Onset Date picker
   - [ ] Status dropdown (shows ACTIVE/INACTIVE options)
   - [ ] Clinical Notes textarea

3. **Field Validation**
   - [ ] Try submitting empty form - diagnosis field shows error
   - [ ] Enter diagnosis - error clears
   - [ ] Date picker opens calendar when clicked
   - [ ] Dropdown shows options when clicked

4. **Button Actions**
   - [ ] Cancel button closes modal without saving
   - [ ] Add Problem button disabled when diagnosis empty
   - [ ] Add Problem button enabled when diagnosis filled
   - [ ] Click Add Problem - shows loading state
   - [ ] Success: Modal closes, problem appears in list
   - [ ] Toast notification shows success message

**Console Check:** _______________

---

### MEDICATIONS TAB - Add Medication Dialog

**Trigger:** Click "Add Medication" button

1. **Modal Opens**
   - [ ] Dialog appears
   - [ ] All fields visible

2. **Form Fields**
   - [ ] Drug Name (required)
   - [ ] Drug Code
   - [ ] Dose (required)
   - [ ] Route dropdown (PO, IV, IM, SC, SL, TOP, INH, PR, OTIC, OPHTH, NG, OTHER)
   - [ ] Frequency dropdown (ONCE, DAILY, BID, TID, QID, Q4H, Q6H, Q8H, Q12H, PRN, OTHER)
   - [ ] Start Date picker (defaults to today)
   - [ ] End Date picker
   - [ ] Prescriber IEN input
   - [ ] Patient Instructions textarea

3. **Validation**
   - [ ] Submit empty - Drug Name shows error
   - [ ] Submit without Dose - Dose shows error
   - [ ] Both required fields must be filled

4. **Dropdown Functionality**
   - [ ] Route dropdown opens and shows all options
   - [ ] Selecting route updates field
   - [ ] Frequency dropdown opens and shows all options
   - [ ] Selecting frequency updates field

5. **Date Pickers**
   - [ ] Start Date opens calendar
   - [ ] Defaults to today's date
   - [ ] End Date opens calendar
   - [ ] Can leave End Date empty

6. **Submission**
   - [ ] Cancel closes modal
   - [ ] Add Medication saves
   - [ ] Success: Modal closes, medication in list
   - [ ] Toast shows success

**Console Check:** _______________

---

### ALLERGIES TAB - Add Allergy Dialog

**Trigger:** Click "Add Allergy" button

1. **Modal Opens**
   - [ ] Dialog displays
   - [ ] Severity guidelines info box visible

2. **Form Fields**
   - [ ] Allergen input (required)
   - [ ] Allergy Type dropdown (DRUG, FOOD, ENVIRONMENTAL, OTHER)
   - [ ] Severity dropdown (MILD, MODERATE, SEVERE, LIFE_THREATENING)
   - [ ] Reactions textarea (required)
   - [ ] Clinical Notes textarea

3. **Info Box**
   - [ ] Severity guidelines visible:
     - MILD: Minor symptoms
     - MODERATE: Troublesome symptoms
     - SEVERE: Significant distress
     - LIFE_THREATENING: Anaphylaxis risk

4. **Validation**
   - [ ] Empty Allergen shows error
   - [ ] Empty Reactions shows error
   - [ ] Both required fields must be filled

5. **Dropdowns**
   - [ ] Allergy Type shows all 4 options
   - [ ] Severity shows all 4 levels
   - [ ] Selections update correctly

6. **Submission**
   - [ ] Cancel closes
   - [ ] Add Allergy saves
   - [ ] Success: Allergy appears in list
   - [ ] Toast notification

**Console Check:** _______________

---

### VITALS TAB - Add Vitals Dialog

**Trigger:** Click "Record Vitals" button

1. **Modal Opens**
   - [ ] Large dialog with all vital fields

2. **Form Fields** (all number inputs with validation)
   - [ ] Date & Time Taken (datetime-local)
   - [ ] Systolic BP (min: 60, max: 250)
   - [ ] Diastolic BP (min: 40, max: 150)
   - [ ] Heart Rate (min: 30, max: 200)
   - [ ] Temperature (min: 95, max: 106)
   - [ ] Respiratory Rate (min: 6, max: 60)
   - [ ] Oxygen Saturation (min: 70, max: 100)
   - [ ] Weight (min: 50, max: 500 lbs)
   - [ ] Height (min: 40, max: 90 inches)
   - [ ] BMI (calculated, disabled/read-only)
   - [ ] Pain Scale (min: 0, max: 10)

3. **Number Validation**
   - [ ] Try entering 300 in Systolic - should prevent/show error
   - [ ] Try entering 30 in Diastolic - should prevent/show error
   - [ ] All min/max constraints enforced

4. **BMI Calculation**
   - [ ] Enter Weight: 150
   - [ ] Enter Height: 65
   - [ ] BMI auto-calculates and displays
   - [ ] BMI field is disabled (can't type in it)

5. **Date/Time**
   - [ ] Date & Time picker opens
   - [ ] Defaults to current date/time
   - [ ] Can select past date

6. **Submission**
   - [ ] Cancel closes
   - [ ] Record Vitals saves
   - [ ] Success: Vitals appear in table
   - [ ] Toast notification

**Console Check:** _______________

---

### VITALS TAB - Vital Trend Dialog

**Trigger:** Click any vital sign in the vitals list

1. **Modal Opens**
   - [ ] Read-only dialog displays
   - [ ] Chart visible

2. **Chart Display**
   - [ ] Line chart renders
   - [ ] X-axis shows dates
   - [ ] Y-axis shows values
   - [ ] Data points visible
   - [ ] Trend line smooth

3. **Statistics**
   - [ ] Latest value displays
   - [ ] Average value displays
   - [ ] Range (min-max) displays

4. **Close**
   - [ ] Close button (X) works
   - [ ] Click outside closes modal

**Console Check:** _______________

---

### LABS TAB - Order Lab Dialog

**Trigger:** Click "Order Lab" button

1. **Modal Opens**
   - [ ] Dialog displays

2. **Form Fields**
   - [ ] Lab Panel dropdown (CBC, CMP, BMP, LFT, LIPID, TSH, HBA1C, UA, CUSTOM)
   - [ ] Priority dropdown (ROUTINE, URGENT, STAT)
   - [ ] Fasting Required checkbox
   - [ ] Clinical Indication textarea
   - [ ] Custom Tests textarea (conditional)

3. **Lab Panel Selection**
   - [ ] Select CBC - Tests Included shows badges
   - [ ] Select CMP - Tests Included updates
   - [ ] Select CUSTOM - Custom Tests textarea appears
   - [ ] Tests Included hidden when CUSTOM selected

4. **Priority Info Box**
   - [ ] ROUTINE: Within 24 hours
   - [ ] URGENT: Within 4 hours
   - [ ] STAT: Immediately
   - [ ] Info box displays correctly

5. **Conditional Fields**
   - [ ] Select non-CUSTOM panel - Custom Tests hidden
   - [ ] Select CUSTOM - Custom Tests field appears
   - [ ] Field properly shows/hides

6. **Fasting Checkbox**
   - [ ] Checkbox clickable
   - [ ] Checked state toggles
   - [ ] Visual indication clear

7. **Submission**
   - [ ] Cancel closes
   - [ ] Create Order submits
   - [ ] Success: Order created
   - [ ] Toast notification

**Console Check:** _______________

---

### BEDS SCREEN (`/beds`)

**URL:** http://localhost:5175/beds

1. **Screen Load**
   - [ ] Page renders
   - [ ] Tab navigation shows 4 tabs
   - [ ] Stats cards display (Available/Occupied/Total)

2. **Board Tab**
   - [ ] Visual bed board displays
   - [ ] Beds shown as cards/tiles
   - [ ] Status color-coded (Vacant/Occupied)
   - [ ] Click bed opens Bed Details dialog

3. **Add Bed Button**
   - [ ] Button visible
   - [ ] Click opens Add Bed modal

---

### Add Bed Modal

1. **Modal Opens**
   - [ ] Dialog displays
   - [ ] Title "Add Bed"

2. **Form Fields**
   - [ ] Bed Code input (required)
   - [ ] Ward ID input (required)
   - [ ] Bed Type dropdown (general, icu, isolation, maternity, pediatric, emergency, recovery, other)
   - [ ] Location input

3. **Validation**
   - [ ] Empty Bed Code shows error
   - [ ] Empty Ward ID shows error
   - [ ] Both required fields enforce

4. **Bed Type Dropdown**
   - [ ] Opens on click
   - [ ] Shows all 8 types
   - [ ] Selection updates field

5. **Submission**
   - [ ] Cancel closes
   - [ ] Create Bed saves
   - [ ] Success: Bed appears in board
   - [ ] Stats update
   - [ ] Toast notification

**Console Check:** _______________

---

### Bed Details Dialog

**Trigger:** Click bed card on board

1. **Modal Opens**
   - [ ] Read-only dialog
   - [ ] Bed information displays

2. **Information Shown**
   - [ ] Bed Code
   - [ ] Ward
   - [ ] Bed Type
   - [ ] Status (Vacant/Occupied)
   - [ ] Location

3. **Action Buttons**
   - [ ] If vacant: "Allocate Bed" button visible
   - [ ] If occupied: Button hidden or disabled
   - [ ] Close button works

**Console Check:** _______________

---

### WARDS SCREEN (`/wards`)

**URL:** http://localhost:5175/wards

1. **Screen Load**
   - [ ] Page renders
   - [ ] 4 tabs visible
   - [ ] Stats cards show ward counts

2. **Add Ward Button**
   - [ ] Button visible
   - [ ] Click opens Add Ward modal

---

### Add Ward Modal

1. **Modal Opens**
   - [ ] Dialog displays

2. **Form Fields**
   - [ ] Ward Code (required)
   - [ ] Ward Name (required)
   - [ ] Specialty dropdown (general, icu, nicu, picu, surgical, medical, orthopedic, cardiology, neurology, pediatric, maternity, emergency, other)
   - [ ] Total Beds (number, required)
   - [ ] Location
   - [ ] Description textarea

3. **Validation**
   - [ ] Empty Ward Code shows error
   - [ ] Empty Ward Name shows error
   - [ ] Empty Total Beds shows error
   - [ ] Number validation for Total Beds (must be > 0)

4. **Specialty Dropdown**
   - [ ] Opens on click
   - [ ] Shows all 13 specialties
   - [ ] Selection updates

5. **Submission**
   - [ ] Cancel closes
   - [ ] Create Ward saves
   - [ ] Success: Ward in list
   - [ ] Toast notification

**Console Check:** _______________

---

### Ward Details Dialog

**Trigger:** Click ward card

1. **Modal Opens**
   - [ ] Ward details display

2. **Information**
   - [ ] Ward Code
   - [ ] Ward Name
   - [ ] Specialty
   - [ ] Total Beds
   - [ ] Available Beds
   - [ ] Location
   - [ ] Description

3. **Actions**
   - [ ] "View Beds" button navigates to /beds
   - [ ] Close button works

**Console Check:** _______________

---

### OPERATING THEATRE (`/ot`)

**URL:** http://localhost:5175/ot

1. **Screen Load**
   - [ ] Page renders
   - [ ] 4 tabs visible

2. **Schedule Surgery Button**
   - [ ] Button visible on Schedule tab
   - [ ] Click opens modal

---

### Schedule Surgery Modal

1. **Modal Opens**
   - [ ] Dialog displays
   - [ ] Title "Schedule Surgery"

2. **Form Fields**
   - [ ] Patient ID (required)
   - [ ] Procedure Name (required)
   - [ ] Surgeon ID (required)
   - [ ] Anesthesiologist ID
   - [ ] Operating Theatre dropdown (required)
   - [ ] Date picker (required, min: today)
   - [ ] Time dropdown (required, 08:00-17:00 in 30min slots)
   - [ ] Duration in minutes (required, min: 30, step: 30)
   - [ ] Pre-operative Notes textarea

3. **Validation**
   - [ ] Empty Patient ID shows error
   - [ ] Empty Procedure Name shows error
   - [ ] Empty Surgeon ID shows error
   - [ ] Empty Operating Theatre shows error
   - [ ] Empty Date shows error
   - [ ] Empty Time shows error
   - [ ] Empty Duration shows error

4. **Date Restrictions**
   - [ ] Try selecting past date - should prevent
   - [ ] Today and future dates selectable

5. **Time Dropdown**
   - [ ] Opens on click
   - [ ] Shows times 08:00 to 17:00
   - [ ] 30-minute increments

6. **Duration**
   - [ ] Number input
   - [ ] Min value 30
   - [ ] Step 30 (increases by 30)
   - [ ] Try entering 20 - should prevent/error

7. **Submission**
   - [ ] Cancel closes
   - [ ] Schedule Surgery saves
   - [ ] Success: Surgery in schedule
   - [ ] Toast notification

**Console Check:** _______________

---

### IPD SCREEN (`/ipd`)

**URL:** http://localhost:5175/ipd

1. **Screen Load**
   - [ ] Page renders
   - [ ] 5 tabs visible

2. **Admission Form**
   - [ ] Form visible on Active Admissions tab
   - [ ] All fields present

---

### Admission Form with Confirmation Dialog

1. **Form Fields**
   - [ ] Patient ID/search
   - [ ] Admission Type dropdown
   - [ ] Ward selection
   - [ ] Bed selection
   - [ ] Chief Complaint textarea
   - [ ] Admitting Diagnosis
   - [ ] Attending Physician

2. **Fill Form**
   - [ ] Enter all required fields
   - [ ] Click "Admit Patient" button

3. **Confirmation Dialog Opens**
   - [ ] Modal appears
   - [ ] Title "Confirm Admission"
   - [ ] Patient information displays
   - [ ] Admission details show
   - [ ] Two buttons: "Go Back" and "Confirm Admission"

4. **Dialog Actions**
   - [ ] Click "Go Back" - returns to form with data preserved
   - [ ] Click "Confirm Admission" - submits data

5. **Submission Success**
   - [ ] Dialog closes
   - [ ] Form resets
   - [ ] Admission appears in list
   - [ ] Toast notification

**Console Check:** _______________

---

### BILLING SCREEN (`/billing`)

**URL:** http://localhost:5175/billing

1. **Screen Load**
   - [ ] Page renders
   - [ ] 4 tabs visible

2. **Payment Modal** (if exists)
   - [ ] Click "Record Payment" or similar
   - [ ] Modal opens

3. **Payment Form Fields**
   - [ ] Amount (number, > 0)
   - [ ] Payment Method dropdown
   - [ ] Reference Number
   - [ ] Notes textarea

4. **Validation**
   - [ ] Amount must be > 0
   - [ ] Try entering -10 - should prevent
   - [ ] Required fields enforce

5. **Submission**
   - [ ] Cancel closes
   - [ ] Submit saves payment
   - [ ] Toast notification

**Console Check:** _______________

---

## Common Issues Checklist

For EVERY modal and screen, check:

### Modal Behavior
- [ ] Modal opens smoothly (no lag)
- [ ] Backdrop darkens background
- [ ] Click outside modal doesn't close (if form has data)
- [ ] ESC key closes modal (confirm if unsaved data)
- [ ] Close (X) button works
- [ ] Modal scrolls if content overflows
- [ ] Modal centers on screen

### Form Validation
- [ ] Required fields marked with asterisk (*)
- [ ] Empty required field shows error on submit
- [ ] Error messages display below field
- [ ] Error messages clear when user corrects
- [ ] aria-invalid attribute set when error
- [ ] Error text is descriptive

### Button States
- [ ] Default state: proper color
- [ ] Hover state: visual feedback
- [ ] Loading state: spinner shows, button disabled
- [ ] Disabled state: grayed out, cursor not-allowed
- [ ] Success state: may show checkmark briefly

### Data Flow
- [ ] Form submit triggers API call
- [ ] Success: modal closes, list updates, toast shows
- [ ] Error: modal stays open, error message shows
- [ ] Loading: button disabled, spinner shows
- [ ] Network error: shows user-friendly message

### Console Errors
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No 404 for missing resources
- [ ] No CORS errors
- [ ] API calls return expected status codes

---

## Bug Report Template

When you find an issue, document it like this:

**Bug #:** _____
**Route/Screen:** _____
**Component:** _____
**Severity:** Critical / High / Medium / Low

**Expected Behavior:**
_____

**Actual Behavior:**
_____

**Steps to Reproduce:**
1.
2.
3.

**Console Errors:**
```
[Paste any console errors here]
```

**Screenshots:** (if applicable)

**Browser:** Chrome / Firefox / Safari
**Version:** _____

---

## Testing Summary

**Total Screens Tested:** _____ / 28
**Total Modals Tested:** _____ / 8+
**Bugs Found:** _____
**Critical Issues:** _____
**Tests Passed:** _____
**Tests Failed:** _____

**Overall Status:** ☐ PASS ☐ FAIL ☐ PARTIAL

**Notes:**
