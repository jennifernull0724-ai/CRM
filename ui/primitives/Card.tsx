import React from 'react'

interface CardProps {
  children?: React.ReactNode
  padding?: string
}

export function Card({ children, padding = 'p-4' }: CardProps) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${padding}`}>{children}</div>
}
