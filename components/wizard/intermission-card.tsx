"use client"
import { Button } from "@/components/ui/button"
import { Loader2, Check, type LucideIcon } from "lucide-react"

interface ListItem {
  id: string | number
  label: string
  sublabel?: string
  isComplete?: boolean
}

interface IntermissionCardProps {
  icon: LucideIcon
  title: string
  description: string
  primaryAction: {
    label: string
    onClick: () => void
    isLoading?: boolean
    icon?: LucideIcon
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  listItems?: ListItem[]
  listTitle?: string
}

export function IntermissionCard({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  listItems,
  listTitle,
}: IntermissionCardProps) {
  const PrimaryIcon = primaryAction.icon

  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
      {/* Icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#07477a]/10">
        <Icon className="h-8 w-8 text-[#07477a]" />
      </div>

      {/* Title & Description */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-gray-500">{description}</p>
      </div>

      {/* List of items (e.g., dependents) */}
      {listItems && listItems.length > 0 && (
        <div className="mt-6">
          {listTitle && <h3 className="mb-3 text-sm font-medium text-gray-500">{listTitle}</h3>}
          <div className="space-y-2">
            {listItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  {item.sublabel && <p className="text-sm text-gray-500">{item.sublabel}</p>}
                </div>
                {item.isComplete && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#07477a]">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          onClick={primaryAction.onClick}
          disabled={primaryAction.isLoading}
          className="min-w-[180px] bg-[#07477a] hover:bg-[#053560] text-white"
          size="lg"
        >
          {primaryAction.isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : PrimaryIcon ? (
            <PrimaryIcon className="mr-2 h-4 w-4" />
          ) : null}
          {primaryAction.label}
        </Button>
        {secondaryAction && (
          <Button
            variant="ghost"
            onClick={secondaryAction.onClick}
            className="min-w-[180px] text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            size="lg"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
