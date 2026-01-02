import React from 'react'

interface PanelFooterProps {
  children?: React.ReactNode
}

export function PanelFooter({ children }: PanelFooterProps) {
  return <div className="flex items-center justify-end gap-2 pt-2">{children}</div>
}
