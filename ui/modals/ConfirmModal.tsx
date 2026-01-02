import React from 'react'

interface ConfirmModalProps {
  title?: React.ReactNode
  body?: React.ReactNode
  actions?: React.ReactNode
}

export function ConfirmModal({ title, body, actions }: ConfirmModalProps) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      {title && <div className="text-base font-semibold text-slate-800">{title}</div>}
      {body && <div className="mt-3 text-sm text-slate-600">{body}</div>}
      <div className="mt-5 flex items-center justify-end gap-2">{actions}</div>
    </div>
  )
}
