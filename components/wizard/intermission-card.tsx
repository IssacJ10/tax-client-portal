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
    <div className="glass-card mx-auto max-w-xl rounded-2xl p-8">
      {/* Icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
        <Icon className="h-8 w-8 text-primary" />
      </div>

      {/* Title & Description */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>

      {/* List of items (e.g., dependents) */}
      {listItems && listItems.length > 0 && (
        <div className="mt-6">
          {listTitle && <h3 className="mb-3 text-sm font-medium text-muted-foreground">{listTitle}</h3>}
          <div className="space-y-2">
            {listItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  {item.sublabel && <p className="text-sm text-muted-foreground">{item.sublabel}</p>}
                </div>
                {item.isComplete && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={primaryAction.onClick} disabled={primaryAction.isLoading} className="min-w-[180px]" size="lg">
          {primaryAction.isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : PrimaryIcon ? (
            <PrimaryIcon className="mr-2 h-4 w-4" />
          ) : null}
          {primaryAction.label}
        </Button>
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick} className="min-w-[180px]" size="lg">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
