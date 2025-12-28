import Navigation from '@/components/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </>
  )
}
