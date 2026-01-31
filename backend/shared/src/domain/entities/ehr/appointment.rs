//! EHR Appointment/Scheduling Entity
//!
//! Corresponds to VistA File #44 (^SD) - Scheduling

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::shared::AuditFields;

/// Appointment status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum AppointmentStatus {
    #[serde(rename = "scheduled")]
    Scheduled,
    #[serde(rename = "confirmed")]
    Confirmed,
    #[serde(rename = "checked_in")]
    CheckedIn,
    #[serde(rename = "in_room")]
    InRoom,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "no_show")]
    NoShow,
    #[serde(rename = "rescheduled")]
    Rescheduled,
}

impl Default for AppointmentStatus {
    fn default() -> Self {
        AppointmentStatus::Scheduled
    }
}

/// Appointment type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "snake_case")]
pub enum AppointmentType {
    #[serde(rename = "new_patient")]
    NewPatient,
    #[serde(rename = "follow_up")]
    FollowUp,
    #[serde(rename = "annual_exam")]
    AnnualExam,
    #[serde(rename = "urgent")]
    Urgent,
    #[serde(rename = "telehealth")]
    Telehealth,
    #[serde(rename = "procedure")]
    Procedure,
    #[serde(rename = "lab")]
    Lab,
    #[serde(rename = "other")]
    Other,
}

impl Default for AppointmentType {
    fn default() -> Self {
        AppointmentType::FollowUp
    }
}

impl AppointmentType {
    /// Get default duration in minutes
    pub fn default_duration(&self) -> i32 {
        match self {
            AppointmentType::NewPatient => 60,
            AppointmentType::FollowUp => 20,
            AppointmentType::AnnualExam => 45,
            AppointmentType::Urgent => 15,
            AppointmentType::Telehealth => 20,
            AppointmentType::Procedure => 60,
            AppointmentType::Lab => 15,
            AppointmentType::Other => 30,
        }
    }

    /// Get display name
    pub fn display_name(&self) -> &'static str {
        match self {
            AppointmentType::NewPatient => "New Patient",
            AppointmentType::FollowUp => "Follow-up",
            AppointmentType::AnnualExam => "Annual Exam",
            AppointmentType::Urgent => "Urgent",
            AppointmentType::Telehealth => "Telehealth",
            AppointmentType::Procedure => "Procedure",
            AppointmentType::Lab => "Lab",
            AppointmentType::Other => "Other",
        }
    }
}

/// EHR Appointment Entity
///
/// Represents a scheduled appointment.
/// Corresponds to VistA File #44 (^SD - Scheduling).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhrAppointment {
    pub id: Uuid,

    /// Internal Entry Number (VistA IEN)
    pub ien: i64,

    /// Organization (multi-tenant)
    pub organization_id: Uuid,

    /// Patient ID
    pub patient_id: Uuid,

    /// Created visit ID (when checked in)
    pub visit_id: Option<Uuid>,

    /// Appointment type
    pub appointment_type: AppointmentType,

    /// Status
    pub status: AppointmentStatus,

    /// Scheduled start datetime
    pub scheduled_datetime: DateTime<Utc>,

    /// Duration in minutes
    pub duration_minutes: i32,

    /// End time (calculated from start + duration)
    pub scheduled_end_datetime: DateTime<Utc>,

    /// Provider
    pub provider_id: Option<Uuid>,
    pub provider_name: Option<String>,

    /// Location/clinic
    pub location_id: Option<Uuid>,
    pub location_name: Option<String>,

    /// Room number (when assigned)
    pub room: Option<String>,

    /// Reason for appointment
    pub reason: Option<String>,

    /// Chief complaint
    pub chief_complaint: Option<String>,

    /// Instructions for patient
    pub patient_instructions: Option<String>,

    /// Internal notes
    pub notes: Option<String>,

    /// Check-in time
    pub check_in_time: Option<DateTime<Utc>>,

    /// In-room time
    pub in_room_time: Option<DateTime<Utc>>,

    /// Checkout time
    pub checkout_time: Option<DateTime<Utc>>,

    /// Cancellation info
    pub cancelled_by: Option<Uuid>,
    pub cancelled_datetime: Option<DateTime<Utc>>,
    pub cancellation_reason: Option<String>,

    /// Reminder sent
    pub reminder_sent: bool,
    pub reminder_sent_datetime: Option<DateTime<Utc>>,

    /// Recurrence info
    pub recurrence_rule: Option<String>,
    pub recurrence_parent_id: Option<Uuid>,

    /// MUMPS global data
    pub mumps_data: Option<JsonValue>,

    // Audit fields
    pub request_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub system_id: Option<String>,
    pub version: i64,
}

impl EhrAppointment {
    /// Create a new appointment
    pub fn new(
        organization_id: Uuid,
        patient_id: Uuid,
        appointment_type: AppointmentType,
        scheduled_datetime: DateTime<Utc>,
    ) -> Self {
        let audit = AuditFields::new();
        let duration = appointment_type.default_duration();
        let end_datetime = scheduled_datetime + chrono::Duration::minutes(duration as i64);

        Self {
            id: Uuid::new_v4(),
            ien: 0,
            organization_id,
            patient_id,
            visit_id: None,
            appointment_type,
            status: AppointmentStatus::Scheduled,
            scheduled_datetime,
            duration_minutes: duration,
            scheduled_end_datetime: end_datetime,
            provider_id: None,
            provider_name: None,
            location_id: None,
            location_name: None,
            room: None,
            reason: None,
            chief_complaint: None,
            patient_instructions: None,
            notes: None,
            check_in_time: None,
            in_room_time: None,
            checkout_time: None,
            cancelled_by: None,
            cancelled_datetime: None,
            cancellation_reason: None,
            reminder_sent: false,
            reminder_sent_datetime: None,
            recurrence_rule: None,
            recurrence_parent_id: None,
            mumps_data: None,
            request_id: audit.request_id,
            created_at: audit.created_at,
            updated_at: audit.updated_at,
            created_by: audit.created_by,
            updated_by: audit.updated_by,
            system_id: audit.system_id,
            version: audit.version,
        }
    }

    /// Confirm the appointment
    pub fn confirm(&mut self) {
        self.status = AppointmentStatus::Confirmed;
        self.updated_at = Utc::now();
    }

    /// Check in the patient
    pub fn check_in(&mut self) -> Uuid {
        self.status = AppointmentStatus::CheckedIn;
        self.check_in_time = Some(Utc::now());
        self.updated_at = Utc::now();

        // Create visit ID (would normally create a visit record)
        let visit_id = Uuid::new_v4();
        self.visit_id = Some(visit_id);
        visit_id
    }

    /// Move patient to room
    pub fn move_to_room(&mut self, room: String) {
        self.status = AppointmentStatus::InRoom;
        self.room = Some(room);
        self.in_room_time = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// Complete the appointment
    pub fn complete(&mut self) {
        self.status = AppointmentStatus::Completed;
        self.checkout_time = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// Cancel the appointment
    pub fn cancel(&mut self, cancelled_by: Uuid, reason: Option<String>) {
        self.status = AppointmentStatus::Cancelled;
        self.cancelled_by = Some(cancelled_by);
        self.cancelled_datetime = Some(Utc::now());
        self.cancellation_reason = reason;
        self.updated_at = Utc::now();
    }

    /// Mark as no-show
    pub fn mark_no_show(&mut self) {
        self.status = AppointmentStatus::NoShow;
        self.updated_at = Utc::now();
    }

    /// Reschedule the appointment
    pub fn reschedule(&mut self, new_datetime: DateTime<Utc>) {
        self.status = AppointmentStatus::Rescheduled;
        self.scheduled_datetime = new_datetime;
        self.scheduled_end_datetime = new_datetime + chrono::Duration::minutes(self.duration_minutes as i64);
        self.updated_at = Utc::now();
    }

    /// Check if appointment is in the past
    pub fn is_past(&self) -> bool {
        self.scheduled_datetime < Utc::now()
    }

    /// Check if appointment is today
    pub fn is_today(&self) -> bool {
        self.scheduled_datetime.date_naive() == Utc::now().date_naive()
    }

    /// Check if appointment can be cancelled
    pub fn can_cancel(&self) -> bool {
        matches!(
            self.status,
            AppointmentStatus::Scheduled | AppointmentStatus::Confirmed
        )
    }

    /// Get wait time in minutes (from check-in to in-room)
    pub fn wait_time_minutes(&self) -> Option<i64> {
        match (self.check_in_time, self.in_room_time) {
            (Some(check_in), Some(in_room)) => Some((in_room - check_in).num_minutes()),
            (Some(check_in), None) if self.status == AppointmentStatus::CheckedIn => {
                Some((Utc::now() - check_in).num_minutes())
            }
            _ => None,
        }
    }

    /// Get time slot display (e.g., "9:00 AM - 9:30 AM")
    pub fn time_slot_display(&self) -> String {
        let start = self.scheduled_datetime.format("%I:%M %p");
        let end = self.scheduled_end_datetime.format("%I:%M %p");
        format!("{} - {}", start, end)
    }
}
