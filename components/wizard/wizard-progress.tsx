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
    <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Step {step} of {totalSteps}
          </p>
          <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <>
              <Cloud className="h-4 w-4 animate-pulse text-[#00754a]" />
              <span className="text-xs text-gray-500">Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 text-[#00754a]" />
              <span className="text-xs text-gray-500">Saved</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#00754a] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="mt-3 flex justify-between">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all",
              i + 1 < step && "bg-[#00754a] text-white",
              i + 1 === step && "bg-[#00754a]/20 text-[#00754a] ring-2 ring-[#00754a]",
              i + 1 > step && "bg-gray-100 text-gray-400",
            )}
          >
            {i + 1 < step ? <Check className="h-3 w-3" /> : i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}
