'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  value?: string // YYYY-MM-DD format
  onChange: (value: string) => void
  placeholder?: string
  minDate?: string // YYYY-MM-DD format
  maxDate?: string // YYYY-MM-DD format
  disabled?: boolean
  className?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  disabled,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse string date to Date object
  const selectedDate = value ? new Date(value + 'T00:00:00') : undefined

  // Parse min/max dates
  const fromDate = minDate ? new Date(minDate + 'T00:00:00') : undefined
  const toDate = maxDate ? new Date(maxDate + 'T00:00:00') : undefined

  // Handle date selection
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Format as YYYY-MM-DD
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
    }
    setOpen(false)
  }

  // Format display value
  const displayValue = selectedDate
    ? format(selectedDate, 'MMMM d, yyyy')
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-9 px-3 !bg-white border-gray-300 text-gray-900 shadow-sm hover:!bg-gray-50',
            'focus-visible:border-[#00754a] focus-visible:ring-[#00754a]/50 focus-visible:ring-[3px]',
            !displayValue && 'text-gray-400',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 shrink-0" />
          <span className="truncate">{displayValue ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white border-gray-200 shadow-lg" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(date) => {
            if (fromDate && date < fromDate) return true
            if (toDate && date > toDate) return true
            return false
          }}
          defaultMonth={selectedDate || toDate || new Date()}
          captionLayout="dropdown"
          fromYear={1900}
          toYear={new Date().getFullYear() + 1}
          className="rounded-md p-3"
        />
      </PopoverContent>
    </Popover>
  )
}
