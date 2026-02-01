# Urgent Fixes Needed - Functionality Issues

**Date:** 2026-02-01
**Priority:** HIGH
**Status:** ACTION REQUIRED

---

## 🔴 Critical Issues Found

Based on manual testing and automated test results, the following issues need immediate fixes:

### 1. Sidebar Navigation Not Working ❌

**Problem:** Clicking sidebar items doesn't navigate to pages
**Affected:** ALL sidebar navigation items
**Impact:** Users cannot navigate the application

**Root Cause:**
- Sidebar items have `onClick` handlers defined in `__root.tsx`
- But the sidebar may not be receiving or triggering them properly

**Fix Needed:**
1. Verify sidebar receives navigation items correctly
2. Ensure onClick handlers are being called
3. Test navigation flow

**Quick Test:**
```bash
# Open browser console and test:
1. Click any sidebar item (e.g., "Patients")
2. Check console for errors
3. Check if URL changes
4. Check if page content loads
```

---

### 2. "Add Patient" Button Missing Functionality ❌

**Problem:** Button exists but no modal/form opens
**Location:** `/patients` page, line 120-123
**Impact:** Cannot add new patients

**Current Code:**
```typescript
<Button>
  <Plus className="h-4 w-4 mr-2" />
  New Patient
</Button>
```

**Issue:** No `onClick` handler!

**Fix Needed:**
- [ ] Create `AddPatientDialog` component
- [ ] Add modal state management
- [ ] Wire up onClick handler
- [ ] Implement patient creation form

**Component Structure Needed:**
```
/src/components/ehr/AddPatientDialog.tsx
- Form fields: First Name, Last Name, DOB, Gender, MRN, etc.
- Validation
- Submit handler
- Success/error handling
```

---

### 3. Patient Chart Tabs Not Rendering ❌

**Problem:** Tabs exist in code but not rendering in tests
**Location:** `/patients/$patientId`
**Impact:** Cannot view patient clinical data sections

**Possible Causes:**
- Patient data not loading
- Tabs component styling issue
- Permission check failing
- Tab selectors don't match UI library

**Fix Needed:**
1. Check if patient data loads correctly
2. Verify Tabs component renders
3. Check browser console for errors
4. Test with real patient ID

---

### 4. Form Validation Not Working ❌

**Problem:** Forms don't set `aria-invalid` on validation errors
**Affected:** All forms (login, patient, etc.)
**Impact:** Accessibility issues, validation not visible

**Fix Needed:**
Update form components to set aria attributes:
```typescript
<input
  aria-invalid={hasError ? "true" : "false"}
  aria-describedby={hasError ? "error-message" : undefined}
/>
{hasError && <span id="error-message">{errorMessage}</span>}
```

---

### 5. Setup Page Console Errors ❌

**Problem:** 7 console errors on `/setup` page
**Impact:** May indicate broken functionality

**Fix Needed:**
1. Open `/setup` page
2. Check browser console
3. Document errors
4. Fix each error

---

### 6. Access Denied Page Missing Content ❌

**Problem:** No h1/h2 heading on access denied page
**Location:** `/access-denied`
**Impact:** Poor UX, screen reader issues

**Fix Needed:**
Add proper heading structure to access-denied page

---

## 🔧 Immediate Action Plan

### Phase 1: Critical Navigation (30 mins)

**Task 1.1: Test Sidebar Navigation Manually**
```bash
1. Open http://localhost:5175
2. Open browser DevTools Console
3. Click each sidebar item
4. Document which ones work/fail
5. Note any console errors
```

**Task 1.2: Debug Sidebar onClick**
If navigation not working:
- Check browser console for errors
- Verify onClick handlers are defined
- Add console.log to handleNavClick function
- Test individual navigation item

**Quick Debug Code:**
```typescript
// Add to __root.tsx handleNavClick function (line 276)
const handleNavClick = useCallback(
  (path: string, label: string, icon: React.ReactNode) => {
    console.log('🔍 Navigation clicked:', { path, label }); // ADD THIS
    // ... rest of code
  },
  [openTab, navigate, onMobileSidebarClose]
);
```

---

### Phase 2: Create Missing Components (1-2 hours)

**Task 2.1: Create AddPatientDialog Component**

Priority: HIGH - This is blocking patient management

**Template:**
```typescript
/**
 * Add Patient Dialog
 * Form for creating new patient records
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select
} from "@lazarus-life/ui-components";

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (patientId: string) => void;
}

export function AddPatientDialog({
  open,
  onOpenChange,
  onSuccess
}: AddPatientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
    mrn: '',
    ssn: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: API call to create patient
      // const response = await createPatient(formData);
      // onSuccess?.(response.id);
      // onOpenChange(false);

      console.log('Creating patient:', formData);
      // TEMPORARY: Close dialog
      setTimeout(() => {
        alert('Patient creation not yet implemented');
        setIsSubmitting(false);
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to create patient:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({...formData, gender: value})}
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </div>

            {/* Add more fields as needed */}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Task 2.2: Wire Up Add Patient Button**

Update `/patients.tsx` (lines 120-123):

```typescript
// Add state at top of component
const [showAddPatientDialog, setShowAddPatientDialog] = useState(false);

// Update button
<Button onClick={() => setShowAddPatientDialog(true)}>
  <Plus className="h-4 w-4 mr-2" />
  New Patient
</Button>

// Add dialog before closing tag
<AddPatientDialog
  open={showAddPatientDialog}
  onOpenChange={setShowAddPatientDialog}
  onSuccess={(patientId) => {
    // Navigate to new patient chart
    navigate({ to: `/patients/${patientId}` });
  }}
/>
```

---

### Phase 3: Fix Validation & Accessibility (30 mins)

**Task 3.1: Add Form Validation Attributes**

Update all form inputs to include:
- `aria-invalid`
- `aria-describedby`
- Error message display
- Required field indicators

**Task 3.2: Fix Access Denied Page**

Add proper heading to `/access-denied` page

---

## 📋 Testing Checklist After Fixes

### Sidebar Navigation
- [ ] Click "Dashboard" → navigates to `/`
- [ ] Click "Patients" → navigates to `/patients`
- [ ] Click "Beds" → navigates to `/beds`
- [ ] Click "Wards" → navigates to `/wards`
- [ ] Click "OT" → navigates to `/ot`
- [ ] Click all 24 sidebar items → all navigate

### Add Patient Feature
- [ ] Click "New Patient" button → modal opens
- [ ] Modal displays all form fields
- [ ] Required fields marked with *
- [ ] Cancel button closes modal
- [ ] Submit button disabled when empty
- [ ] Form validation works
- [ ] Success creates patient

### Patient Chart
- [ ] Navigate to `/patients/1`
- [ ] All 8 tabs visible
- [ ] Can switch between tabs
- [ ] Each tab loads content
- [ ] "Add Problem" button works
- [ ] "Add Medication" button works
- [ ] "Add Allergy" button works
- [ ] "Record Vitals" button works
- [ ] "Order Lab" button works

---

## 🎯 Success Criteria

**Before:**
- ❌ Sidebar navigation broken
- ❌ Cannot add patients
- ❌ Forms have no validation feedback
- ❌ Console errors on multiple pages

**After:**
- ✅ All sidebar items navigate correctly
- ✅ Can add new patients via modal
- ✅ Forms show validation state
- ✅ No console errors
- ✅ All features functional

---

## 📝 Next Steps

1. **Start with Phase 1** - Test sidebar navigation manually
2. **Document findings** - Note which specific items fail
3. **Create AddPatientDialog** - Use template above
4. **Test thoroughly** - Use MANUAL_TESTING_CHECKLIST.md
5. **Report back** - Share results

---

## Need Help?

If you need assistance with:
- **Debugging sidebar navigation** - Check browser console
- **Creating AddPatientDialog** - Use template above
- **API integration** - Check `/hooks/api/ehr` for patterns
- **Form validation** - Use existing EHR dialogs as reference

---

**Priority Order:**
1. 🔴 Test sidebar navigation manually (FIRST)
2. 🔴 Create AddPatientDialog
3. 🟡 Fix form validation
4. 🟡 Fix setup page errors
5. 🟢 Fix access denied page
