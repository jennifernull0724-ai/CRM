import React from 'react'

interface ModalRootProps {
  children?: React.ReactNode
}

export function ModalRoot({ children }: ModalRootProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm">
      {children}
    </div>
  )
}
