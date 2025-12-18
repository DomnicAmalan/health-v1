import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lazarus-life/ui-components";
import { useNavigate } from "@tanstack/react-router";
import {
  AppWindow,
  CheckCircle2,
  ChevronRight,
  Globe,
  KeyRound,
  Shield,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRealmStore } from "@/stores/realmStore";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  completed: boolean;
}

export function SetupWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { currentRealm, isGlobalMode } = useRealmStore();
  const [steps, setSteps] = useState<WizardStep[]>([
    {
      id: "realm",
      title: "Create a Realm",
      description: "Set up a tenant/organization boundary",
      icon: Globe,
      route: "/realms",
      completed: false,
    },
    {
      id: "applications",
      title: "Register Applications",
      description: "Register admin-ui, client-app, and mobile apps",
      icon: AppWindow,
      route: "/applications",
      completed: false,
    },
    {
      id: "policies",
      title: "Create Policies",
      description: "Define access control policies",
      icon: Shield,
      route: "/policies",
      completed: false,
    },
    {
      id: "users",
      title: "Create Users",
      description: "Set up users for Admin UI and Client App",
      icon: Users,
      route: "/users",
      completed: false,
    },
    {
      id: "approles",
      title: "Create AppRoles",
      description: "Set up AppRoles for Mobile App and API",
      icon: KeyRound,
      route: "/approles",
      completed: false,
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const currentStepData = steps[currentStep];

  // Update step completion status
  const updateStepCompletion = useCallback((stepId: string, completed: boolean) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, completed } : step)),
    );
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Wizard complete
      onOpenChange(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToStep = () => {
    navigate({ to: currentStepData.route });
    onOpenChange(false);
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
    }
  };

  // Check realm status when dialog opens or realm changes
  useEffect(() => {
    if (open && currentRealm && !isGlobalMode) {
      updateStepCompletion("realm", true);
    } else if (open) {
      updateStepCompletion("realm", false);
    }
  }, [open, currentRealm, isGlobalMode, updateStepCompletion]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Wizard</DialogTitle>
          <DialogDescription>
            Follow these steps to set up access control for your organization
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2 py-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = step.completed;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  isActive ? "bg-primary/5 border-primary" : "bg-background"
                }`}
              >
                <div
                  className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? "bg-green-600 text-white"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StepIcon
                      className={`h-5 w-5 flex-shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <h3
                      className={`font-semibold ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Step Details */}
        {currentStepData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = currentStepData.icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                {currentStepData.title}
              </CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentStepData.id === "realm" && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      A realm is a tenant/organization boundary that isolates all resources.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Go to Realms page</li>
                      <li>Click "Create Realm"</li>
                      <li>Enter name, description, and organization ID</li>
                      <li>Select the realm to work within it</li>
                    </ul>
                  </div>
                )}
                {currentStepData.id === "applications" && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Register applications that will access the vault.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Quick: Click "Register Defaults" for standard apps</li>
                      <li>Manual: Create admin-ui, client-app, mobile apps</li>
                      <li>Configure allowed auth methods for each app</li>
                    </ul>
                    {(!currentRealm || isGlobalMode) && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Please select a realm first before registering applications.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {currentStepData.id === "policies" && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Define what paths and operations are allowed.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Create policies like admin-policy, reader-policy</li>
                      <li>Use Visual Builder to add path rules</li>
                      <li>Select capabilities: create, read, update, delete, list</li>
                    </ul>
                  </div>
                )}
                {currentStepData.id === "users" && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Create users for Admin UI and Client App authentication.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Enter username and password</li>
                      <li>Assign policies (comma-separated)</li>
                      <li>Set token TTL</li>
                    </ul>
                  </div>
                )}
                {currentStepData.id === "approles" && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Create AppRoles for Mobile App and API authentication.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Enter role name</li>
                      <li>Configure bind secret ID, TTLs</li>
                      <li>Assign policies</li>
                      <li>Generate secret ID (save securely!)</li>
                    </ul>
                    {(!currentRealm || isGlobalMode) && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Please select a realm first before creating AppRoles.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
            )}
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGoToStep}>
              Go to {currentStepData.title}
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => onOpenChange(false)}>Finish</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

