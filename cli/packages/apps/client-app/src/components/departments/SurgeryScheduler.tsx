/**
 * Surgery Scheduler Component
 * Component for scheduling and managing operating theater surgeries
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";

export interface SurgerySchedulerProps {
  theatreId?: string;
  onSchedule?: (surgeryData: any) => void;
}

export function SurgeryScheduler(_props: SurgerySchedulerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Surgery Scheduler</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Surgery scheduling interface - to be implemented
        </p>
      </CardContent>
    </Card>
  );
}
