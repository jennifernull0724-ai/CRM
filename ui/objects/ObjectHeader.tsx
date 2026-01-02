import React from 'react'

interface ObjectHeaderProps {
  titleSlot?: React.ReactNode
  actionSlot?: React.ReactNode
  metaSlot?: React.ReactNode
}

export function ObjectHeader({ titleSlot, actionSlot, metaSlot }: ObjectHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="space-y-1">
        {titleSlot}
        {metaSlot}
      </div>
      <div className="flex items-center gap-2">{actionSlot}</div>
    </div>
  )
}
