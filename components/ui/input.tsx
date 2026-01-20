import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, onWheel, ...props }: React.ComponentProps<'input'>) {
  // Prevent scroll wheel from changing number input values
  const handleWheel = React.useCallback(
    (e: React.WheelEvent<HTMLInputElement>) => {
      if (type === 'number') {
        // Store reference to the element before it becomes null
        const target = e.currentTarget
        // Blur the input to prevent value change
        target.blur()
        // Re-focus after a brief delay to maintain user experience
        setTimeout(() => {
          target.focus()
        }, 0)
      }
      // Call any custom onWheel handler
      onWheel?.(e)
    },
    [type, onWheel]
  )

  return (
    <input
      type={type}
      data-slot="input"
      onWheel={handleWheel}
      className={cn(
        'file:text-gray-900 placeholder:text-gray-400 selection:bg-[#00754a] selection:text-white border-gray-300 h-9 w-full min-w-0 rounded-md border bg-white px-3 py-1 text-base text-gray-900 shadow-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-[#00754a] focus-visible:ring-[#00754a]/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-red-500/20 aria-invalid:border-red-500',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
