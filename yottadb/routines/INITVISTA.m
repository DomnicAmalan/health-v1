INITVISTA ; Initialize VistA-style globals for EHR ;2024-01-01
 ;
 ; Creates the basic VistA global structure
 ; Globals:
 ;   ^DPT - Patient Demographics (File #2)
 ;   ^AUPNVSIT - Visits (File #9000010)
 ;   ^AUPNPROB - Problems (File #9000011)
 ;   ^PS - Pharmacy/Medications (File #52)
 ;   ^GMR - Vitals (File #120.5)
 ;   ^GMRA - Allergies (File #120.8)
 ;   ^LR - Lab Results (File #63)
 ;   ^TIU - Clinical Documents (File #8925)
 ;   ^OR - Orders (File #100)
 ;   ^SD - Scheduling (File #44)
 ;   ^DD - Data Dictionary
 ;   ^DIC - File Attributes
 ;
EN ; Entry point
 W "Initializing VistA globals...",!
 ;
 D INITDD     ; Data Dictionary
 D INITDIC    ; File definitions
 D INITIDX    ; Initialize indexes
 D SEEDDATA  ; Seed basic sample data
 ;
 ; Load comprehensive EHR data
 I $D(^DPT)>1 D  ; Only if basic data exists
 . W !,"Loading comprehensive EHR data...",!
 . D EN^SEEDEHR  ; Call comprehensive seed script
 ;
 W "VistA globals initialized.",!
 Q
 ;
INITDD ; Initialize Data Dictionary (^DD)
 W "  Setting up Data Dictionary...",!
 ;
 ; File #2 - Patient
 S ^DD(2,0)="PATIENT^2"
 S ^DD(2,.01,0)="NAME^RF^^0;1"
 S ^DD(2,.02,0)="SEX^S^M:MALE;F:FEMALE;^0;2"
 S ^DD(2,.03,0)="DATE OF BIRTH^D^^0;3"
 S ^DD(2,.09,0)="SOCIAL SECURITY NUMBER^RF^^0;9"
 S ^DD(2,.111,0)="STREET ADDRESS 1^F^^.11;1"
 S ^DD(2,.112,0)="STREET ADDRESS 2^F^^.11;2"
 S ^DD(2,.114,0)="CITY^F^^.11;4"
 S ^DD(2,.115,0)="STATE^P5'^DIC(5,^.11;5"
 S ^DD(2,.116,0)="ZIP CODE^F^^.11;6"
 S ^DD(2,.131,0)="PHONE NUMBER^F^^.13;1"
 S ^DD(2,991,0)="MRN^F^^991;1"
 ;
 ; File #9000011 - Problem
 S ^DD(9000011,0)="PROBLEM^9000011"
 S ^DD(9000011,.01,0)="DIAGNOSIS^RF^^0;1"
 S ^DD(9000011,.02,0)="PATIENT^P2'^DPT(^0;2"
 S ^DD(9000011,.03,0)="ICD DIAGNOSIS^F^^0;3"
 S ^DD(9000011,.04,0)="SNOMED CT^F^^0;4"
 S ^DD(9000011,.05,0)="DATE OF ONSET^D^^0;5"
 S ^DD(9000011,.06,0)="STATUS^S^A:ACTIVE;I:INACTIVE;^0;6"
 ;
 ; File #120.8 - Allergy
 S ^DD(120.8,0)="ALLERGY^120.8"
 S ^DD(120.8,.01,0)="ALLERGEN^RF^^0;1"
 S ^DD(120.8,.02,0)="PATIENT^P2'^DPT(^0;2"
 S ^DD(120.8,.03,0)="ALLERGY TYPE^S^D:DRUG;F:FOOD;E:ENVIRONMENTAL;O:OTHER;^0;3"
 S ^DD(120.8,.04,0)="SEVERITY^S^MI:MILD;MO:MODERATE;SE:SEVERE;LT:LIFE-THREATENING;^0;4"
 S ^DD(120.8,.05,0)="REACTIONS^F^^0;5"
 S ^DD(120.8,.06,0)="STATUS^S^A:ACTIVE;I:INACTIVE;E:ENTERED IN ERROR;^0;6"
 ;
 ; File #120.5 - Vitals
 S ^DD(120.5,0)="VITAL MEASUREMENT^120.5"
 S ^DD(120.5,.01,0)="DATE/TIME TAKEN^RD^^0;1"
 S ^DD(120.5,.02,0)="PATIENT^P2'^DPT(^0;2"
 S ^DD(120.5,.03,0)="VITAL TYPE^RF^^0;3"
 S ^DD(120.5,.04,0)="VALUE^RF^^0;4"
 S ^DD(120.5,.05,0)="UNIT^F^^0;5"
 ;
 ; File #63 - Lab
 S ^DD(63,0)="LAB DATA^63"
 S ^DD(63,.01,0)="LRDFN^RF^^0;1"
 S ^DD(63,.02,0)="PATIENT^P2'^DPT(^0;2"
 S ^DD(63,.03,0)="SPECIMEN^F^^0;3"
 S ^DD(63,.04,0)="DATE COLLECTED^D^^0;4"
 ;
 ; File #8925 - TIU Document
 S ^DD(8925,0)="TIU DOCUMENT^8925"
 S ^DD(8925,.01,0)="DOCUMENT TYPE^P8925.1'^TIU(8925.1,^0;1"
 S ^DD(8925,.02,0)="PATIENT^P2'^DPT(^0;2"
 S ^DD(8925,.03,0)="VISIT^P9000010'^AUPNVSIT(^0;3"
 S ^DD(8925,.05,0)="STATUS^S^U:UNSIGNED;S:SIGNED;A:ADDENDED;^0;5"
 S ^DD(8925,.06,0)="AUTHOR^P200'^VA(200,^0;6"
 S ^DD(8925,.07,0)="REFERENCE DATE^D^^0;7"
 S ^DD(8925,2,0)="TEXT^8925.03^^2;0"
 ;
 W "  Data Dictionary initialized.",!
 Q
 ;
INITDIC ; Initialize File Definitions (^DIC)
 W "  Setting up File definitions...",!
 ;
 S ^DIC(2,0)="PATIENT^2^DPT("
 S ^DIC(2,0,"GL")="^DPT("
 S ^DIC(9000010,0)="VISIT^9000010^AUPNVSIT("
 S ^DIC(9000010,0,"GL")="^AUPNVSIT("
 S ^DIC(9000011,0)="PROBLEM^9000011^AUPNPROB("
 S ^DIC(9000011,0,"GL")="^AUPNPROB("
 S ^DIC(52,0)="PRESCRIPTION^52^PS(52,"
 S ^DIC(52,0,"GL")="^PS(52,"
 S ^DIC(120.5,0)="VITAL MEASUREMENT^120.5^GMR(120.5,"
 S ^DIC(120.5,0,"GL")="^GMR(120.5,"
 S ^DIC(120.8,0)="ALLERGY^120.8^GMRA("
 S ^DIC(120.8,0,"GL")="^GMRA("
 S ^DIC(63,0)="LAB DATA^63^LR("
 S ^DIC(63,0,"GL")="^LR("
 S ^DIC(8925,0)="TIU DOCUMENT^8925^TIU(8925,"
 S ^DIC(8925,0,"GL")="^TIU(8925,"
 S ^DIC(100,0)="ORDER^100^OR(100,"
 S ^DIC(100,0,"GL")="^OR(100,"
 S ^DIC(44,0)="HOSPITAL LOCATION^44^SC("
 S ^DIC(44,0,"GL")="^SC("
 ;
 W "  File definitions initialized.",!
 Q
 ;
INITIDX ; Initialize index structures
 W "  Setting up indexes...",!
 ;
 ; Patient B index (by name)
 S ^DPT(0)="PATIENT^2^0^0"
 ;
 ; Problem C index (by patient)
 S ^AUPNPROB(0)="PROBLEM^9000011^0^0"
 ;
 ; Allergy C index (by patient)
 S ^GMRA(0)="ALLERGY^120.8^0^0"
 ;
 W "  Indexes initialized.",!
 Q
 ;
SEEDDATA ; Seed sample data for testing
 W "  Seeding sample data...",!
 ;
 ; Sample patients
 S ^DPT(1,0)="DOE,JOHN^M^19800115^123456789"
 S ^DPT(1,.11)="123 Main St^^Anytown^CA^90210"
 S ^DPT(1,.13)="555-123-4567"
 S ^DPT(1,991)="MRN001"
 S ^DPT("B","DOE,JOHN",1)=""
 ;
 S ^DPT(2,0)="SMITH,JANE^F^19750620^987654321"
 S ^DPT(2,.11)="456 Oak Ave^^Springfield^IL^62701"
 S ^DPT(2,.13)="555-987-6543"
 S ^DPT(2,991)="MRN002"
 S ^DPT("B","SMITH,JANE",2)=""
 ;
 S ^DPT(3,0)="JOHNSON,ROBERT^M^19901210^456789123"
 S ^DPT(3,.11)="789 Pine Rd^^Portland^OR^97201"
 S ^DPT(3,.13)="555-456-7890"
 S ^DPT(3,991)="MRN003"
 S ^DPT("B","JOHNSON,ROBERT",3)=""
 ;
 ; Sample problems
 S ^AUPNPROB(1,0)="HYPERTENSION^1^I10^^3240101^A"
 S ^AUPNPROB("C",1,1)=""
 ;
 S ^AUPNPROB(2,0)="TYPE 2 DIABETES MELLITUS^1^E11.9^^3230615^A"
 S ^AUPNPROB("C",1,2)=""
 ;
 S ^AUPNPROB(3,0)="MIGRAINE^2^G43.909^^3220301^A"
 S ^AUPNPROB("C",2,3)=""
 ;
 ; Sample allergies
 S ^GMRA(1,0)="PENICILLIN^1^D^SE^RASH,HIVES^A"
 S ^GMRA("C",1,1)=""
 ;
 S ^GMRA(2,0)="PEANUTS^2^F^LT^ANAPHYLAXIS^A"
 S ^GMRA("C",2,2)=""
 ;
 S ^GMRA(3,0)="LATEX^3^E^MO^SKIN IRRITATION^A"
 S ^GMRA("C",3,3)=""
 ;
 ; Update counters
 S ^DPT(0)="PATIENT^2^3^3"
 S ^AUPNPROB(0)="PROBLEM^9000011^3^3"
 S ^GMRA(0)="ALLERGY^120.8^3^3"
 ;
 W "  Sample data seeded (3 patients, 3 problems, 3 allergies).",!
 Q
 ;
RESET ; Reset all globals (DANGEROUS - for testing only)
 W "WARNING: This will delete all EHR data!",!
 ;
 K ^DPT
 K ^AUPNVSIT
 K ^AUPNPROB
 K ^PS
 K ^GMR
 K ^GMRA
 K ^LR
 K ^TIU
 K ^OR
 K ^SD
 K ^DD
 K ^DIC
 ;
 W "All globals killed.",!
 D INITVISTA
 Q
