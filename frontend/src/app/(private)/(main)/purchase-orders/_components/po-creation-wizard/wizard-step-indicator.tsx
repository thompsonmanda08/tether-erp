import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStepIndicatorProps {
  currentStep: 1 | 2 | 3;
  steps: Array<{ label: string }>;
}

type StepState = "completed" | "current" | "upcoming";

function getStepState(stepIndex: number, currentStep: number): StepState {
  const stepNumber = stepIndex + 1;
  if (stepNumber < currentStep) return "completed";
  if (stepNumber === currentStep) return "current";
  return "upcoming";
}

export function WizardStepIndicator({
  currentStep,
  steps,
}: WizardStepIndicatorProps) {
  return (
    <nav aria-label="Wizard progress" className="flex items-center w-full">
      {steps.map((step, index) => {
        const state = getStepState(index, currentStep);
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            {/* Step node */}
            <div className="flex flex-col items-center gap-1">
              {/* Circle with number or checkmark */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold transition-colors",
                  state === "completed" &&
                    "bg-primary border-primary text-primary-foreground",
                  state === "current" &&
                    "bg-background border-primary text-primary",
                  state === "upcoming" &&
                    "bg-background border-muted-foreground/40 text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {state === "completed" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Label + accessible state text */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "text-xs font-medium",
                    state === "current" && "text-primary",
                    state === "completed" && "text-primary",
                    state === "upcoming" && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                {/* Visible text label for state — satisfies requirement 8.4 (color + text) */}
                <span
                  className={cn(
                    "text-[10px]",
                    state === "completed" && "text-primary",
                    state === "current" && "text-primary",
                    state === "upcoming" && "text-muted-foreground",
                  )}
                >
                  {state === "completed"
                    ? "Completed"
                    : state === "current"
                      ? "Current"
                      : "Upcoming"}
                </span>
              </div>
            </div>

            {/* Connecting line between steps */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 -mt-5 transition-colors",
                  state === "completed"
                    ? "bg-primary"
                    : "bg-muted-foreground/30",
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
