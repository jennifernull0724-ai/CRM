import React from 'react'

interface ActivityTimelineLayoutProps {
  composer?: React.ReactNode
  timeline: React.ReactNode
  associations?: React.ReactNode
}

export function ActivityTimelineLayout({ composer, timeline, associations }: ActivityTimelineLayoutProps) {
  return (
    <div className="grid gap-3">
      {composer}
      {timeline}
      {associations}
    </div>
  )
}
