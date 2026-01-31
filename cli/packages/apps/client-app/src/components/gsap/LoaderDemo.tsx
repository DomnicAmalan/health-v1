/**
 * LoaderDemo Component
 * Showcase all healthcare loader animations
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { HealthLoader, LOADER_PRESETS, type LoaderPresetKey } from "./index";

export function LoaderDemo() {
  const presets = Object.keys(LOADER_PRESETS) as LoaderPresetKey[];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Healthcare Loaders</h2>
        <p className="text-muted-foreground">
          Animated dot loaders for different healthcare contexts
        </p>
      </div>

      {/* Default variant */}
      <Card>
        <CardHeader>
          <CardTitle>Default Variant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {presets.map((preset) => (
              <div key={preset} className="flex flex-col items-center gap-2">
                <HealthLoader
                  preset={preset}
                  variant="default"
                  size="md"
                  label={LOADER_PRESETS[preset].name}
                />
                <p className="text-xs text-muted-foreground text-center">
                  {LOADER_PRESETS[preset].description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color variants */}
      <Card>
        <CardHeader>
          <CardTitle>Color Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <HealthLoader preset="heartbeat" variant="primary" label="Primary" />
            <HealthLoader preset="heartbeat" variant="success" label="Success" />
            <HealthLoader preset="heartbeat" variant="warning" label="Warning" />
            <HealthLoader preset="heartbeat" variant="danger" label="Danger" />
            <HealthLoader preset="heartbeat" variant="muted" label="Muted" />
          </div>
        </CardContent>
      </Card>

      {/* Size variants */}
      <Card>
        <CardHeader>
          <CardTitle>Size Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-6">
            <HealthLoader preset="medicalCross" size="sm" label="Small" />
            <HealthLoader preset="medicalCross" size="md" label="Medium" />
            <HealthLoader preset="medicalCross" size="lg" label="Large" />
          </div>
        </CardContent>
      </Card>

      {/* Dark theme examples */}
      <Card className="bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Dark Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3 rounded bg-black px-4 py-3">
              <HealthLoader
                preset="wave"
                className="bg-transparent p-0"
                variant="default"
              />
              <span className="font-medium text-white">Processing</span>
            </div>
            <div className="flex items-center gap-3 rounded bg-green-900 px-4 py-3">
              <HealthLoader
                preset="vitals"
                className="bg-transparent p-0"
                variant="success"
              />
              <span className="font-medium text-green-400">Vitals OK</span>
            </div>
            <div className="flex items-center gap-3 rounded bg-red-900 px-4 py-3">
              <HealthLoader
                preset="ambulance"
                className="bg-transparent p-0"
                variant="danger"
              />
              <span className="font-medium text-red-400">Emergency</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="rounded bg-muted p-4 text-sm overflow-x-auto">
{`// Basic usage
<HealthLoader preset="heartbeat" label="Loading..." />

// With variant and size
<HealthLoader
  preset="scanning"
  variant="primary"
  size="lg"
  label="Scanning patient data..."
/>

// Page-level loader
<PageLoader preset="heartbeat" label="Loading application..." />

// Card/section loader
<CardLoader preset="prescription" label="Fetching prescriptions..." />

// Inline loader (no background)
<InlineLoader preset="circular" />

// Custom dark theme
<div className="bg-black px-4 py-3 rounded flex items-center gap-3">
  <HealthLoader
    preset="wave"
    className="bg-transparent p-0"
  />
  <span className="text-white">Processing</span>
</div>`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
