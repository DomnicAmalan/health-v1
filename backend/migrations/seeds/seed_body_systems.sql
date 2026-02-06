-- Seed data: Body systems taxonomy with 3D model mappings
-- Based on anatomical textbook organization (Gray's Anatomy / Netter's Atlas)

-- Root system categories
INSERT INTO body_systems (system_code, system_name, parent_system_id, icd10_chapter, model_region_id, display_color, common_findings) VALUES

-- HEAD & NECK SYSTEM
('HEAD_NECK', 'Head and Neck', NULL, 'VII', 'HEAD_NECK_System', '#9B59B6',
 ARRAY['Normal cranial examination', 'No facial asymmetry', 'Neck supple, no masses', 'Normal thyroid palpation']),

('HEAD_NECK_BRAIN', 'Brain', (SELECT id FROM body_systems WHERE system_code = 'HEAD_NECK'), 'VI', 'brain_cerebrum', '#8E44AD',
 ARRAY['Alert and oriented x3', 'Cranial nerves II-XII intact', 'No focal neurological deficits']),

('HEAD_NECK_SKULL', 'Skull', (SELECT id FROM body_systems WHERE system_code = 'HEAD_NECK'), 'XIII', 'skull_frontal_bone', '#A569BD',
 ARRAY['Normocephalic, atraumatic', 'No scalp lesions', 'No cranial tenderness']),

('HEAD_NECK_EYES', 'Eyes', (SELECT id FROM body_systems WHERE system_code = 'HEAD_NECK'), 'VII', 'eye_left', '#5DADE2',
 ARRAY['PERRLA', 'Extraocular movements intact', 'No conjunctival injection', 'Visual acuity 20/20 bilaterally']),

('HEAD_NECK_EARS', 'Ears', (SELECT id FROM body_systems WHERE system_code = 'HEAD_NECK'), 'VIII', 'ear_external_left', '#F39C12',
 ARRAY['Tympanic membranes intact bilaterally', 'No discharge', 'Hearing grossly intact', 'No mastoid tenderness']),

('HEAD_NECK_NOSE', 'Nose and Sinuses', (SELECT id FROM body_systems WHERE system_code = 'HEAD_NECK'), 'X', 'nasal_cavity', '#E67E22',
 ARRAY['Nasal mucosa pink and moist', 'No septal deviation', 'Sinuses non-tender', 'No nasal discharge']),

('HEAD_NECK_ORAL', 'Oral Cavity and Pharynx', (SELECT id FROM body_systems WHERE system_code = 'HEAD_NECK'), 'XI', 'tongue', '#C0392B',
 ARRAY['Oropharynx clear', 'Mucosa moist', 'No tonsillar exudate', 'Dentition adequate']),

('HEAD_NECK_THYROID', 'Thyroid and Neck Structures', (SELECT id FROM body_systems WHERE system_code = 'HEAD_NECK'), 'IV', 'thyroid_gland', '#16A085',
 ARRAY['Thyroid non-palpable', 'No cervical lymphadenopathy', 'No JVD', 'Carotid pulses 2+ bilaterally']),

-- CARDIOVASCULAR SYSTEM
('CARDIOVASCULAR', 'Cardiovascular System', NULL, 'IX', 'CARDIOVASCULAR_System', '#E74C3C',
 ARRAY['Regular rate and rhythm', 'No murmurs, rubs, or gallops', 'S1 and S2 normal', 'PMI at 5th intercostal space']),

('CARDIOVASCULAR_HEART', 'Heart', (SELECT id FROM body_systems WHERE system_code = 'CARDIOVASCULAR'), 'IX', 'heart_right_atrium', '#C0392B',
 ARRAY['Normal S1 and S2', 'No S3 or S4', 'No murmurs appreciated', 'Heart sounds clear']),

('CARDIOVASCULAR_VESSELS', 'Blood Vessels', (SELECT id FROM body_systems WHERE system_code = 'CARDIOVASCULAR'), 'IX', 'aorta_ascending', '#E74C3C',
 ARRAY['Peripheral pulses 2+ bilaterally', 'No bruits', 'Capillary refill <2 seconds', 'No edema']),

-- RESPIRATORY SYSTEM
('RESPIRATORY', 'Respiratory System', NULL, 'X', 'RESPIRATORY_System', '#3498DB',
 ARRAY['Clear to auscultation bilaterally', 'No wheezes, rales, or rhonchi', 'Respiratory effort normal', 'No accessory muscle use']),

('RESPIRATORY_LUNGS', 'Lungs', (SELECT id FROM body_systems WHERE system_code = 'RESPIRATORY'), 'X', 'lung_right_upper_lobe', '#2E86C1',
 ARRAY['Breath sounds equal bilaterally', 'Vesicular breath sounds', 'No crackles or wheezes', 'Resonant to percussion']),

('RESPIRATORY_AIRWAYS', 'Airways', (SELECT id FROM body_systems WHERE system_code = 'RESPIRATORY'), 'X', 'trachea_thoracic', '#5DADE2',
 ARRAY['Trachea midline', 'No stridor', 'Upper airway patent', 'No respiratory distress']),

('RESPIRATORY_PLEURA', 'Pleura and Diaphragm', (SELECT id FROM body_systems WHERE system_code = 'RESPIRATORY'), 'X', 'pleura_left', '#85C1E9',
 ARRAY['No pleural rub', 'Diaphragmatic excursion normal', 'No pleural effusion signs', 'Tactile fremitus normal']),

-- DIGESTIVE SYSTEM
('DIGESTIVE', 'Digestive System', NULL, 'XI', 'DIGESTIVE_System', '#F39C12',
 ARRAY['Abdomen soft, non-tender, non-distended', 'Bowel sounds present in all quadrants', 'No organomegaly', 'No rebound or guarding']),

('DIGESTIVE_LIVER', 'Liver', (SELECT id FROM body_systems WHERE system_code = 'DIGESTIVE'), 'XI', 'liver_right_lobe', '#D68910',
 ARRAY['Liver edge non-palpable', 'No hepatomegaly', 'Liver span 6-12 cm', 'No tenderness to percussion']),

('DIGESTIVE_STOMACH', 'Stomach', (SELECT id FROM body_systems WHERE system_code = 'DIGESTIVE'), 'XI', 'stomach_body', '#E67E22',
 ARRAY['Epigastrium non-tender', 'No palpable masses', 'No distension', 'Tympanic to percussion']),

('DIGESTIVE_INTESTINES', 'Intestines', (SELECT id FROM body_systems WHERE system_code = 'DIGESTIVE'), 'XI', 'intestine_small_duodenum', '#CA6F1E',
 ARRAY['Bowel sounds normoactive', 'No peritoneal signs', 'No masses palpated', 'McBurney point non-tender']),

('DIGESTIVE_PANCREAS', 'Pancreas', (SELECT id FROM body_systems WHERE system_code = 'DIGESTIVE'), 'XI', 'pancreas_head', '#BA4A00',
 ARRAY['No epigastric tenderness', 'No palpable mass', 'No Murphy sign', 'Pancreas non-palpable']),

('DIGESTIVE_GALLBLADDER', 'Gallbladder', (SELECT id FROM body_systems WHERE system_code = 'DIGESTIVE'), 'XI', 'gallbladder', '#7D6608',
 ARRAY['No RUQ tenderness', 'Murphy sign negative', 'No palpable gallbladder', 'No jaundice']),

('DIGESTIVE_SPLEEN', 'Spleen', (SELECT id FROM body_systems WHERE system_code = 'DIGESTIVE'), 'XI', 'spleen', '#A04000',
 ARRAY['Spleen non-palpable', 'No splenomegaly', 'Traube space dull', 'No LUQ tenderness']),

-- URINARY SYSTEM
('URINARY', 'Urinary System', NULL, 'XIV', 'URINARY_System', '#16A085',
 ARRAY['No CVA tenderness', 'Bladder non-distended', 'No suprapubic tenderness', 'Normal urine color']),

('URINARY_KIDNEYS', 'Kidneys', (SELECT id FROM body_systems WHERE system_code = 'URINARY'), 'XIV', 'kidney_right', '#138D75',
 ARRAY['No costovertebral angle tenderness', 'Kidneys non-palpable', 'No renal bruits', 'No flank masses']),

('URINARY_BLADDER', 'Bladder', (SELECT id FROM body_systems WHERE system_code = 'URINARY'), 'XIV', 'bladder', '#1ABC9C',
 ARRAY['Bladder non-distended', 'No suprapubic tenderness', 'Normal bladder percussion', 'No urinary retention']),

-- REPRODUCTIVE SYSTEM
('REPRODUCTIVE_MALE', 'Male Reproductive System', NULL, 'XIV', 'prostate', '#884EA0',
 ARRAY['Genitalia normal', 'Testes descended bilaterally', 'No hernias', 'Prostate normal size and consistency']),

('REPRODUCTIVE_FEMALE', 'Female Reproductive System', NULL, 'XIV', 'uterus', '#7D3C98',
 ARRAY['External genitalia normal', 'Cervix visualized', 'Uterus non-tender', 'Adnexa non-palpable']),

-- MUSCULOSKELETAL SYSTEM
('MUSCULOSKELETAL', 'Musculoskeletal System', NULL, 'XIII', 'MUSCULOSKELETAL_System', '#34495E',
 ARRAY['Full ROM all joints', 'No joint swelling or deformity', 'Strength 5/5 all extremities', 'Normal gait']),

('MUSCULOSKELETAL_SPINE', 'Spine', (SELECT id FROM body_systems WHERE system_code = 'MUSCULOSKELETAL'), 'XIII', 'vertebrae_lumbar_l1', '#2C3E50',
 ARRAY['Spine alignment normal', 'No paraspinal tenderness', 'Straight leg raise negative', 'Full spinal ROM']),

('MUSCULOSKELETAL_UPPER', 'Upper Extremities', (SELECT id FROM body_systems WHERE system_code = 'MUSCULOSKELETAL'), 'XIII', 'humerus_right', '#566573',
 ARRAY['Strength 5/5 bilaterally', 'Full ROM shoulders, elbows, wrists', 'No deformity', 'Normal sensation']),

('MUSCULOSKELETAL_LOWER', 'Lower Extremities', (SELECT id FROM body_systems WHERE system_code = 'MUSCULOSKELETAL'), 'XIII', 'femur_right', '#5D6D7E',
 ARRAY['Strength 5/5 bilaterally', 'Full ROM hips, knees, ankles', 'No edema', 'Pedal pulses 2+']),

-- NERVOUS SYSTEM
('NEUROLOGICAL', 'Nervous System', NULL, 'VI', 'NERVOUS_System', '#8E44AD',
 ARRAY['Alert and oriented x3', 'Cranial nerves intact', 'Motor 5/5 all extremities', 'Sensation intact', 'DTRs 2+ symmetric']),

('NEUROLOGICAL_CENTRAL', 'Central Nervous System', (SELECT id FROM body_systems WHERE system_code = 'NEUROLOGICAL'), 'VI', 'brain_cerebrum_frontal_lobe', '#7D3C98',
 ARRAY['Mental status normal', 'No focal deficits', 'Coordination intact', 'Gait steady']),

('NEUROLOGICAL_PERIPHERAL', 'Peripheral Nervous System', (SELECT id FROM body_systems WHERE system_code = 'NEUROLOGICAL'), 'VI', 'nerve_sciatic_right', '#A569BD',
 ARRAY['Sensation intact to light touch', 'No paresthesias', 'Motor function intact', 'Reflexes symmetric']),

-- ENDOCRINE SYSTEM
('ENDOCRINE', 'Endocrine System', NULL, 'IV', 'ENDOCRINE_System', '#1ABC9C',
 ARRAY['No tremor', 'Skin warm and dry', 'Normal hair distribution', 'No thyromegaly']),

-- LYMPHATIC SYSTEM
('LYMPHATIC', 'Lymphatic System', NULL, 'III', 'LYMPHATIC_System', '#F1C40F',
 ARRAY['No lymphadenopathy', 'No axillary nodes palpable', 'No inguinal nodes palpable', 'No cervical lymphadenopathy']),

-- INTEGUMENTARY SYSTEM
('INTEGUMENTARY', 'Skin and Integumentary System', NULL, 'XII', 'INTEGUMENTARY_System', '#E59866',
 ARRAY['Skin warm, dry, intact', 'No rashes or lesions', 'Normal turgor', 'Mucous membranes moist']);

-- Update IEN counter for future inserts
SELECT setval('body_systems_id_seq', (SELECT MAX(id) FROM body_systems));

-- Verification query
SELECT system_code, system_name, model_region_id, display_color FROM body_systems ORDER BY system_code;
