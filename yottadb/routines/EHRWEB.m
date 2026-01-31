EHRWEB ; EHR Web API Handlers ;2024-01-01
 ;
 ; Web service handlers for YottaDB Web Server
 ; Called via _ydbweburl.m mappings
 ;
 Q
 ;
 ; === HEALTH CHECK ===
 ;
health ; GET /api/health
 S httprsp("mime")="application/json"
 S httprsp="{""status"":""ok"",""database"":""yottadb"",""version"":""1.0""}"
 Q
 ;
 ; === PATIENT ENDPOINTS ===
 ;
list ; GET /api/v1/ehr/patients - List all patients
 N IEN,JSON,FIRST,D0,NAME,SEX,DOB,SSN,MRN
 S httprsp("mime")="application/json"
 ;
 S JSON="{""patients"":["
 S FIRST=1,IEN=""
 F  S IEN=$O(^DPT(IEN)) Q:IEN=""  Q:'IEN  D
 . I $G(^DPT(IEN,"deleted"))'="" Q
 . I 'FIRST S JSON=JSON_","
 . S FIRST=0
 . S JSON=JSON_$$PATJSON(IEN)
 S JSON=JSON_"]}"
 S httprsp=JSON
 Q
 ;
get ; GET /api/v1/ehr/patients/{ien}
 N IEN,JSON
 S httprsp("mime")="application/json"
 S IEN=$G(httpargs("ien"))
 ;
 I IEN="" S httprsp="{""error"":""Missing patient IEN""}" Q
 I '$D(^DPT(IEN,0)) S httprsp="{""error"":""Patient not found""}" Q
 ;
 S httprsp=$$PATJSON(IEN)
 Q
 ;
create ; POST /api/v1/ehr/patients
 N BODY,NAME,SEX,DOB,SSN,MRN,IEN,FIRST,LAST
 S httprsp("mime")="application/json"
 ;
 ; Parse JSON body
 S BODY=$G(httpreq("body"))
 S FIRST=$$JSONVAL(BODY,"firstName")
 S LAST=$$JSONVAL(BODY,"lastName")
 S SEX=$$JSONVAL(BODY,"sex")
 S DOB=$$JSONVAL(BODY,"dateOfBirth")
 S SSN=$$JSONVAL(BODY,"ssn")
 S MRN=$$JSONVAL(BODY,"mrn")
 ;
 I LAST="" S httprsp="{""error"":""lastName is required""}" Q
 I FIRST="" S httprsp="{""error"":""firstName is required""}" Q
 ;
 ; Format name VistA style
 S NAME=$TR(LAST_","_FIRST," ","")
 S NAME=$TR(NAME,$C(9,10,13),"")
 ;
 ; Get next IEN
 S IEN=$P($G(^DPT(0)),"^",3)+1
 ;
 ; Store patient
 S ^DPT(IEN,0)=NAME_"^"_$E(SEX)_"^"_DOB_"^"_SSN
 I MRN'="" S ^DPT(IEN,991)=MRN
 ;
 ; Update header
 S $P(^DPT(0),"^",3)=IEN
 S $P(^DPT(0),"^",4)=IEN
 ;
 ; Add to B index
 S ^DPT("B",NAME,IEN)=""
 ;
 S httprsp="{""success"":true,""ien"":"_IEN_"}"
 Q
 ;
 ; === PATIENT SUB-RESOURCES ===
 ;
problems ; GET /api/v1/ehr/patients/{ien}/problems
 N PATIEN,IEN,JSON,FIRST
 S httprsp("mime")="application/json"
 S PATIEN=$G(httpargs("ien"))
 ;
 I PATIEN="" S httprsp="{""error"":""Missing patient IEN""}" Q
 ;
 S JSON="{""problems"":["
 S FIRST=1,IEN=""
 F  S IEN=$O(^AUPNPROB("C",PATIEN,IEN)) Q:IEN=""  D
 . I 'FIRST S JSON=JSON_","
 . S FIRST=0
 . S JSON=JSON_$$PROBJSON(IEN)
 S JSON=JSON_"]}"
 S httprsp=JSON
 Q
 ;
addproblem ; POST /api/v1/ehr/patients/{ien}/problems
 N PATIEN,BODY,DX,ICD,ONSET,IEN
 S httprsp("mime")="application/json"
 S PATIEN=$G(httpargs("ien"))
 ;
 S BODY=$G(httpreq("body"))
 S DX=$$JSONVAL(BODY,"diagnosis")
 S ICD=$$JSONVAL(BODY,"icdCode")
 S ONSET=$$JSONVAL(BODY,"onsetDate")
 ;
 I DX="" S httprsp="{""error"":""diagnosis is required""}" Q
 ;
 ; Get next IEN
 S IEN=$P($G(^AUPNPROB(0)),"^",3)+1
 ;
 ; Store problem
 S ^AUPNPROB(IEN,0)=DX_"^"_PATIEN_"^"_ICD_"^^"_ONSET_"^A"
 S ^AUPNPROB("C",PATIEN,IEN)=""
 ;
 ; Update header
 S $P(^AUPNPROB(0),"^",3)=IEN
 S $P(^AUPNPROB(0),"^",4)=IEN
 ;
 S httprsp="{""success"":true,""ien"":"_IEN_"}"
 Q
 ;
allergies ; GET /api/v1/ehr/patients/{ien}/allergies
 N PATIEN,IEN,JSON,FIRST
 S httprsp("mime")="application/json"
 S PATIEN=$G(httpargs("ien"))
 ;
 I PATIEN="" S httprsp="{""error"":""Missing patient IEN""}" Q
 ;
 S JSON="{""allergies"":["
 S FIRST=1,IEN=""
 F  S IEN=$O(^GMRA("C",PATIEN,IEN)) Q:IEN=""  D
 . I 'FIRST S JSON=JSON_","
 . S FIRST=0
 . S JSON=JSON_$$ALGJSON(IEN)
 S JSON=JSON_"]}"
 S httprsp=JSON
 Q
 ;
addallergy ; POST /api/v1/ehr/patients/{ien}/allergies
 N PATIEN,BODY,ALG,TYPE,SEV,REACT,IEN
 S httprsp("mime")="application/json"
 S PATIEN=$G(httpargs("ien"))
 ;
 S BODY=$G(httpreq("body"))
 S ALG=$$JSONVAL(BODY,"allergen")
 S TYPE=$$JSONVAL(BODY,"allergyType")
 S SEV=$$JSONVAL(BODY,"severity")
 S REACT=$$JSONVAL(BODY,"reactions")
 ;
 I ALG="" S httprsp="{""error"":""allergen is required""}" Q
 ;
 ; Get next IEN
 S IEN=$P($G(^GMRA(0)),"^",3)+1
 ;
 ; Store allergy
 S ^GMRA(IEN,0)=ALG_"^"_PATIEN_"^"_TYPE_"^"_SEV_"^"_REACT_"^A"
 S ^GMRA("C",PATIEN,IEN)=""
 ;
 ; Update header
 S $P(^GMRA(0),"^",3)=IEN
 S $P(^GMRA(0),"^",4)=IEN
 ;
 S httprsp="{""success"":true,""ien"":"_IEN_"}"
 Q
 ;
vitals ; GET /api/v1/ehr/patients/{ien}/vitals
 S httprsp("mime")="application/json"
 S httprsp="{""vitals"":[]}"
 Q
 ;
labs ; GET /api/v1/ehr/patients/{ien}/labs
 S httprsp("mime")="application/json"
 S httprsp="{""labs"":[]}"
 Q
 ;
 ; === GLOBAL ACCESS ===
 ;
globalget ; GET /api/v1/global/{global}
 N GLO,VAL
 S httprsp("mime")="application/json"
 S GLO=$G(httpargs("global"))
 S VAL=$G(@("^"_GLO))
 S httprsp="{""global"":"""_GLO_""",""value"":"""_$$ESC(VAL)_"""}"
 Q
 ;
globalget1 ; GET /api/v1/global/{global}/{sub1}
 N GLO,SUB1,VAL
 S httprsp("mime")="application/json"
 S GLO=$G(httpargs("global"))
 S SUB1=$G(httpargs("sub1"))
 S VAL=$G(@("^"_GLO_"("_$$QT(SUB1)_")"))
 S httprsp="{""value"":"""_$$ESC(VAL)_"""}"
 Q
 ;
globalget2 ; GET /api/v1/global/{global}/{sub1}/{sub2}
 N GLO,SUB1,SUB2,VAL
 S httprsp("mime")="application/json"
 S GLO=$G(httpargs("global"))
 S SUB1=$G(httpargs("sub1"))
 S SUB2=$G(httpargs("sub2"))
 S VAL=$G(@("^"_GLO_"("_$$QT(SUB1)_","_$$QT(SUB2)_")"))
 S httprsp="{""value"":"""_$$ESC(VAL)_"""}"
 Q
 ;
globalset1 ; POST /api/v1/global/{global}/{sub1}
 N GLO,SUB1,VAL
 S httprsp("mime")="application/json"
 S GLO=$G(httpargs("global"))
 S SUB1=$G(httpargs("sub1"))
 S VAL=$$JSONVAL($G(httpreq("body")),"value")
 S @("^"_GLO_"("_$$QT(SUB1)_")")=VAL
 S httprsp="{""success"":true}"
 Q
 ;
globalset2 ; POST /api/v1/global/{global}/{sub1}/{sub2}
 N GLO,SUB1,SUB2,VAL
 S httprsp("mime")="application/json"
 S GLO=$G(httpargs("global"))
 S SUB1=$G(httpargs("sub1"))
 S SUB2=$G(httpargs("sub2"))
 S VAL=$$JSONVAL($G(httpreq("body")),"value")
 S @("^"_GLO_"("_$$QT(SUB1)_","_$$QT(SUB2)_")")=VAL
 S httprsp="{""success"":true}"
 Q
 ;
 ; === HELPER FUNCTIONS ===
 ;
PATJSON(IEN) ; Convert patient to JSON
 N D0,NAME,SEX,DOB,SSN,MRN,JSON,FIRST,LAST
 S D0=$G(^DPT(IEN,0))
 S NAME=$P(D0,"^",1)
 S SEX=$P(D0,"^",2)
 S DOB=$P(D0,"^",3)
 S SSN=$P(D0,"^",4)
 S MRN=$G(^DPT(IEN,991))
 ;
 ; Parse name
 S LAST=$P(NAME,",",1)
 S FIRST=$P(NAME,",",2)
 ;
 S JSON="{"
 S JSON=JSON_"""ien"":"_IEN
 S JSON=JSON_",""name"":"""_$$ESC(NAME)_""""
 S JSON=JSON_",""firstName"":"""_$$ESC(FIRST)_""""
 S JSON=JSON_",""lastName"":"""_$$ESC(LAST)_""""
 S JSON=JSON_",""sex"":"""_SEX_""""
 S JSON=JSON_",""dateOfBirth"":"""_DOB_""""
 I SSN'="" S JSON=JSON_",""ssn"":"""_$$ESC(SSN)_""""
 I MRN'="" S JSON=JSON_",""mrn"":"""_$$ESC(MRN)_""""
 S JSON=JSON_"}"
 Q JSON
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
 S JSON="{"
 S JSON=JSON_"""ien"":"_IEN
 S JSON=JSON_",""diagnosis"":"""_$$ESC(DX)_""""
 S JSON=JSON_",""patientIen"":"_PAT
 I ICD'="" S JSON=JSON_",""icdCode"":"""_ICD_""""
 I ONSET'="" S JSON=JSON_",""onsetDate"":"""_ONSET_""""
 S JSON=JSON_",""status"":"""_$S(STATUS="A":"active",STATUS="I":"inactive",1:STATUS)_""""
 S JSON=JSON_"}"
 Q JSON
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
 S JSON="{"
 S JSON=JSON_"""ien"":"_IEN
 S JSON=JSON_",""allergen"":"""_$$ESC(ALG)_""""
 S JSON=JSON_",""patientIen"":"_PAT
 S JSON=JSON_",""allergyType"":"""_$S(TYPE="D":"drug",TYPE="F":"food",TYPE="E":"environmental",1:TYPE)_""""
 S JSON=JSON_",""severity"":"""_$S(SEV="MI":"mild",SEV="MO":"moderate",SEV="SE":"severe",SEV="LT":"life_threatening",1:SEV)_""""
 I REACT'="" S JSON=JSON_",""reactions"":"""_$$ESC(REACT)_""""
 S JSON=JSON_",""status"":"""_$S(STATUS="A":"active",STATUS="I":"inactive",1:STATUS)_""""
 S JSON=JSON_"}"
 Q JSON
 ;
ESC(S) ; Escape for JSON
 N I,C,O S O=""
 F I=1:1:$L(S) S C=$E(S,I) D
 . I C="""" S O=O_"\""" Q
 . I C="\" S O=O_"\\" Q
 . I $A(C)<32 Q
 . S O=O_C
 Q O
 ;
QT(S) ; Quote string for M reference
 Q """"_$TR(S,"""","")_""""
 ;
JSONVAL(JSON,KEY) ; Extract JSON value
 N POS,VAL,I,C,IN
 S POS=$F(JSON,""""_KEY_""":")
 I POS=0 Q ""
 F  Q:$E(JSON,POS)'=" "  S POS=POS+1
 I $E(JSON,POS)="""" D  Q VAL
 . S IN=1,VAL=""
 . F I=POS+1:1:$L(JSON) S C=$E(JSON,I) I C="""" S IN=0 Q  S VAL=VAL_C
 S VAL=""
 F I=POS:1:$L(JSON) S C=$E(JSON,I) Q:",}]"[C  S VAL=VAL_C
 Q VAL
