export const metadata = { 
  title: "管理画面",
  other: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-sm">
      <header className="px-6 py-4 bg-gray-800 text-white">
        <h1 className="text-lg font-bold">キャリア診断 管理画面</h1>
      </header>
      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  )
}