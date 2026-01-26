'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-white border-gray-200 text-gray-900 shadow-lg',
          title: 'text-gray-900 font-semibold',
          description: 'text-gray-600',
          closeButton: 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100',
          success: 'bg-[#07477a] border-[#07477a] text-white [&_[data-title]]:text-white [&_[data-description]]:text-white/90 [&_[data-close-button]]:bg-white/20 [&_[data-close-button]]:border-white/30 [&_[data-close-button]]:text-white [&_[data-close-button]]:hover:bg-white/30',
          error: 'bg-red-600 border-red-600 text-white [&_[data-title]]:text-white [&_[data-description]]:text-white/90',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
