MWSSTART ; M Web Server - HTTP Server Entry Point ;2024-01-01
 ;
 ; Simple HTTP server for MUMPS globals REST API
 ; Provides GET, SET, KILL, ORDER operations via HTTP
 ;
START ; Start the web server
 N PORT,LISTEN,CONN
 S PORT=$G(^MWSCONFIG("PORT"),8080)
 W "Starting M Web Server on port "_PORT,!
 ;
 ; Use job to handle connections
 D LISTEN(PORT)
 Q
 ;
LISTEN(PORT) ; Main listen loop
 N DEVICE,TIMEOUT
 S TIMEOUT=60
 ;
 ; Open TCP listener
 S DEVICE="|TCP|"_PORT
 O DEVICE:(LISTEN=PORT:ATTACH="server"):TIMEOUT:"SOCKET"
 I '$T W "Failed to open port "_PORT,! Q
 ;
 W "Listening on port "_PORT,!
 ;
 ; Accept loop
 F  D
 . N CONN,REQ,RESP
 . U DEVICE W /WAIT
 . S CONN=$KEY
 . I CONN="" Q
 . ;
 . ; Read request
 . S REQ=$$READREQ(DEVICE)
 . ;
 . ; Process request
 . S RESP=$$PROCESS(REQ)
 . ;
 . ; Send response
 . D SENDRESP(DEVICE,RESP)
 . ;
 . ; Close connection
 . C DEVICE
 Q
 ;
READREQ(DEV) ; Read HTTP request
 N LINE,REQ,I
 S REQ=""
 F I=1:1:100 R LINE:5 Q:LINE=""  S REQ=REQ_LINE_$C(13,10)
 Q REQ
 ;
SENDRESP(DEV,RESP) ; Send HTTP response
 W RESP
 Q
 ;
PROCESS(REQ) ; Process HTTP request and route to handler
 N METHOD,PATH,BODY,RESP
 ;
 ; Parse request line
 S METHOD=$P(REQ," ",1)
 S PATH=$P($P(REQ," ",2),"?",1)
 S BODY=$$GETBODY(REQ)
 ;
 ; Route to handler
 S RESP=$$ROUTE(METHOD,PATH,BODY)
 Q RESP
 ;
GETBODY(REQ) ; Extract body from request
 N POS,BODY
 S POS=$F(REQ,$C(13,10,13,10))
 I POS=0 Q ""
 S BODY=$E(REQ,POS,999999)
 Q BODY
 ;
ROUTE(METHOD,PATH,BODY) ; Route request to appropriate handler
 ;
 ; Health check
 I PATH="/health" Q $$HEALTH()
 ;
 ; Global operations
 I PATH="/api/v1/global" Q $$^MWSREST(METHOD,PATH,BODY)
 I $E(PATH,1,14)="/api/v1/global" Q $$^MWSREST(METHOD,PATH,BODY)
 ;
 ; VistA FileMan operations
 I $E(PATH,1,12)="/api/v1/file" Q $$^VISTAAPI(METHOD,PATH,BODY)
 ;
 ; EHR operations
 I $E(PATH,1,11)="/api/v1/ehr" Q $$^EHRAPI(METHOD,PATH,BODY)
 ;
 ; Not found
 Q $$NOTFOUND()
 ;
HEALTH() ; Health check endpoint
 N RESP
 S RESP="HTTP/1.1 200 OK"_$C(13,10)
 S RESP=RESP_"Content-Type: application/json"_$C(13,10)
 S RESP=RESP_$C(13,10)
 S RESP=RESP_"{""status"":""ok"",""database"":""yottadb""}"
 Q RESP
 ;
NOTFOUND() ; 404 Not Found
 N RESP
 S RESP="HTTP/1.1 404 Not Found"_$C(13,10)
 S RESP=RESP_"Content-Type: application/json"_$C(13,10)
 S RESP=RESP_$C(13,10)
 S RESP=RESP_"{""error"":""Not Found""}"
 Q RESP
