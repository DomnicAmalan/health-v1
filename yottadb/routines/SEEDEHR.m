SEEDEHR ; Comprehensive EHR Sample Data ;2026-02-01
 ;
 ; Comprehensive seed data for testing Health V1 EHR system
 ; Creates 10 patients with realistic clinical scenarios
 ;
 ; Clinical Scenarios:
 ;   Patient 1: Type 2 Diabetes with Hypertension (existing - enhanced)
 ;   Patient 2: Migraine with Allergies (existing - enhanced)
 ;   Patient 3: Healthy Preventive Care (existing - enhanced)
 ;   Patient 4: Asthma with Seasonal Allergies
 ;   Patient 5: Chronic Heart Failure
 ;   Patient 6: COPD with Smoking History
 ;   Patient 7: Rheumatoid Arthritis
 ;   Patient 8: Hypothyroidism
 ;   Patient 9: Chronic Kidney Disease Stage 3
 ;   Patient 10: Depression and Anxiety
 ;
EN ; Entry point
 W "Seeding comprehensive EHR data...",!
 ;
 D PATIENTS   ; Create/enhance all 10 patients
 D VISITS     ; Create visits/encounters
 D PROBLEMS   ; Create problem lists
 D ALLERGIES  ; Create allergies
 D VITALS     ; Create vital signs with trends
 D MEDS       ; Create medications
 D LABS       ; Create lab results
 D DOCS       ; Create clinical documents
 D ORDERS     ; Create orders
 D APPTS      ; Create appointments
 ;
 W "Comprehensive EHR data seeded successfully!",!
 D SUMMARY    ; Print summary
 Q
 ;
PATIENTS ; Create/enhance 10 patients with comprehensive demographics
 W "  Creating patients...",!
 ;
 ; Patient 1: John Doe (existing - Type 2 DM + HTN)
 ; Already exists from INITVISTA - just enhance
 ;
 ; Patient 2: Jane Smith (existing - Migraine)
 ; Already exists from INITVISTA - just enhance
 ;
 ; Patient 3: Robert Johnson (existing - Healthy)
 ; Already exists from INITVISTA - just enhance
 ;
 ; Patient 4: Maria Garcia - Asthma
 S ^DPT(4,0)="GARCIA,MARIA^F^19850422^234567890"
 S ^DPT(4,.11)="321 Elm St^^Boston^MA^02101"
 S ^DPT(4,.13)="555-234-5678"
 S ^DPT(4,991)="MRN004"
 S ^DPT("B","GARCIA,MARIA",4)=""
 ;
 ; Patient 5: David Lee - CHF
 S ^DPT(5,0)="LEE,DAVID^M^19550815^345678901"
 S ^DPT(5,.11)="654 Maple Dr^^Seattle^WA^98101"
 S ^DPT(5,.13)="555-345-6789"
 S ^DPT(5,991)="MRN005"
 S ^DPT("B","LEE,DAVID",5)=""
 ;
 ; Patient 6: Patricia Williams - COPD
 S ^DPT(6,0)="WILLIAMS,PATRICIA^F^19600920^456789012"
 S ^DPT(6,.11)="987 Cedar Ln^^Denver^CO^80201"
 S ^DPT(6,.13)="555-456-7891"
 S ^DPT(6,991)="MRN006"
 S ^DPT("B","WILLIAMS,PATRICIA",6)=""
 ;
 ; Patient 7: Michael Brown - RA
 S ^DPT(7,0)="BROWN,MICHAEL^M^19701105^567890123"
 S ^DPT(7,.11)="159 Birch Ave^^Miami^FL^33101"
 S ^DPT(7,.13)="555-567-8912"
 S ^DPT(7,991)="MRN007"
 S ^DPT("B","BROWN,MICHAEL",7)=""
 ;
 ; Patient 8: Linda Martinez - Hypothyroidism
 S ^DPT(8,0)="MARTINEZ,LINDA^F^19820314^678901234"
 S ^DPT(8,.11)="753 Spruce Ct^^Phoenix^AZ^85001"
 S ^DPT(8,.13)="555-678-9123"
 S ^DPT(8,991)="MRN008"
 S ^DPT("B","MARTINEZ,LINDA",8)=""
 ;
 ; Patient 9: James Taylor - CKD
 S ^DPT(9,0)="TAYLOR,JAMES^M^19480630^789012345"
 S ^DPT(9,.11)="951 Willow Way^^Atlanta^GA^30301"
 S ^DPT(9,.13)="555-789-0123"
 S ^DPT(9,991)="MRN009"
 S ^DPT("B","TAYLOR,JAMES",9)=""
 ;
 ; Patient 10: Sarah Anderson - Depression/Anxiety
 S ^DPT(10,0)="ANDERSON,SARAH^F^19920725^890123456"
 S ^DPT(10,.11)="357 Aspen Blvd^^Austin^TX^78701"
 S ^DPT(10,.13)="555-890-1234"
 S ^DPT(10,991)="MRN010"
 S ^DPT("B","ANDERSON,SARAH",10)=""
 ;
 ; Update counter
 S ^DPT(0)="PATIENT^2^10^10"
 W "    Created 10 patients",!
 Q
 ;
VISITS ; Create visits/encounters
 W "  Creating visits...",!
 N IEN S IEN=0
 ;
 ; Visit format: ^AUPNVSIT(ien,0)="TYPE^PATIENT^DATE^TIME^LOCATION^PROVIDER^CC^STATUS"
 ;
 ; Patient 1 - DM/HTN visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^1^3260115^1400^INTERNAL MEDICINE^1^DIABETES FOLLOW-UP^COMPLETED"
 S ^AUPNVSIT("C",1,IEN)=""
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^1^3251210^0930^INTERNAL MEDICINE^1^ANNUAL PHYSICAL^COMPLETED"
 S ^AUPNVSIT("C",1,IEN)=""
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^1^3250815^1500^INTERNAL MEDICINE^1^HTN CHECK^COMPLETED"
 S ^AUPNVSIT("C",1,IEN)=""
 ;
 ; Patient 2 - Migraine visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^2^3260120^1030^NEUROLOGY^2^HEADACHE^COMPLETED"
 S ^AUPNVSIT("C",2,IEN)=""
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="EMERGENCY^2^3251105^2315^ER^3^SEVERE HEADACHE^COMPLETED"
 S ^AUPNVSIT("C",2,IEN)=""
 ;
 ; Patient 3 - Preventive visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^3^3260110^0900^FAMILY MEDICINE^1^ANNUAL EXAM^COMPLETED"
 S ^AUPNVSIT("C",3,IEN)=""
 ;
 ; Patient 4 - Asthma visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^4^3260125^1400^PULMONOLOGY^4^ASTHMA EXACERBATION^COMPLETED"
 S ^AUPNVSIT("C",4,IEN)=""
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^4^3251120^1000^PULMONOLOGY^4^ASTHMA FOLLOW-UP^COMPLETED"
 S ^AUPNVSIT("C",4,IEN)=""
 ;
 ; Patient 5 - CHF visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="INPATIENT^5^3260105^0800^CARDIOLOGY^5^HEART FAILURE EXACERBATION^ADMITTED"
 S ^AUPNVSIT("C",5,IEN)=""
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^5^3251115^1330^CARDIOLOGY^5^CHF FOLLOW-UP^COMPLETED"
 S ^AUPNVSIT("C",5,IEN)=""
 ;
 ; Patient 6 - COPD visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^6^3260118^0945^PULMONOLOGY^4^COPD MANAGEMENT^COMPLETED"
 S ^AUPNVSIT("C",6,IEN)=""
 ;
 ; Patient 7 - RA visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^7^3260122^1115^RHEUMATOLOGY^6^RA FOLLOW-UP^COMPLETED"
 S ^AUPNVSIT("C",7,IEN)=""
 ;
 ; Patient 8 - Hypothyroid visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^8^3260112^0830^ENDOCRINOLOGY^7^THYROID CHECK^COMPLETED"
 S ^AUPNVSIT("C",8,IEN)=""
 ;
 ; Patient 9 - CKD visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^9^3260108^1230^NEPHROLOGY^8^CKD FOLLOW-UP^COMPLETED"
 S ^AUPNVSIT("C",9,IEN)=""
 ;
 ; Patient 10 - Mental health visits
 S IEN=IEN+1,^AUPNVSIT(IEN,0)="OUTPATIENT^10^3260128^1600^PSYCHIATRY^9^DEPRESSION FOLLOW-UP^COMPLETED"
 S ^AUPNVSIT("C",10,IEN)=""
 ;
 S ^AUPNVSIT(0)="VISIT^9000010^"_IEN_"^"_IEN
 W "    Created "_IEN_" visits",!
 Q
 ;
PROBLEMS ; Create comprehensive problem lists
 W "  Creating problems...",!
 N IEN S IEN=3  ; Start after existing 3
 ;
 ; Format: ^AUPNPROB(ien,0)="DIAGNOSIS^PATIENT^ICD^SNOMED^ONSET^STATUS"
 ;
 ; Patient 1 - DM + HTN (problems 1,2 already exist, add more)
 S IEN=IEN+1,^AUPNPROB(IEN,0)="HYPERLIPIDEMIA^1^E78.5^^3230101^A"
 S ^AUPNPROB("C",1,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="OBESITY^1^E66.9^^3220515^A"
 S ^AUPNPROB("C",1,IEN)=""
 ;
 ; Patient 2 - Migraine (problem 3 exists)
 ; Add allergic rhinitis
 S IEN=IEN+1,^AUPNPROB(IEN,0)="ALLERGIC RHINITIS^2^J30.1^^3210920^A"
 S ^AUPNPROB("C",2,IEN)=""
 ;
 ; Patient 3 - Healthy (add minor issues)
 S IEN=IEN+1,^AUPNPROB(IEN,0)="VITAMIN D DEFICIENCY^3^E55.9^^3250110^A"
 S ^AUPNPROB("C",3,IEN)=""
 ;
 ; Patient 4 - Asthma
 S IEN=IEN+1,^AUPNPROB(IEN,0)="ASTHMA, MODERATE PERSISTENT^4^J45.40^^3200305^A"
 S ^AUPNPROB("C",4,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="SEASONAL ALLERGIC RHINITIS^4^J30.2^^3200305^A"
 S ^AUPNPROB("C",4,IEN)=""
 ;
 ; Patient 5 - CHF
 S IEN=IEN+1,^AUPNPROB(IEN,0)="HEART FAILURE WITH REDUCED EJECTION FRACTION^5^I50.22^^3220408^A"
 S ^AUPNPROB("C",5,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="ATRIAL FIBRILLATION^5^I48.91^^3210615^A"
 S ^AUPNPROB("C",5,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="HYPERTENSION^5^I10^^3200101^A"
 S ^AUPNPROB("C",5,IEN)=""
 ;
 ; Patient 6 - COPD
 S IEN=IEN+1,^AUPNPROB(IEN,0)="COPD, MODERATE^6^J44.1^^3180920^A"
 S ^AUPNPROB("C",6,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="TOBACCO USE DISORDER^6^F17.210^^3150101^A"
 S ^AUPNPROB("C",6,IEN)=""
 ;
 ; Patient 7 - RA
 S IEN=IEN+1,^AUPNPROB(IEN,0)="RHEUMATOID ARTHRITIS, MULTIPLE SITES^7^M06.09^^3160712^A"
 S ^AUPNPROB("C",7,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="CHRONIC PAIN SYNDROME^7^G89.29^^3170315^A"
 S ^AUPNPROB("C",7,IEN)=""
 ;
 ; Patient 8 - Hypothyroidism
 S IEN=IEN+1,^AUPNPROB(IEN,0)="HYPOTHYROIDISM, UNSPECIFIED^8^E03.9^^3190620^A"
 S ^AUPNPROB("C",8,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="FATIGUE^8^R53.83^^3190620^A"
 S ^AUPNPROB("C",8,IEN)=""
 ;
 ; Patient 9 - CKD
 S IEN=IEN+1,^AUPNPROB(IEN,0)="CHRONIC KIDNEY DISEASE STAGE 3^9^N18.3^^3210425^A"
 S ^AUPNPROB("C",9,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="HYPERTENSION^9^I10^^3150808^A"
 S ^AUPNPROB("C",9,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="TYPE 2 DIABETES MELLITUS^9^E11.9^^3180301^A"
 S ^AUPNPROB("C",9,IEN)=""
 ;
 ; Patient 10 - Mental health
 S IEN=IEN+1,^AUPNPROB(IEN,0)="MAJOR DEPRESSIVE DISORDER, RECURRENT^10^F33.1^^3220910^A"
 S ^AUPNPROB("C",10,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="GENERALIZED ANXIETY DISORDER^10^F41.1^^3220910^A"
 S ^AUPNPROB("C",10,IEN)=""
 S IEN=IEN+1,^AUPNPROB(IEN,0)="INSOMNIA^10^G47.00^^3230215^A"
 S ^AUPNPROB("C",10,IEN)=""
 ;
 S ^AUPNPROB(0)="PROBLEM^9000011^"_IEN_"^"_IEN
 W "    Created "_IEN_" problems",!
 Q
 ;
ALLERGIES ; Create allergy records
 W "  Creating allergies...",!
 N IEN S IEN=3  ; Start after existing 3
 ;
 ; Format: ^GMRA(ien,0)="ALLERGEN^PATIENT^TYPE^SEVERITY^REACTIONS^STATUS"
 ;
 ; Patient 1 already has Penicillin allergy
 ; Add sulfa allergy
 S IEN=IEN+1,^GMRA(IEN,0)="SULFA DRUGS^1^D^MO^RASH^A"
 S ^GMRA("C",1,IEN)=""
 ;
 ; Patient 2 already has Peanuts allergy
 ; Add shellfish
 S IEN=IEN+1,^GMRA(IEN,0)="SHELLFISH^2^F^SE^ANGIOEDEMA,DIFFICULTY BREATHING^A"
 S ^GMRA("C",2,IEN)=""
 S IEN=IEN+1,^GMRA(IEN,0)="POLLEN^2^E^MI^SNEEZING,ITCHY EYES^A"
 S ^GMRA("C",2,IEN)=""
 ;
 ; Patient 3 - NKDA (no known drug allergies) - add latex from existing
 ; Already has latex allergy
 ;
 ; Patient 4 - Asthma patient
 S IEN=IEN+1,^GMRA(IEN,0)="DUST MITES^4^E^MO^WHEEZING,COUGH^A"
 S ^GMRA("C",4,IEN)=""
 S IEN=IEN+1,^GMRA(IEN,0)="CAT DANDER^4^E^MO^ASTHMA EXACERBATION^A"
 S ^GMRA("C",4,IEN)=""
 S IEN=IEN+1,^GMRA(IEN,0)="ASPIRIN^4^D^SE^BRONCHOSPASM^A"
 S ^GMRA("C",4,IEN)=""
 ;
 ; Patient 5 - CHF
 S IEN=IEN+1,^GMRA(IEN,0)="CONTRAST DYE^5^D^MO^HIVES,PRURITUS^A"
 S ^GMRA("C",5,IEN)=""
 ;
 ; Patient 6 - COPD - NKDA
 ;
 ; Patient 7 - RA
 S IEN=IEN+1,^GMRA(IEN,0)="NSAIDS^7^D^SE^GI BLEEDING^A"
 S ^GMRA("C",7,IEN)=""
 ;
 ; Patient 8 - Hypothyroid - NKDA
 ;
 ; Patient 9 - CKD
 S IEN=IEN+1,^GMRA(IEN,0)="IODINATED CONTRAST^9^D^SE^ACUTE KIDNEY INJURY^A"
 S ^GMRA("C",9,IEN)=""
 ;
 ; Patient 10 - Mental health - NKDA
 ;
 S ^GMRA(0)="ALLERGY^120.8^"_IEN_"^"_IEN
 W "    Created "_IEN_" allergies",!
 Q
 ;
VITALS ; Create vital signs with realistic trends
 W "  Creating vital signs...",!
 N IEN S IEN=0
 ;
 ; Format: ^GMR(120.5,ien,0)="DATE_TIME^PATIENT^TYPE^VALUE^UNIT"
 ; Types: BP, HR, TEMP, RR, O2SAT, HEIGHT, WEIGHT, BMI
 ;
 ; Helper to create full vitals set for a visit
 ; D VSET(patient,date,time,bp_sys,bp_dia,hr,temp,rr,o2,wt)
 ;
 ; Patient 1 - DM/HTN - Multiple readings showing BP control
 D VSET(1,"3260115","1400",138,88,78,98.2,16,97,210)
 D VSET(1,"3251210","0930",142,92,82,98.4,18,96,215)
 D VSET(1,"3250815","1500",148,94,80,98.6,17,97,218)
 ;
 ; Patient 2 - Migraine
 D VSET(2,"3260120","1030",118,75,72,98.4,14,99,135)
 D VSET(2,"3251105","2315",125,82,88,99.1,16,98,138)
 ;
 ; Patient 3 - Healthy
 D VSET(3,"3260110","0900",115,72,68,98.2,14,99,175)
 ;
 ; Patient 4 - Asthma
 D VSET(4,"3260125","1400",120,78,92,98.8,22,94,145)
 D VSET(4,"3251120","1000",118,76,76,98.3,16,98,143)
 ;
 ; Patient 5 - CHF - Elevated HR, lower O2
 D VSET(5,"3260105","0800",110,68,98,98.1,20,91,195)
 D VSET(5,"3251115","1330",115,70,92,98.3,18,93,198)
 ;
 ; Patient 6 - COPD - Low O2, elevated RR
 D VSET(6,"3260118","0945",128,82,88,98.5,22,90,168)
 ;
 ; Patient 7 - RA
 D VSET(7,"3260122","1115",122,78,74,98.3,15,98,182)
 ;
 ; Patient 8 - Hypothyroid
 D VSET(8,"3260112","0830",112,70,62,97.8,14,99,165)
 ;
 ; Patient 9 - CKD
 D VSET(9,"3260108","1230",152,95,76,98.4,16,97,188)
 ;
 ; Patient 10 - Mental health
 D VSET(10,"3260128","1600",108,68,88,98.2,16,99,128)
 ;
 N VCNT S VCNT=$$VCNT
 S ^GMR(120.5,0)="VITAL MEASUREMENT^120.5^"_VCNT_"^"_VCNT
 W "    Created "_VCNT_" vital sign records",!
 Q
 ;
VSET(PAT,DT,TM,SYS,DIA,HR,TEMP,RR,O2,WT) ; Create complete vital set
 ; Creates 9 vital records for one encounter
 N IEN,DTM
 S DTM=DT_"."_TM
 ;
 ; BP
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^BP^"_SYS_"/"_DIA_"^MMHG"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 ; HR
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^HR^"_HR_"^BPM"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 ; TEMP
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^TEMP^"_TEMP_"^F"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 ; RR
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^RR^"_RR_"^BPM"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 ; O2SAT
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^O2SAT^"_O2_"^%"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 ; WEIGHT
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^WEIGHT^"_WT_"^LBS"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 ; HEIGHT (assume 5'8" = 68 inches for all - simplified)
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^HEIGHT^68^IN"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 ; BMI (calculated)
 N BMI S BMI=$J(WT*703/(68*68),0,1)
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^BMI^"_BMI_"^KG/M2"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 ; PAIN (0-10 scale, most patients 0-2)
 N PAIN S PAIN=$R(3)
 S IEN=$$NIEN,^GMR(120.5,IEN,0)=DTM_"^"_PAT_"^PAIN^"_PAIN_"^/10"
 S ^GMR(120.5,"C",PAT,IEN)=""
 ;
 Q
 ;
NIEN() ; Get next IEN for vitals
 N LAST S LAST=$O(^GMR(120.5,""),-1)
 Q $S(LAST="":1,1:LAST+1)
 ;
VCNT() ; Count vitals
 N CNT,I S (CNT,I)=0
 F  S I=$O(^GMR(120.5,I)) Q:I=""  S CNT=CNT+1
 Q CNT
 ;
MEDS ; Create medication records
 W "  Creating medications...",!
 N IEN S IEN=0
 ;
 ; Format: ^PS(52,ien,0)="RX_NUM^PATIENT^DRUG^DOSE^ROUTE^FREQ^QTY^DAYS^REFILLS^STATUS"
 ;
 ; Patient 1 - DM + HTN
 S IEN=IEN+1,^PS(52,IEN,0)="RX000001^1^METFORMIN 1000MG TAB^1000MG^PO^BID^180^90^3^ACTIVE"
 S ^PS(52,"C",1,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000002^1^LISINOPRIL 20MG TAB^20MG^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",1,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000003^1^ATORVASTATIN 40MG TAB^40MG^PO^QHS^90^90^3^ACTIVE"
 S ^PS(52,"C",1,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000004^1^ASPIRIN 81MG TAB^81MG^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",1,IEN)=""
 ;
 ; Patient 2 - Migraine
 S IEN=IEN+1,^PS(52,IEN,0)="RX000005^2^SUMATRIPTAN 100MG TAB^100MG^PO^PRN^9^30^2^ACTIVE"
 S ^PS(52,"C",2,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000006^2^PROPRANOLOL 80MG TAB^80MG^PO^BID^180^90^3^ACTIVE"
 S ^PS(52,"C",2,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000007^2^CETIRIZINE 10MG TAB^10MG^PO^DAILY^30^30^5^ACTIVE"
 S ^PS(52,"C",2,IEN)=""
 ;
 ; Patient 3 - Healthy (just vitamin D)
 S IEN=IEN+1,^PS(52,IEN,0)="RX000008^3^VITAMIN D3 2000 UNIT CAP^2000U^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",3,IEN)=""
 ;
 ; Patient 4 - Asthma
 S IEN=IEN+1,^PS(52,IEN,0)="RX000009^4^ALBUTEROL HFA 90MCG INH^2PUFFS^INH^Q4H PRN^1^30^5^ACTIVE"
 S ^PS(52,"C",4,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000010^4^FLUTICASONE 250MCG INH^2PUFFS^INH^BID^1^30^11^ACTIVE"
 S ^PS(52,"C",4,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000011^4^MONTELUKAST 10MG TAB^10MG^PO^QHS^30^30^11^ACTIVE"
 S ^PS(52,"C",4,IEN)=""
 ;
 ; Patient 5 - CHF
 S IEN=IEN+1,^PS(52,IEN,0)="RX000012^5^FUROSEMIDE 40MG TAB^40MG^PO^BID^60^30^3^ACTIVE"
 S ^PS(52,"C",5,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000013^5^CARVEDILOL 25MG TAB^25MG^PO^BID^60^30^3^ACTIVE"
 S ^PS(52,"C",5,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000014^5^LISINOPRIL 40MG TAB^40MG^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",5,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000015^5^SPIRONOLACTONE 25MG TAB^25MG^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",5,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000016^5^WARFARIN 5MG TAB^5MG^PO^DAILY^30^30^1^ACTIVE"
 S ^PS(52,"C",5,IEN)=""
 ;
 ; Patient 6 - COPD
 S IEN=IEN+1,^PS(52,IEN,0)="RX000017^6^TIOTROPIUM 18MCG INH^1CAP^INH^DAILY^30^30^11^ACTIVE"
 S ^PS(52,"C",6,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000018^6^ALBUTEROL/IPRATROPIUM INH^2PUFFS^INH^QID^1^30^11^ACTIVE"
 S ^PS(52,"C",6,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000019^6^PREDNISONE 10MG TAB^10MG^PO^DAILY^30^30^2^ACTIVE"
 S ^PS(52,"C",6,IEN)=""
 ;
 ; Patient 7 - RA
 S IEN=IEN+1,^PS(52,IEN,0)="RX000020^7^METHOTREXATE 15MG TAB^15MG^PO^WEEKLY^12^84^3^ACTIVE"
 S ^PS(52,"C",7,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000021^7^FOLIC ACID 1MG TAB^1MG^PO^DAILY^90^90^11^ACTIVE"
 S ^PS(52,"C",7,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000022^7^TRAMADOL 50MG TAB^50MG^PO^Q6H PRN^120^30^0^ACTIVE"
 S ^PS(52,"C",7,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000023^7^PREDNISONE 5MG TAB^5MG^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",7,IEN)=""
 ;
 ; Patient 8 - Hypothyroid
 S IEN=IEN+1,^PS(52,IEN,0)="RX000024^8^LEVOTHYROXINE 100MCG TAB^100MCG^PO^DAILY^90^90^11^ACTIVE"
 S ^PS(52,"C",8,IEN)=""
 ;
 ; Patient 9 - CKD
 S IEN=IEN+1,^PS(52,IEN,0)="RX000025^9^LISINOPRIL 40MG TAB^40MG^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",9,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000026^9^METFORMIN 500MG TAB^500MG^PO^BID^180^90^3^ACTIVE"
 S ^PS(52,"C",9,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000027^9^ATORVASTATIN 20MG TAB^20MG^PO^QHS^90^90^3^ACTIVE"
 S ^PS(52,"C",9,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000028^9^CALCITRIOL 0.25MCG CAP^0.25MCG^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",9,IEN)=""
 ;
 ; Patient 10 - Mental health
 S IEN=IEN+1,^PS(52,IEN,0)="RX000029^10^SERTRALINE 100MG TAB^100MG^PO^DAILY^90^90^3^ACTIVE"
 S ^PS(52,"C",10,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000030^10^BUSPIRONE 15MG TAB^15MG^PO^BID^60^30^3^ACTIVE"
 S ^PS(52,"C",10,IEN)=""
 S IEN=IEN+1,^PS(52,IEN,0)="RX000031^10^TRAZODONE 50MG TAB^50MG^PO^QHS PRN^30^30^2^ACTIVE"
 S ^PS(52,"C",10,IEN)=""
 ;
 S ^PS(52,0)="PRESCRIPTION^52^"_IEN_"^"_IEN
 W "    Created "_IEN_" medications",!
 Q
 ;
LABS ; Create lab results
 W "  Creating lab results...",!
 W "    (Lab implementation pending - placeholder)",!
 ; TODO: Implement comprehensive lab results
 ; CBC, CMP, Lipid panel, HbA1c, TSH, etc.
 Q
 ;
DOCS ; Create clinical documents
 W "  Creating clinical documents...",!
 W "    (Documents implementation pending - placeholder)",!
 ; TODO: Implement clinical notes
 ; Progress notes, H&P, discharge summaries
 Q
 ;
ORDERS ; Create orders
 W "  Creating orders...",!
 W "    (Orders implementation pending - placeholder)",!
 ; TODO: Implement orders
 ; Lab orders, radiology orders, medication orders
 Q
 ;
APPTS ; Create appointments
 W "  Creating appointments...",!
 W "    (Appointments implementation pending - placeholder)",!
 ; TODO: Implement appointments
 ; Past, current, upcoming appointments
 Q
 ;
SUMMARY ; Print summary of seeded data
 W !,"=== EHR Data Summary ===",!
 W "Patients: "_$P(^DPT(0),"^",3),!
 W "Visits: "_$P(^AUPNVSIT(0),"^",3),!
 W "Problems: "_$P(^AUPNPROB(0),"^",3),!
 W "Allergies: "_$P(^GMRA(0),"^",3),!
 W "Vital Signs: "_$$VCNT,!
 W "Medications: "_$P(^PS(52,0),"^",3),!
 W "========================",!
 Q
