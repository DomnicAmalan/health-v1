VISTAAPI ; VistA FileMan REST API ;2024-01-01
 ;
 ; REST API for VistA FileMan-style operations
 ; Endpoints:
 ;   GET  /api/v1/file/{filenum} - List entries
 ;   GET  /api/v1/file/{filenum}/{ien} - Get entry by IEN
 ;   POST /api/v1/file/{filenum} - Create entry
 ;   PUT  /api/v1/file/{filenum}/{ien} - Update entry
 ;   DELETE /api/v1/file/{filenum}/{ien} - Delete entry
 ;
 ; VistA File Numbers:
 ;   2 = Patient (^DPT)
 ;   9000010 = Visit (^AUPNVSIT)
 ;   9000011 = Problem (^AUPNPROB)
 ;   52 = Pharmacy (^PS)
 ;   120.5 = Vitals (^GMR)
 ;   120.8 = Allergies (^GMR)
 ;   63 = Lab Results (^LR)
 ;   8925 = Documents (^TIU)
 ;   100 = Orders (^OR)
 ;   44 = Scheduling (^SD)
 ;
EN(METHOD,PATH,BODY) ; Main entry point
 N FILENUM,IEN,RESP
 ;
 ; Parse path: /api/v1/file/{filenum}/{ien}
 D PARSEPATH(PATH,.FILENUM,.IEN)
 ;
 ; Route by method
 I METHOD="GET" D  Q RESP
 . I IEN="" S RESP=$$LIST(FILENUM) Q
 . S RESP=$$GET(FILENUM,IEN)
 I METHOD="POST" Q $$CREATE(FILENUM,BODY)
 I METHOD="PUT" Q $$UPDATE(FILENUM,IEN,BODY)
 I METHOD="DELETE" Q $$DELETE(FILENUM,IEN)
 ;
 Q $$ERROR(405,"Method Not Allowed")
 ;
PARSEPATH(PATH,FILENUM,IEN) ; Parse path
 N P
 S P=$P(PATH,"/api/v1/file/",2)
 S FILENUM=$P(P,"/",1)
 S IEN=$P(P,"/",2)
 Q
 ;
 ; === CRUD Operations ===
 ;
LIST(FILENUM) ; List all entries in a file
 N GLOBAL,IEN,DATA,FIRST,RESP
 ;
 S GLOBAL=$$FILE2GLO(FILENUM)
 I GLOBAL="" Q $$ERROR(400,"Unknown file number")
 ;
 S RESP="{""file"":"_FILENUM_",""entries"":["
 S FIRST=1
 S IEN=""
 F  S IEN=$O(@GLOBAL@(IEN)) Q:IEN=""  D
 . I 'FIRST S RESP=RESP_","
 . S FIRST=0
 . S RESP=RESP_$$ENTRY2JSON(FILENUM,IEN)
 S RESP=RESP_"]}"
 Q $$JSON(200,RESP)
 ;
GET(FILENUM,IEN) ; Get single entry
 N GLOBAL,RESP
 ;
 S GLOBAL=$$FILE2GLO(FILENUM)
 I GLOBAL="" Q $$ERROR(400,"Unknown file number")
 ;
 I '$D(@GLOBAL@(IEN)) Q $$ERROR(404,"Entry not found")
 ;
 S RESP=$$ENTRY2JSON(FILENUM,IEN)
 Q $$JSON(200,RESP)
 ;
CREATE(FILENUM,BODY) ; Create new entry
 N GLOBAL,IEN,DATA,RESP
 ;
 S GLOBAL=$$FILE2GLO(FILENUM)
 I GLOBAL="" Q $$ERROR(400,"Unknown file number")
 ;
 ; Get next IEN
 S IEN=$O(@GLOBAL@(""),-1)+1
 ;
 ; Parse JSON body and store fields
 D JSON2ENTRY(FILENUM,IEN,BODY)
 ;
 ; Update B index
 D ADDINDEX(FILENUM,IEN)
 ;
 S RESP="{""success"":true,""ien"":"_IEN_",""file"":"_FILENUM_"}"
 Q $$JSON(201,RESP)
 ;
UPDATE(FILENUM,IEN,BODY) ; Update existing entry
 N GLOBAL,RESP
 ;
 S GLOBAL=$$FILE2GLO(FILENUM)
 I GLOBAL="" Q $$ERROR(400,"Unknown file number")
 ;
 I '$D(@GLOBAL@(IEN)) Q $$ERROR(404,"Entry not found")
 ;
 ; Parse JSON body and update fields
 D JSON2ENTRY(FILENUM,IEN,BODY)
 ;
 ; Update indexes
 D ADDINDEX(FILENUM,IEN)
 ;
 S RESP="{""success"":true,""ien"":"_IEN_",""updated"":true}"
 Q $$JSON(200,RESP)
 ;
DELETE(FILENUM,IEN) ; Delete entry (soft delete)
 N GLOBAL,RESP
 ;
 S GLOBAL=$$FILE2GLO(FILENUM)
 I GLOBAL="" Q $$ERROR(400,"Unknown file number")
 ;
 I '$D(@GLOBAL@(IEN)) Q $$ERROR(404,"Entry not found")
 ;
 ; Remove from B index
 D RMINDEX(FILENUM,IEN)
 ;
 ; Soft delete - set status
 S @GLOBAL@(IEN,"deleted")=$$NOW()
 ;
 S RESP="{""success"":true,""ien"":"_IEN_",""deleted"":true}"
 Q $$JSON(200,RESP)
 ;
 ; === File to Global Mapping ===
 ;
FILE2GLO(FILENUM) ; Map file number to global
 I FILENUM=2 Q "^DPT"           ; Patient
 I FILENUM=9000010 Q "^AUPNVSIT" ; Visit
 I FILENUM=9000011 Q "^AUPNPROB" ; Problem
 I FILENUM=52 Q "^PS"            ; Pharmacy
 I FILENUM=120.5 Q "^GMR"        ; Vitals
 I FILENUM=120.8 Q "^GMRA"       ; Allergies
 I FILENUM=63 Q "^LR"            ; Lab Results
 I FILENUM=8925 Q "^TIU"         ; Documents
 I FILENUM=100 Q "^OR"           ; Orders
 I FILENUM=44 Q "^SD"            ; Scheduling
 Q ""
 ;
 ; === Data Conversion ===
 ;
ENTRY2JSON(FILENUM,IEN) ; Convert entry to JSON
 N GLOBAL,JSON,FIELDS,F
 ;
 S GLOBAL=$$FILE2GLO(FILENUM)
 ;
 ; Build JSON
 S JSON="{""ien"":"_IEN
 ;
 ; Get field definitions for this file
 D GETFIELDS(FILENUM,.FIELDS)
 ;
 ; Extract each field
 S F=""
 F  S F=$O(FIELDS(F)) Q:F=""  D
 . N FNUM,FNAME,VAL
 . S FNUM=F
 . S FNAME=$G(FIELDS(F,"name"),$TR(F,".","_"))
 . S VAL=$$GETFIELD(GLOBAL,IEN,FNUM)
 . I VAL'="" S JSON=JSON_","""_FNAME_""":"""_$$ESCAPE(VAL)_""""
 ;
 S JSON=JSON_"}"
 Q JSON
 ;
JSON2ENTRY(FILENUM,IEN,BODY) ; Parse JSON and store in global
 N GLOBAL,FIELDS,F,VAL
 ;
 S GLOBAL=$$FILE2GLO(FILENUM)
 ;
 ; Get field definitions
 D GETFIELDS(FILENUM,.FIELDS)
 ;
 ; Store each field from JSON
 S F=""
 F  S F=$O(FIELDS(F)) Q:F=""  D
 . N FNAME,FNUM
 . S FNUM=F
 . S FNAME=$G(FIELDS(F,"name"))
 . I FNAME="" Q
 . S VAL=$$JSONVAL(BODY,FNAME)
 . I VAL'="" D SETFIELD(GLOBAL,IEN,FNUM,VAL)
 ;
 ; Set audit fields
 D SETFIELD(GLOBAL,IEN,"updated_at",$$NOW())
 Q
 ;
GETFIELD(GLOBAL,IEN,FNUM) ; Get field value using MUMPS piece
 ; Field stored as ^GLOBAL(IEN,piece) or ^GLOBAL(IEN,0) with $P
 N NODE,PC
 ;
 ; Simple integer field nums stored at that subscript
 I FNUM=+FNUM,FNUM<100 D  Q $G(@GLOBAL@(IEN,FNUM))
 . ; Fallback to node,piece format
 ;
 ; Complex field with node.piece format
 S NODE=$P(FNUM,".",1)
 S PC=$P(FNUM,".",2)
 I PC="" Q $G(@GLOBAL@(IEN,NODE))
 Q $P($G(@GLOBAL@(IEN,NODE)),"^",PC)
 ;
SETFIELD(GLOBAL,IEN,FNUM,VAL) ; Set field value
 N NODE,PC,CUR
 ;
 ; Simple integer field
 I FNUM=+FNUM,FNUM<100 D  Q
 . S @GLOBAL@(IEN,FNUM)=VAL
 ;
 ; Complex field with node.piece format
 S NODE=$P(FNUM,".",1)
 S PC=$P(FNUM,".",2)
 I PC="" D  Q
 . S @GLOBAL@(IEN,NODE)=VAL
 ;
 ; Set piece
 S CUR=$G(@GLOBAL@(IEN,NODE))
 S $P(CUR,"^",PC)=VAL
 S @GLOBAL@(IEN,NODE)=CUR
 Q
 ;
GETFIELDS(FILENUM,FIELDS) ; Get field definitions for file
 ; Returns FIELDS(fieldnum)=name
 K FIELDS
 ;
 ; Patient (File #2)
 I FILENUM=2 D  Q
 . S FIELDS(.01,"name")="name"
 . S FIELDS(.02,"name")="sex"
 . S FIELDS(.03,"name")="dateOfBirth"
 . S FIELDS(.09,"name")="ssn"
 . S FIELDS(.111,"name")="street1"
 . S FIELDS(.112,"name")="street2"
 . S FIELDS(.114,"name")="city"
 . S FIELDS(.115,"name")="state"
 . S FIELDS(.116,"name")="zip"
 . S FIELDS(.131,"name")="phone"
 . S FIELDS(.132,"name")="workPhone"
 . S FIELDS(991,"name")="mrn"
 ;
 ; Visit (File #9000010)
 I FILENUM=9000010 D  Q
 . S FIELDS(.01,"name")="visitDatetime"
 . S FIELDS(.02,"name")="patientIen"
 . S FIELDS(.03,"name")="locationIen"
 . S FIELDS(.04,"name")="visitType"
 . S FIELDS(.05,"name")="status"
 . S FIELDS(.06,"name")="providerIen"
 ;
 ; Problem (File #9000011)
 I FILENUM=9000011 D  Q
 . S FIELDS(.01,"name")="diagnosis"
 . S FIELDS(.02,"name")="patientIen"
 . S FIELDS(.03,"name")="icdCode"
 . S FIELDS(.04,"name")="snomedCode"
 . S FIELDS(.05,"name")="onsetDate"
 . S FIELDS(.06,"name")="status"
 . S FIELDS(.07,"name")="priority"
 ;
 ; Allergies (File #120.8)
 I FILENUM=120.8 D  Q
 . S FIELDS(.01,"name")="allergen"
 . S FIELDS(.02,"name")="patientIen"
 . S FIELDS(.03,"name")="allergyType"
 . S FIELDS(.04,"name")="severity"
 . S FIELDS(.05,"name")="reactions"
 . S FIELDS(.06,"name")="status"
 ;
 ; Default - no fields
 Q
 ;
 ; === Indexing ===
 ;
ADDINDEX(FILENUM,IEN) ; Add entry to B index
 N GLOBAL,NAME
 S GLOBAL=$$FILE2GLO(FILENUM)
 S NAME=$G(@GLOBAL@(IEN,.01))
 I NAME="" Q
 S @GLOBAL@("B",NAME,IEN)=""
 Q
 ;
RMINDEX(FILENUM,IEN) ; Remove entry from B index
 N GLOBAL,NAME
 S GLOBAL=$$FILE2GLO(FILENUM)
 S NAME=$G(@GLOBAL@(IEN,.01))
 I NAME="" Q
 K @GLOBAL@("B",NAME,IEN)
 Q
 ;
 ; === Utilities ===
 ;
NOW() ; Current datetime in FileMan format
 N D,T,FM
 S D=$$TODAY()
 S T=$P($H,",",2)
 S FM=D_"."_$TR($J(T\3600,2)_$J(T\60#60,2)_$J(T#60,2)," ","0")
 Q FM
 ;
TODAY() ; Today in FileMan format (YYYMMDD where YYY=year-1700)
 N Y,M,D
 S Y=$E($ZD($H,2),1,4)-1700
 S M=$E($ZD($H,2),5,6)
 S D=$E($ZD($H,2),7,8)
 Q Y_M_D
 ;
JSON(STATUS,BODY) ; Build JSON HTTP response
 N RESP
 S RESP="HTTP/1.1 "_STATUS_" "_$$STATUSTEXT(STATUS)_$C(13,10)
 S RESP=RESP_"Content-Type: application/json"_$C(13,10)
 S RESP=RESP_"Access-Control-Allow-Origin: *"_$C(13,10)
 S RESP=RESP_$C(13,10)
 S RESP=RESP_BODY
 Q RESP
 ;
STATUSTEXT(CODE) ; HTTP status text
 I CODE=200 Q "OK"
 I CODE=201 Q "Created"
 I CODE=400 Q "Bad Request"
 I CODE=404 Q "Not Found"
 I CODE=405 Q "Method Not Allowed"
 I CODE=500 Q "Internal Server Error"
 Q "Unknown"
 ;
ERROR(CODE,MSG) ; Error response
 Q $$JSON(CODE,"{""error"":"""_$$ESCAPE(MSG)_"""}")
 ;
ESCAPE(STR) ; Escape string for JSON
 N I,C,OUT
 S OUT=""
 F I=1:1:$L(STR) D
 . S C=$E(STR,I)
 . I C="""" S OUT=OUT_"\"_C Q
 . I C="\" S OUT=OUT_"\\" Q
 . S OUT=OUT_C
 Q OUT
 ;
JSONVAL(JSON,KEY) ; Extract value from JSON - see MWSREST
 N POS,VAL,I,C,INSTR
 S POS=$F(JSON,""""_KEY_""":")
 I POS=0 Q ""
 F  Q:$E(JSON,POS)'=" "  S POS=POS+1
 I $E(JSON,POS)="""" D  Q VAL
 . S INSTR=1,VAL=""
 . F I=POS+1:1:$L(JSON) D  Q:'INSTR
 . . S C=$E(JSON,I)
 . . I C="\",I<$L(JSON) S VAL=VAL_$E(JSON,I+1),I=I+1 Q
 . . I C="""" S INSTR=0 Q
 . . S VAL=VAL_C
 S VAL=""
 F I=POS:1:$L(JSON) S C=$E(JSON,I) Q:",}]"[C  S VAL=VAL_C
 Q VAL
