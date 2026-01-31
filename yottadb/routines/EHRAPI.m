EHRAPI ; EHR REST API - High-level clinical operations ;2024-01-01
 ;
 ; REST API for EHR clinical operations
 ; Built on top of VistA FileMan globals
 ;
 ; Endpoints:
 ;   /api/v1/ehr/patients - Patient operations
 ;   /api/v1/ehr/patients/{id}/problems - Problem list
 ;   /api/v1/ehr/patients/{id}/medications - Medications
 ;   /api/v1/ehr/patients/{id}/allergies - Allergies
 ;   /api/v1/ehr/patients/{id}/vitals - Vital signs
 ;   /api/v1/ehr/patients/{id}/labs - Lab results
 ;   /api/v1/ehr/patients/{id}/documents - Clinical notes
 ;   /api/v1/ehr/patients/{id}/orders - Orders
 ;
EN(METHOD,PATH,BODY) ; Main entry point
 N PARTS,RESOURCE,PATID,SUBRES,RESP
 ;
 ; Parse: /api/v1/ehr/{resource}/{id}/{subresource}
 D PARSEPATH(PATH,.RESOURCE,.PATID,.SUBRES)
 ;
 ; Route by resource
 I RESOURCE="patients" D  Q RESP
 . I PATID="" D  Q
 . . I METHOD="GET" S RESP=$$LISTPAT() Q
 . . I METHOD="POST" S RESP=$$CREATEPAT(BODY) Q
 . . S RESP=$$ERROR(405,"Method not allowed")
 . ;
 . ; Patient sub-resources
 . I SUBRES="" D  Q
 . . I METHOD="GET" S RESP=$$GETPAT(PATID) Q
 . . I METHOD="PUT" S RESP=$$UPDATEPAT(PATID,BODY) Q
 . . S RESP=$$ERROR(405,"Method not allowed")
 . ;
 . S RESP=$$SUBRES(METHOD,PATID,SUBRES,BODY)
 ;
 Q $$ERROR(404,"Resource not found")
 ;
PARSEPATH(PATH,RES,ID,SUBRES) ; Parse EHR path
 N P
 S P=$P(PATH,"/api/v1/ehr/",2)
 S RES=$P(P,"/",1)
 S ID=$P(P,"/",2)
 S SUBRES=$P(P,"/",3)
 Q
 ;
SUBRES(METHOD,PATID,SUBRES,BODY) ; Handle sub-resources
 I SUBRES="problems" Q $$PROBLEMS(METHOD,PATID,BODY)
 I SUBRES="medications" Q $$MEDS(METHOD,PATID,BODY)
 I SUBRES="allergies" Q $$ALLERGIES(METHOD,PATID,BODY)
 I SUBRES="vitals" Q $$VITALS(METHOD,PATID,BODY)
 I SUBRES="labs" Q $$LABS(METHOD,PATID,BODY)
 I SUBRES="documents" Q $$DOCS(METHOD,PATID,BODY)
 I SUBRES="orders" Q $$ORDERS(METHOD,PATID,BODY)
 Q $$ERROR(404,"Unknown sub-resource")
 ;
 ; === PATIENT OPERATIONS ===
 ;
LISTPAT() ; List all patients
 N IEN,JSON,FIRST
 S JSON="{""patients"":["
 S FIRST=1
 S IEN=""
 F  S IEN=$O(^DPT(IEN)) Q:IEN=""  D
 . I $G(^DPT(IEN,"deleted"))'="" Q  ; Skip deleted
 . I 'FIRST S JSON=JSON_","
 . S FIRST=0
 . S JSON=JSON_$$PATJSON(IEN)
 S JSON=JSON_"]}"
 Q $$JSON(200,JSON)
 ;
GETPAT(IEN) ; Get single patient
 I '$D(^DPT(IEN)) Q $$ERROR(404,"Patient not found")
 I $G(^DPT(IEN,"deleted"))'="" Q $$ERROR(404,"Patient deleted")
 Q $$JSON(200,$$PATJSON(IEN))
 ;
CREATEPAT(BODY) ; Create new patient
 N IEN,NAME,DOB,SEX,SSN,MRN
 ;
 ; Get next IEN
 S IEN=$O(^DPT(""),-1)+1
 ;
 ; Parse body
 S NAME=$$JSONVAL(BODY,"name")
 S DOB=$$JSONVAL(BODY,"dateOfBirth")
 S SEX=$$JSONVAL(BODY,"sex")
 S SSN=$$JSONVAL(BODY,"ssn")
 S MRN=$$JSONVAL(BODY,"mrn")
 ;
 ; Validate required
 I NAME="" Q $$ERROR(400,"Name is required")
 ;
 ; Store in ^DPT
 S ^DPT(IEN,0)=NAME_"^"_SEX_"^"_DOB_"^"_SSN
 S ^DPT(IEN,991)=MRN
 S ^DPT(IEN,"created_at")=$$NOW()
 ;
 ; Add to B index
 S ^DPT("B",NAME,IEN)=""
 ;
 Q $$JSON(201,"{""success"":true,""ien"":"_IEN_"}")
 ;
UPDATEPAT(IEN,BODY) ; Update patient
 N NAME,DOB,SEX
 ;
 I '$D(^DPT(IEN)) Q $$ERROR(404,"Patient not found")
 ;
 ; Parse body
 S NAME=$$JSONVAL(BODY,"name")
 S DOB=$$JSONVAL(BODY,"dateOfBirth")
 S SEX=$$JSONVAL(BODY,"sex")
 ;
 ; Update fields
 I NAME'="" S $P(^DPT(IEN,0),"^",1)=NAME
 I SEX'="" S $P(^DPT(IEN,0),"^",2)=SEX
 I DOB'="" S $P(^DPT(IEN,0),"^",3)=DOB
 S ^DPT(IEN,"updated_at")=$$NOW()
 ;
 Q $$JSON(200,"{""success"":true,""updated"":true}")
 ;
PATJSON(IEN) ; Convert patient to JSON
 N D0,NAME,SEX,DOB,SSN,MRN,JSON
 S D0=$G(^DPT(IEN,0))
 S NAME=$P(D0,"^",1)
 S SEX=$P(D0,"^",2)
 S DOB=$P(D0,"^",3)
 S SSN=$P(D0,"^",4)
 S MRN=$G(^DPT(IEN,991))
 ;
 S JSON="{""ien"":"_IEN
 S JSON=JSON_",""name"":"""_$$ESC(NAME)_""""
 S JSON=JSON_",""sex"":"""_SEX_""""
 S JSON=JSON_",""dateOfBirth"":"""_DOB_""""
 I SSN'="" S JSON=JSON_",""ssn"":"""_$$ESC(SSN)_""""
 I MRN'="" S JSON=JSON_",""mrn"":"""_$$ESC(MRN)_""""
 S JSON=JSON_"}"
 Q JSON
 ;
 ; === PROBLEMS ===
 ;
PROBLEMS(METHOD,PATID,BODY) ; Problem list operations
 N IEN,JSON,FIRST
 ;
 I METHOD="GET" D  Q JSON
 . S JSON="{""problems"":["
 . S FIRST=1
 . S IEN=""
 . F  S IEN=$O(^AUPNPROB("C",PATID,IEN)) Q:IEN=""  D
 . . I 'FIRST S JSON=JSON_","
 . . S FIRST=0
 . . S JSON=JSON_$$PROBJSON(IEN)
 . S JSON=JSON_"]}"
 . S JSON=$$JSON(200,JSON)
 ;
 I METHOD="POST" D  Q JSON
 . N PIEN,DX,ICD,STATUS
 . S PIEN=$O(^AUPNPROB(""),-1)+1
 . S DX=$$JSONVAL(BODY,"diagnosis")
 . S ICD=$$JSONVAL(BODY,"icdCode")
 . S STATUS=$$JSONVAL(BODY,"status")
 . I STATUS="" S STATUS="active"
 . ;
 . S ^AUPNPROB(PIEN,0)=DX_"^"_PATID_"^"_ICD_"^^"_$$NOW()_"^"_STATUS
 . S ^AUPNPROB("C",PATID,PIEN)=""
 . S JSON=$$JSON(201,"{""success"":true,""ien"":"_PIEN_"}")
 ;
 Q $$ERROR(405,"Method not allowed")
 ;
PROBJSON(IEN) ; Convert problem to JSON
 N D0,DX,PAT,ICD,ONSET,STATUS,JSON
 S D0=$G(^AUPNPROB(IEN,0))
 S DX=$P(D0,"^",1)
 S PAT=$P(D0,"^",2)
 S ICD=$P(D0,"^",3)
 S ONSET=$P(D0,"^",5)
 S STATUS=$P(D0,"^",6)
 ;
 S JSON="{""ien"":"_IEN
 S JSON=JSON_",""diagnosis"":"""_$$ESC(DX)_""""
 S JSON=JSON_",""patientIen"":"_PAT
 I ICD'="" S JSON=JSON_",""icdCode"":"""_ICD_""""
 I ONSET'="" S JSON=JSON_",""onsetDate"":"""_ONSET_""""
 S JSON=JSON_",""status"":"""_STATUS_""""
 S JSON=JSON_"}"
 Q JSON
 ;
 ; === ALLERGIES ===
 ;
ALLERGIES(METHOD,PATID,BODY) ; Allergy operations
 N IEN,JSON,FIRST
 ;
 I METHOD="GET" D  Q JSON
 . S JSON="{""allergies"":["
 . S FIRST=1
 . S IEN=""
 . F  S IEN=$O(^GMRA("C",PATID,IEN)) Q:IEN=""  D
 . . I 'FIRST S JSON=JSON_","
 . . S FIRST=0
 . . S JSON=JSON_$$ALGJSON(IEN)
 . S JSON=JSON_"]}"
 . S JSON=$$JSON(200,JSON)
 ;
 I METHOD="POST" D  Q JSON
 . N AIEN,ALG,TYPE,SEV,REACT
 . S AIEN=$O(^GMRA(""),-1)+1
 . S ALG=$$JSONVAL(BODY,"allergen")
 . S TYPE=$$JSONVAL(BODY,"allergyType")
 . S SEV=$$JSONVAL(BODY,"severity")
 . S REACT=$$JSONVAL(BODY,"reactions")
 . ;
 . S ^GMRA(AIEN,0)=ALG_"^"_PATID_"^"_TYPE_"^"_SEV_"^"_REACT_"^active"
 . S ^GMRA("C",PATID,AIEN)=""
 . S JSON=$$JSON(201,"{""success"":true,""ien"":"_AIEN_"}")
 ;
 Q $$ERROR(405,"Method not allowed")
 ;
ALGJSON(IEN) ; Convert allergy to JSON
 N D0,ALG,PAT,TYPE,SEV,REACT,STATUS,JSON
 S D0=$G(^GMRA(IEN,0))
 S ALG=$P(D0,"^",1)
 S PAT=$P(D0,"^",2)
 S TYPE=$P(D0,"^",3)
 S SEV=$P(D0,"^",4)
 S REACT=$P(D0,"^",5)
 S STATUS=$P(D0,"^",6)
 ;
 S JSON="{""ien"":"_IEN
 S JSON=JSON_",""allergen"":"""_$$ESC(ALG)_""""
 S JSON=JSON_",""patientIen"":"_PAT
 S JSON=JSON_",""allergyType"":"""_TYPE_""""
 S JSON=JSON_",""severity"":"""_SEV_""""
 I REACT'="" S JSON=JSON_",""reactions"":"""_$$ESC(REACT)_""""
 S JSON=JSON_",""status"":"""_STATUS_""""
 S JSON=JSON_"}"
 Q JSON
 ;
 ; === VITALS ===
 ;
VITALS(METHOD,PATID,BODY) ; Vital signs operations
 ; Similar pattern to problems/allergies
 Q $$JSON(200,"{""vitals"":[]}")
 ;
 ; === LABS ===
 ;
LABS(METHOD,PATID,BODY) ; Lab results operations
 Q $$JSON(200,"{""labs"":[]}")
 ;
 ; === DOCUMENTS ===
 ;
DOCS(METHOD,PATID,BODY) ; Clinical documents operations
 Q $$JSON(200,"{""documents"":[]}")
 ;
 ; === ORDERS ===
 ;
ORDERS(METHOD,PATID,BODY) ; Orders operations
 Q $$JSON(200,"{""orders"":[]}")
 ;
 ; === MEDICATIONS ===
 ;
MEDS(METHOD,PATID,BODY) ; Medication operations
 Q $$JSON(200,"{""medications"":[]}")
 ;
 ; === UTILITIES ===
 ;
NOW() Q $ZD($H,2)_"."_$TR($J($P($H,",",2)\3600,2)," ","0")_$TR($J($P($H,",",2)\60#60,2)," ","0")
 ;
JSON(STATUS,BODY) ; Build HTTP response
 N R
 S R="HTTP/1.1 "_STATUS_" OK"_$C(13,10)
 S R=R_"Content-Type: application/json"_$C(13,10)
 S R=R_"Access-Control-Allow-Origin: *"_$C(13,10)
 S R=R_$C(13,10)_BODY
 Q R
 ;
ERROR(CODE,MSG) Q $$JSON(CODE,"{""error"":"""_$$ESC(MSG)_"""}")
 ;
ESC(S) ; Escape for JSON
 N I,C,O S O=""
 F I=1:1:$L(S) S C=$E(S,I) S:C="""" C="\""" S:C="\" C="\\" S O=O_C
 Q O
 ;
JSONVAL(J,K) ; Extract JSON value
 N P,V,I,C,IN
 S P=$F(J,""""_K_""":")
 I P=0 Q ""
 F  Q:$E(J,P)'=" "  S P=P+1
 I $E(J,P)="""" D  Q V
 . S IN=1,V=""
 . F I=P+1:1:$L(J) S C=$E(J,I) I C="""" S IN=0 Q  S V=V_C
 S V="" F I=P:1:$L(J) S C=$E(J,I) Q:",}]"[C  S V=V_C
 Q V
