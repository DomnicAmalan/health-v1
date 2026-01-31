MWSREST ; M Web Server - REST API for MUMPS Globals ;2024-01-01
 ;
 ; REST API for direct MUMPS global operations
 ; Endpoints:
 ;   GET  /api/v1/global/{global}/{subscripts...} - $GET
 ;   POST /api/v1/global/{global}/{subscripts...} - SET
 ;   DELETE /api/v1/global/{global}/{subscripts...} - KILL
 ;   GET  /api/v1/global/{global}/{subscripts...}?order=1 - $ORDER
 ;
EN(METHOD,PATH,BODY) ; Main entry point
 N GLOBAL,SUBS,RESP
 ;
 ; Parse path: /api/v1/global/{global}/{sub1}/{sub2}/...
 D PARSEPATH(PATH,.GLOBAL,.SUBS)
 ;
 ; Route by method
 I METHOD="GET" Q $$DOGET(GLOBAL,.SUBS)
 I METHOD="POST" Q $$DOSET(GLOBAL,.SUBS,BODY)
 I METHOD="PUT" Q $$DOSET(GLOBAL,.SUBS,BODY)
 I METHOD="DELETE" Q $$DOKILL(GLOBAL,.SUBS)
 ;
 Q $$ERROR(405,"Method Not Allowed")
 ;
PARSEPATH(PATH,GLOBAL,SUBS) ; Parse path into global and subscripts
 N PARTS,I,P
 K SUBS
 ;
 ; Remove /api/v1/global/ prefix
 S PATH=$P(PATH,"/api/v1/global/",2)
 ;
 ; Split by /
 S I=0
 F  Q:PATH=""  D
 . S P=$P(PATH,"/",1)
 . S PATH=$P(PATH,"/",2,999)
 . I P="" Q
 . S I=I+1
 . I I=1 S GLOBAL=P Q
 . S SUBS(I-1)=$$URLDEC(P)
 S SUBS=I-1
 Q
 ;
URLDEC(STR) ; URL decode
 N I,C,OUT
 S OUT=""
 F I=1:1:$L(STR) D
 . S C=$E(STR,I)
 . I C="%" S C=$C($$HEX2DEC($E(STR,I+1,I+2))),I=I+2
 . S OUT=OUT_C
 Q OUT
 ;
HEX2DEC(HEX) ; Convert hex to decimal
 N D
 S D=$F("0123456789ABCDEF",$E(HEX,1))-2*16
 S D=D+$F("0123456789ABCDEF",$E(HEX,2))-2
 Q D
 ;
DOGET(GLOBAL,SUBS) ; GET - Retrieve global value
 N REF,VAL,RESP
 ;
 S REF=$$MKREF(GLOBAL,.SUBS)
 I REF="" Q $$ERROR(400,"Invalid global reference")
 ;
 ; Check if $ORDER requested
 I $G(SUBS("order")) D  Q RESP
 . N NEXT
 . S NEXT=$O(@REF)
 . S RESP=$$JSON(200,"{""next"":"""_$$ESCAPE(NEXT)_"""}")
 ;
 ; Regular $GET
 S VAL=$G(@REF)
 S RESP=$$JSON(200,"{""value"":"""_$$ESCAPE(VAL)_""",""defined"":"_$S($D(@REF):"true",1:"false")_"}")
 Q RESP
 ;
DOSET(GLOBAL,SUBS,BODY) ; SET - Store value
 N REF,VAL,RESP
 ;
 S REF=$$MKREF(GLOBAL,.SUBS)
 I REF="" Q $$ERROR(400,"Invalid global reference")
 ;
 ; Parse JSON body for value
 S VAL=$$JSONVAL(BODY,"value")
 ;
 ; Set the global
 S @REF=VAL
 ;
 S RESP=$$JSON(200,"{""success"":true,""global"":"""_GLOBAL_"""}")
 Q RESP
 ;
DOKILL(GLOBAL,SUBS) ; KILL - Delete global node
 N REF,RESP
 ;
 S REF=$$MKREF(GLOBAL,.SUBS)
 I REF="" Q $$ERROR(400,"Invalid global reference")
 ;
 ; Kill the node
 K @REF
 ;
 S RESP=$$JSON(200,"{""success"":true,""killed"":"""_GLOBAL_"""}")
 Q RESP
 ;
MKREF(GLOBAL,SUBS) ; Build global reference string
 N REF,I
 ;
 ; Validate global name
 I GLOBAL="" Q ""
 I $E(GLOBAL,1)'="^" S GLOBAL="^"_GLOBAL
 ;
 ; Build subscript list
 S REF=GLOBAL
 I $G(SUBS)>0 D
 . S REF=REF_"("
 . F I=1:1:SUBS D
 . . I I>1 S REF=REF_","
 . . S REF=REF_""""_$G(SUBS(I))_""""
 . S REF=REF_")"
 Q REF
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
 . I $A(C)<32 S OUT=OUT_"\u"_$$PAD4($$DEC2HEX($A(C))) Q
 . S OUT=OUT_C
 Q OUT
 ;
PAD4(STR) ; Pad to 4 chars
 F  Q:$L(STR)>3  S STR="0"_STR
 Q STR
 ;
DEC2HEX(NUM) ; Decimal to hex
 N HEX,R
 S HEX=""
 F  Q:NUM=0  S R=NUM#16,NUM=NUM\16 S HEX=$E("0123456789ABCDEF",R+1)_HEX
 I HEX="" S HEX="0"
 Q HEX
 ;
JSONVAL(JSON,KEY) ; Extract value from JSON
 N POS,VAL,I,C,INSTR
 ;
 ; Find key
 S POS=$F(JSON,""""_KEY_""":")
 I POS=0 Q ""
 ;
 ; Skip whitespace
 F  Q:$E(JSON,POS)'=" "  S POS=POS+1
 ;
 ; Check for string value
 I $E(JSON,POS)="""" D  Q VAL
 . S INSTR=1,VAL=""
 . F I=POS+1:1:$L(JSON) D  Q:'INSTR
 . . S C=$E(JSON,I)
 . . I C="\",I<$L(JSON) S VAL=VAL_$E(JSON,I+1),I=I+1 Q
 . . I C="""" S INSTR=0 Q
 . . S VAL=VAL_C
 ;
 ; Number or boolean
 S VAL=""
 F I=POS:1:$L(JSON) S C=$E(JSON,I) Q:",}]"[C  S VAL=VAL_C
 Q VAL
