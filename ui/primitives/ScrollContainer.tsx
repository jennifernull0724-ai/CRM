import React from 'react'

interface ScrollContainerProps {
  children?: React.ReactNode
  height?: number | string
}

export function ScrollContainer({ children, height = '100%' }: ScrollContainerProps) {
  return (
    <div className="overflow-auto" style={{ maxHeight: height }}>
      {children}
    </div>
  )
}
