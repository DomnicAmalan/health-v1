use admin_service::dto::{ServiceStatusResponse, ServiceInfo};
use serde_json;

#[test]
fn test_service_info_serialization() {
    let service = ServiceInfo {
        name: "auth-service".to_string(),
        enabled: true,
        operational: true,
        health_endpoint: Some("/health".to_string()),
        last_checked: Some("2024-01-01T00:00:00Z".to_string()),
        error: None,
    };

    let json = serde_json::to_string(&service).unwrap();
    assert!(json.contains("auth-service"));
    assert!(json.contains("operational"));
    assert!(json.contains("/health"));
}

#[test]
fn test_service_info_deserialization() {
    let json = r#"{"name":"auth-service","enabled":true,"operational":true,"healthEndpoint":"/health","lastChecked":"2024-01-01T00:00:00Z"}"#;
    let service: ServiceInfo = serde_json::from_str(json).unwrap();
    
    assert_eq!(service.name, "auth-service");
    assert!(service.enabled);
    assert!(service.operational);
    assert_eq!(service.health_endpoint, Some("/health".to_string()));
}

#[test]
fn test_service_status_response_serialization() {
    let response = ServiceStatusResponse {
        services: vec![
            ServiceInfo {
                name: "auth-service".to_string(),
                enabled: true,
                operational: true,
                health_endpoint: None,
                last_checked: None,
                error: None,
            },
        ],
        overall_status: "operational".to_string(),
        checked_at: "2024-01-01T00:00:00Z".to_string(),
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("operational"));
    assert!(json.contains("auth-service"));
}

#[test]
fn test_service_status_response_deserialization() {
    let json = r#"{"services":[{"name":"auth-service","enabled":true,"operational":true}],"overallStatus":"operational","checkedAt":"2024-01-01T00:00:00Z"}"#;
    let response: ServiceStatusResponse = serde_json::from_str(json).unwrap();
    
    assert_eq!(response.overall_status, "operational");
    assert_eq!(response.services.len(), 1);
    assert_eq!(response.services[0].name, "auth-service");
}

