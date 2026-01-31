_ydbweburl ; URL routing for EHR REST API ;2024-01-01
 ;
 ; YottaDB Web Server URL mappings
 ; Format: ;;HTTP_METHOD /url/path label^routine
 ;
 ; Health check
 ;;GET /api/health health^EHRWEB
 ;;GET /health health^EHRWEB
 ;
 ; Patient endpoints
 ;;GET /api/v1/ehr/patients list^EHRWEB
 ;;GET /api/v1/ehr/patients/{ien} get^EHRWEB
 ;;POST /api/v1/ehr/patients create^EHRWEB
 ;
 ; Patient sub-resources
 ;;GET /api/v1/ehr/patients/{ien}/problems problems^EHRWEB
 ;;POST /api/v1/ehr/patients/{ien}/problems addproblem^EHRWEB
 ;;GET /api/v1/ehr/patients/{ien}/allergies allergies^EHRWEB
 ;;POST /api/v1/ehr/patients/{ien}/allergies addallergy^EHRWEB
 ;;GET /api/v1/ehr/patients/{ien}/vitals vitals^EHRWEB
 ;;GET /api/v1/ehr/patients/{ien}/labs labs^EHRWEB
 ;
 ; Global direct access
 ;;GET /api/v1/global/{global} globalget^EHRWEB
 ;;GET /api/v1/global/{global}/{sub1} globalget1^EHRWEB
 ;;GET /api/v1/global/{global}/{sub1}/{sub2} globalget2^EHRWEB
 ;;POST /api/v1/global/{global}/{sub1} globalset1^EHRWEB
 ;;POST /api/v1/global/{global}/{sub1}/{sub2} globalset2^EHRWEB
 ;
 Q
