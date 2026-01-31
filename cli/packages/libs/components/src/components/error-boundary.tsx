/**
 * Error Boundary
 * Catches errors and displays sanitized error messages (removes PHI patterns)
 * Shared component for use across all applications
 */

import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Box } from "./box";
import { Button } from "./button";
import { Card } from "./card";
import { Stack } from "./stack";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to console (consuming apps can suppress in production)
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  /**
   * Sanitize error messages to remove PHI patterns
   * Removes: email, SSN, phone, MRN, DOB patterns
   */
  sanitizeError(message: string): string {
    let sanitized = message;

    // Remove email patterns
    sanitized = sanitized.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      "[EMAIL]"
    );

    // Remove SSN patterns (XXX-XX-XXXX or XXXXXXXXX)
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]");
    sanitized = sanitized.replace(/\b\d{9}\b/g, "[SSN]");

    // Remove phone patterns (XXX-XXX-XXXX, (XXX) XXX-XXXX, etc.)
    sanitized = sanitized.replace(/\b\d{3}-\d{3}-\d{4}\b/g, "[PHONE]");
    sanitized = sanitized.replace(/\(\d{3}\)\s*\d{3}-\d{4}/g, "[PHONE]");

    // Remove MRN patterns (typically 6-10 digits with optional prefix)
    sanitized = sanitized.replace(/\bMRN[:\s]*\d{6,10}\b/gi, "[MRN]");

    // Remove DOB patterns (MM/DD/YYYY, YYYY-MM-DD)
    sanitized = sanitized.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, "[DATE]");
    sanitized = sanitized.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[DATE]");

    // Remove credit card patterns (XXXX-XXXX-XXXX-XXXX)
    sanitized = sanitized.replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[CARD]");

    return sanitized;
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="p-6 m-4">
          <Stack spacing="md" align="center">
            <Box className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </Box>

            <Stack spacing="sm" align="center">
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground text-center">
                An error occurred while rendering this component.
              </p>
              {this.state.error && (
                <Box className="text-xs text-muted-foreground font-mono p-2 bg-muted rounded max-w-lg">
                  {this.sanitizeError(this.state.error.message)}
                </Box>
              )}
            </Stack>

            <Button onClick={this.handleReset} variant="outline">
              Try Again
            </Button>
          </Stack>
        </Card>
      );
    }

    return this.props.children;
  }
}
