import React from 'react'

interface ToastProviderProps {
  children?: React.ReactNode
  toastStack?: React.ReactNode
}

export function ToastProvider({ children, toastStack }: ToastProviderProps) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none fixed right-5 top-16 z-50 grid gap-2">
        {toastStack}
      </div>
    </div>
  )
}
