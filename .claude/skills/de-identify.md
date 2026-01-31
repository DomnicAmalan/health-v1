# PHI De-identification Skill

De-identify patient data following HIPAA Safe Harbor or Expert Determination methods for research, testing, or data sharing.

## What This Skill Does

1. Identifies all PHI elements in data structures
2. Applies Safe Harbor de-identification rules
3. Generates de-identified datasets for testing
4. Creates mapping files for re-identification (secure storage)
5. Validates de-identification completeness

## HIPAA Safe Harbor - 18 Identifiers

The following must be removed or generalized:

| # | Identifier | Action |
|---|------------|--------|
| 1 | Names | Remove or replace with pseudonym |
| 2 | Geographic data smaller than state | Generalize to state/region |
| 3 | Dates (except year) | Generalize (age if >89, date shift) |
| 4 | Phone numbers | Remove |
| 5 | Fax numbers | Remove |
| 6 | Email addresses | Remove |
| 7 | SSN | Remove |
| 8 | MRN (Medical Record Number) | Replace with study ID |
| 9 | Health plan beneficiary numbers | Remove |
| 10 | Account numbers | Remove |
| 11 | Certificate/license numbers | Remove |
| 12 | Vehicle identifiers | Remove |
| 13 | Device identifiers/serial numbers | Remove |
| 14 | URLs | Remove |
| 15 | IP addresses | Remove |
| 16 | Biometric identifiers | Remove |
| 17 | Full-face photos | Remove |
| 18 | Any other unique identifier | Remove or generalize |

## De-identification Functions

### Name Replacement
```typescript
function deidentifyName(name: string, mappingKey: string): string {
  // Generate consistent pseudonym
  const pseudonyms = generatePseudonym(mappingKey);
  return pseudonyms.fullName; // e.g., "John Doe" -> "Patient A001"
}
```

### Date Shifting
```typescript
function deidentifyDate(date: string, shiftDays: number): string {
  // Shift all dates by same offset per patient
  // Preserves intervals between events
  const original = new Date(date);
  original.setDate(original.getDate() + shiftDays);
  return original.toISOString().split('T')[0];
}

function deidentifyAge(birthDate: string): number | string {
  const age = calculateAge(birthDate);
  // HIPAA requires ages >89 to be grouped as "90+"
  return age > 89 ? "90+" : age;
}
```

### Geographic Generalization
```typescript
function deidentifyAddress(address: Address): Partial<Address> {
  return {
    state: address.state,
    // Remove: street, city, zip (if population <20,000)
    // First 3 digits of zip OK if population >20,000
    zipPrefix: isLargePopulation(address.zip) ? address.zip.slice(0, 3) : null
  };
}
```

### Identifier Replacement
```typescript
function deidentifyIdentifiers(patient: Patient, studyPrefix: string): DeidentifiedPatient {
  return {
    studyId: `${studyPrefix}-${generateStudyId()}`,  // Replace MRN
    // Remove: SSN, email, phone, account numbers
    // Keep: Clinical data, dates (shifted), demographics (generalized)
  };
}
```

## De-identified Patient Type

```typescript
interface DeidentifiedPatient {
  // Study identifier (replaces MRN)
  studyId: string;

  // Demographics (generalized)
  ageAtEvent: number | "90+";
  gender: string;
  raceEthnicity?: string;
  stateOfResidence?: string;

  // Clinical data (preserved)
  diagnoses: string[];        // ICD-10 codes
  procedures: string[];       // CPT codes
  medications: string[];      // Drug classes or RxNorm
  labResults: DeidentifiedLabResult[];

  // Dates (shifted)
  eventDates: ShiftedDate[];
}

interface DeidentifiedLabResult {
  testCode: string;           // LOINC code
  value: string | number;
  unit: string;
  dateOffset: number;         // Days from index date
}

interface ShiftedDate {
  eventType: string;
  dayOffset: number;          // Days from index date (date=0)
}
```

## Mapping File Structure

```typescript
interface DeidentificationMapping {
  studyId: string;
  originalMrn: string;        // Encrypted
  dateShiftDays: number;      // Random, consistent per patient
  createdAt: string;
  createdBy: string;

  // Never store in same location as de-identified data
}
```

## Safe Harbor Checklist

Before releasing de-identified data, verify:

- [ ] Names removed/replaced
- [ ] Addresses generalized to state level
- [ ] All dates except year removed or shifted
- [ ] Ages >89 grouped as 90+
- [ ] Phone numbers removed
- [ ] Email addresses removed
- [ ] SSN removed
- [ ] MRN replaced with study ID
- [ ] Account numbers removed
- [ ] No URLs or IP addresses
- [ ] No device identifiers
- [ ] No biometric data
- [ ] No photos
- [ ] Free-text fields reviewed for PHI

## Test Data Generation

```typescript
function generateTestPatient(): DeidentifiedPatient {
  return {
    studyId: `TEST-${randomId()}`,
    ageAtEvent: randomAge(18, 85),
    gender: randomChoice(["M", "F"]),
    stateOfResidence: randomState(),
    diagnoses: [randomICD10()],
    procedures: [randomCPT()],
    medications: [randomDrugClass()],
    labResults: generateTestLabs(),
    eventDates: generateTestTimeline(),
  };
}
```

## Validation

After de-identification, run these checks:

```bash
# Search for potential PHI leaks in de-identified output
grep -E "[0-9]{3}-[0-9]{2}-[0-9]{4}" output.json        # SSN
grep -E "[0-9]{3}-[0-9]{3}-[0-9]{4}" output.json        # Phone
grep -E "[\w.-]+@[\w.-]+\.\w+" output.json              # Email
grep -E "(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}" output.json  # Dates
```

## Execution Steps

1. Identify source data structure
2. Create mapping table (stored securely, separately)
3. Apply Safe Harbor rules to each field
4. Generate consistent pseudonyms/study IDs
5. Date-shift preserving intervals
6. Validate no residual PHI
7. Document de-identification method used
8. Archive mapping file in secure location

## Compliance Notes

- De-identified data is no longer PHI under HIPAA
- Mapping files ARE PHI and must be protected
- Keep de-identified data and mappings separate
- Document method used (Safe Harbor vs Expert Determination)
- Re-identification requires IRB approval
