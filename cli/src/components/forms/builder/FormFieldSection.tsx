import { cn } from "@/lib/utils"
import type { FormField } from "@/components/ui/form-builder"

interface FormFieldSectionProps {
  field: FormField
  className?: string
}

export function FormFieldSection({ field, className }: FormFieldSectionProps) {
  if (field.type !== "separator" && field.type !== "display-text") return null

  if (field.type === "separator") {
    return (
      <div className={cn("col-span-12 my-4", className)}>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E1E4E8] dark:border-[#3B3B3B]"></div>
          </div>
          {field.label && (
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground">{field.label}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("col-span-12", className)}>
      {field.label && (
        <h3 className="text-base font-semibold">{field.label}</h3>
      )}
      {field.description && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
    </div>
  )
}

