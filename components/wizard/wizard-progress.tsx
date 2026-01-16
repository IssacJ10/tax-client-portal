"use client"

import { cn } from "@/lib/utils"
import { Cloud, Check } from "lucide-react"

interface WizardProgressProps {
  step: number
  totalSteps: number
  label: string
  isSyncing?: boolean
}

export function WizardProgress({ step, totalSteps, label, isSyncing }: WizardProgressProps) {
  const percentage = (step / totalSteps) * 100

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Step {step} of {totalSteps}
          </p>
          <h2 className="text-lg font-semibold text-foreground">{label}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <>
              <Cloud className="h-4 w-4 animate-pulse text-primary" />
              <span className="text-xs text-muted-foreground">Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Saved</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="mt-3 flex justify-between">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
              i + 1 < step && "bg-primary text-primary-foreground",
              i + 1 === step && "bg-primary/20 text-primary ring-2 ring-primary",
              i + 1 > step && "bg-muted text-muted-foreground",
            )}
          >
            {i + 1 < step ? <Check className="h-3 w-3" /> : i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}
