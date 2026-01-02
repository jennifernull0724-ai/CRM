import React from 'react'

interface ActiveRouteIndicatorProps {
  isActive?: boolean
}

export function ActiveRouteIndicator({ isActive }: ActiveRouteIndicatorProps) {
  return (
    <span
      aria-hidden
      className={`block h-8 w-1 rounded-full transition ${isActive ? 'bg-orange-500' : 'bg-transparent'}`}
    />
  )
}
