//! Localized error messages

use std::collections::HashMap;
use once_cell::sync::Lazy;

/// Error message with localized versions
#[derive(Debug, Clone)]
pub struct ErrorMessage {
    /// Error code for programmatic use
    pub code: &'static str,
    /// Default (English) message
    pub default: &'static str,
    /// Localized messages by locale code
    pub translations: HashMap<&'static str, &'static str>,
}

impl ErrorMessage {
    /// Get the message for a specific locale
    pub fn get(&self, locale: &str) -> &str {
        self.translations.get(locale).unwrap_or(&self.default)
    }
}

/// Localized message storage
pub struct LocalizedMessages {
    messages: HashMap<&'static str, ErrorMessage>,
}

impl LocalizedMessages {
    /// Get a message by code
    pub fn get(&self, code: &str) -> Option<&ErrorMessage> {
        self.messages.get(code)
    }

    /// Get a localized message by code and locale
    pub fn get_localized(&self, code: &str, locale: &str) -> String {
        self.messages
            .get(code)
            .map(|m| m.get(locale).to_string())
            .unwrap_or_else(|| code.to_string())
    }
}

/// Global message storage
static MESSAGES: Lazy<LocalizedMessages> = Lazy::new(|| {
    let mut messages = HashMap::new();

    // Authentication errors
    messages.insert("auth.invalid_credentials", ErrorMessage {
        code: "auth.invalid_credentials",
        default: "Invalid username or password",
        translations: HashMap::from([
            ("es-ES", "Usuario o contrasena invalidos"),
            ("es-MX", "Usuario o contrasena invalidos"),
            ("fr-FR", "Nom d'utilisateur ou mot de passe invalide"),
            ("de-DE", "Ungultiger Benutzername oder Passwort"),
            ("hi-IN", "Invalid username or password"),
            ("ar-SA", "Invalid username or password"),
            ("zh-CN", "Invalid username or password"),
            ("ja-JP", "Invalid username or password"),
        ]),
    });

    messages.insert("auth.token_expired", ErrorMessage {
        code: "auth.token_expired",
        default: "Your session has expired. Please log in again.",
        translations: HashMap::from([
            ("es-ES", "Su sesion ha expirado. Por favor inicie sesion de nuevo."),
            ("es-MX", "Su sesion ha expirado. Por favor inicie sesion de nuevo."),
            ("fr-FR", "Votre session a expire. Veuillez vous reconnecter."),
            ("de-DE", "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an."),
        ]),
    });

    messages.insert("auth.unauthorized", ErrorMessage {
        code: "auth.unauthorized",
        default: "You are not authorized to perform this action",
        translations: HashMap::from([
            ("es-ES", "No esta autorizado para realizar esta accion"),
            ("es-MX", "No esta autorizado para realizar esta accion"),
            ("fr-FR", "Vous n'etes pas autorise a effectuer cette action"),
            ("de-DE", "Sie sind nicht berechtigt, diese Aktion auszufuhren"),
        ]),
    });

    // Validation errors
    messages.insert("validation.required", ErrorMessage {
        code: "validation.required",
        default: "This field is required",
        translations: HashMap::from([
            ("es-ES", "Este campo es obligatorio"),
            ("es-MX", "Este campo es obligatorio"),
            ("fr-FR", "Ce champ est obligatoire"),
            ("de-DE", "Dieses Feld ist erforderlich"),
        ]),
    });

    messages.insert("validation.invalid_email", ErrorMessage {
        code: "validation.invalid_email",
        default: "Please enter a valid email address",
        translations: HashMap::from([
            ("es-ES", "Por favor ingrese un correo electronico valido"),
            ("es-MX", "Por favor ingrese un correo electronico valido"),
            ("fr-FR", "Veuillez entrer une adresse email valide"),
            ("de-DE", "Bitte geben Sie eine gultige E-Mail-Adresse ein"),
        ]),
    });

    messages.insert("validation.invalid_phone", ErrorMessage {
        code: "validation.invalid_phone",
        default: "Please enter a valid phone number",
        translations: HashMap::from([
            ("es-ES", "Por favor ingrese un numero de telefono valido"),
            ("es-MX", "Por favor ingrese un numero de telefono valido"),
            ("fr-FR", "Veuillez entrer un numero de telephone valide"),
            ("de-DE", "Bitte geben Sie eine gultige Telefonnummer ein"),
        ]),
    });

    // Database errors
    messages.insert("db.connection_failed", ErrorMessage {
        code: "db.connection_failed",
        default: "Unable to connect to the database",
        translations: HashMap::from([
            ("es-ES", "No se pudo conectar a la base de datos"),
            ("es-MX", "No se pudo conectar a la base de datos"),
            ("fr-FR", "Impossible de se connecter a la base de donnees"),
            ("de-DE", "Verbindung zur Datenbank konnte nicht hergestellt werden"),
        ]),
    });

    messages.insert("db.record_not_found", ErrorMessage {
        code: "db.record_not_found",
        default: "The requested record was not found",
        translations: HashMap::from([
            ("es-ES", "El registro solicitado no fue encontrado"),
            ("es-MX", "El registro solicitado no fue encontrado"),
            ("fr-FR", "L'enregistrement demande n'a pas ete trouve"),
            ("de-DE", "Der angeforderte Datensatz wurde nicht gefunden"),
        ]),
    });

    // Patient errors
    messages.insert("patient.not_found", ErrorMessage {
        code: "patient.not_found",
        default: "Patient not found",
        translations: HashMap::from([
            ("es-ES", "Paciente no encontrado"),
            ("es-MX", "Paciente no encontrado"),
            ("fr-FR", "Patient non trouve"),
            ("de-DE", "Patient nicht gefunden"),
        ]),
    });

    messages.insert("patient.duplicate_mrn", ErrorMessage {
        code: "patient.duplicate_mrn",
        default: "A patient with this MRN already exists",
        translations: HashMap::from([
            ("es-ES", "Ya existe un paciente con este numero de historia clinica"),
            ("es-MX", "Ya existe un paciente con este numero de historia clinica"),
            ("fr-FR", "Un patient avec ce numero de dossier existe deja"),
            ("de-DE", "Ein Patient mit dieser Aktennummer existiert bereits"),
        ]),
    });

    // Billing errors
    messages.insert("billing.invoice_not_found", ErrorMessage {
        code: "billing.invoice_not_found",
        default: "Invoice not found",
        translations: HashMap::from([
            ("es-ES", "Factura no encontrada"),
            ("es-MX", "Factura no encontrada"),
            ("fr-FR", "Facture non trouvee"),
            ("de-DE", "Rechnung nicht gefunden"),
        ]),
    });

    messages.insert("billing.payment_failed", ErrorMessage {
        code: "billing.payment_failed",
        default: "Payment processing failed",
        translations: HashMap::from([
            ("es-ES", "El procesamiento del pago fallo"),
            ("es-MX", "El procesamiento del pago fallo"),
            ("fr-FR", "Le traitement du paiement a echoue"),
            ("de-DE", "Die Zahlungsverarbeitung ist fehlgeschlagen"),
        ]),
    });

    messages.insert("billing.insufficient_balance", ErrorMessage {
        code: "billing.insufficient_balance",
        default: "Insufficient balance",
        translations: HashMap::from([
            ("es-ES", "Saldo insuficiente"),
            ("es-MX", "Saldo insuficiente"),
            ("fr-FR", "Solde insuffisant"),
            ("de-DE", "Unzureichendes Guthaben"),
        ]),
    });

    // Generic errors
    messages.insert("error.internal", ErrorMessage {
        code: "error.internal",
        default: "An internal error occurred. Please try again later.",
        translations: HashMap::from([
            ("es-ES", "Ocurrio un error interno. Por favor intente mas tarde."),
            ("es-MX", "Ocurrio un error interno. Por favor intente mas tarde."),
            ("fr-FR", "Une erreur interne s'est produite. Veuillez reessayer plus tard."),
            ("de-DE", "Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es spater erneut."),
        ]),
    });

    messages.insert("error.network", ErrorMessage {
        code: "error.network",
        default: "Network error. Please check your connection.",
        translations: HashMap::from([
            ("es-ES", "Error de red. Por favor verifique su conexion."),
            ("es-MX", "Error de red. Por favor verifique su conexion."),
            ("fr-FR", "Erreur reseau. Veuillez verifier votre connexion."),
            ("de-DE", "Netzwerkfehler. Bitte uberprufen Sie Ihre Verbindung."),
        ]),
    });

    LocalizedMessages { messages }
});

/// Get a localized error message
pub fn get_localized_error(code: &str, locale: &str) -> String {
    MESSAGES.get_localized(code, locale)
}

/// Get an error message struct
pub fn get_error_message(code: &str) -> Option<&'static ErrorMessage> {
    MESSAGES.get(code)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_localized_error() {
        let msg = get_localized_error("auth.invalid_credentials", "es-ES");
        assert_eq!(msg, "Usuario o contrasena invalidos");

        let msg = get_localized_error("auth.invalid_credentials", "en-US");
        assert_eq!(msg, "Invalid username or password");

        // Unknown locale falls back to default
        let msg = get_localized_error("auth.invalid_credentials", "xx-XX");
        assert_eq!(msg, "Invalid username or password");

        // Unknown code returns the code itself
        let msg = get_localized_error("unknown.error", "en-US");
        assert_eq!(msg, "unknown.error");
    }
}
