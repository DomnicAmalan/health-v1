/**
 * ConnectorConfig Component
 * MuleSoft-style connector configuration for Action nodes
 *
 * This is a shared component that accepts connectors as props,
 * allowing it to be used in both admin and client apps.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/card";
import { Label } from "../components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import { Input } from "../components/input";
import { Textarea } from "../components/textarea";

// Connector types - shared between apps
export interface ConnectorParameter {
  name: string;
  param_type: string;
  required: boolean;
  description: string;
}

export interface ConnectorAction {
  name: string;
  description: string;
  parameters: ConnectorParameter[];
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  description: string;
  actions: ConnectorAction[];
}

interface ConnectorConfigProps {
  value?: {
    connector?: string;
    action?: string;
    parameters?: Record<string, string>;
  };
  onChange?: (config: {
    connector: string;
    action: string;
    parameters: Record<string, string>;
  }) => void;
  /** Available connectors - passed from parent to keep this component agnostic */
  connectors?: ConnectorMetadata[];
  /** Whether connectors are loading */
  isLoadingConnectors?: boolean;
}

export function ConnectorConfig({
  value,
  onChange,
  connectors = [],
  isLoadingConnectors = false,
}: ConnectorConfigProps) {
  const [selectedConnector, setSelectedConnector] = useState(value?.connector || "");
  const [selectedAction, setSelectedAction] = useState(value?.action || "");
  const [parameters, setParameters] = useState<Record<string, string>>(value?.parameters || {});

  // Sync with external value changes
  useEffect(() => {
    if (value?.connector !== selectedConnector) {
      setSelectedConnector(value?.connector || "");
    }
    if (value?.action !== selectedAction) {
      setSelectedAction(value?.action || "");
    }
    if (JSON.stringify(value?.parameters) !== JSON.stringify(parameters)) {
      setParameters(value?.parameters || {});
    }
  }, [value]);

  const connector = connectors.find((c) => c.id === selectedConnector);
  const action = connector?.actions.find((a) => a.name === selectedAction);

  const handleConnectorChange = (connectorId: string) => {
    setSelectedConnector(connectorId);
    setSelectedAction("");
    setParameters({});
    onChange?.({
      connector: connectorId,
      action: "",
      parameters: {},
    });
  };

  const handleActionChange = (actionId: string) => {
    setSelectedAction(actionId);
    onChange?.({
      connector: selectedConnector,
      action: actionId,
      parameters,
    });
  };

  const handleParameterChange = (paramName: string, paramValue: string) => {
    const newParams = { ...parameters, [paramName]: paramValue };
    setParameters(newParams);
    onChange?.({
      connector: selectedConnector,
      action: selectedAction,
      parameters: newParams,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connector Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connector Selection */}
          <div className="space-y-2">
            <Label>Connector</Label>
            <Select value={selectedConnector} onValueChange={handleConnectorChange} disabled={isLoadingConnectors}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingConnectors ? "Loading connectors..." : "Select a connector..."} />
              </SelectTrigger>
              <SelectContent>
                {connectors.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{conn.name}</span>
                      <span className="text-xs text-muted-foreground">{conn.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Selection */}
          {connector && (
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={selectedAction} onValueChange={handleActionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action..." />
                </SelectTrigger>
                <SelectContent>
                  {connector.actions.map((act) => (
                    <SelectItem key={act.name} value={act.name}>
                      {act.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Parameter Configuration */}
          {action && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Parameters</Label>
              {action.parameters.map((param) => (
                <div key={param.name} className="space-y-1">
                  <Label className="text-xs">
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <div className="text-xs text-muted-foreground mb-1">{param.description}</div>
                  {param.param_type === "json" || param.param_type === "object" ? (
                    <Textarea
                      placeholder={`{"key": "value"}`}
                      value={parameters[param.name] || ""}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      className="font-mono text-xs"
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={param.param_type === "number" ? "number" : "text"}
                      placeholder={`e.g., \${variables.${param.name}}`}
                      value={parameters[param.name] || ""}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      className="text-xs"
                    />
                  )}
                </div>
              ))}

              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-xs font-semibold mb-2">Variable Syntax:</p>
                <code className="text-xs">
                  {`\${variables.patientId}`} - Access workflow variables
                  <br />
                  {`\${nodeId.output.field}`} - Access previous node output
                </code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Preview */}
      {selectedConnector && selectedAction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Generated Config</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
              {JSON.stringify(
                {
                  action: `${selectedConnector}.${selectedAction}`,
                  parameters,
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
