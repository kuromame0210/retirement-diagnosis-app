'use client'

export default function RefreshControls() {
  const handleNormalReload = () => {
    window.location.reload()
  }

  const handleForceRefresh = () => {
    // ルーターキャッシュをクリアしてから強制リロード
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName)
        })
      })
    }
    window.location.href = window.location.href
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-blue-900">管理画面データ</h1>
          <p className="text-sm text-blue-700">
            最新データ取得時刻: {new Date().toLocaleString('ja-JP')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNormalReload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            🔄 通常リロード
          </button>
          <button
            onClick={handleForceRefresh}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            ⚡ 強制リフレッシュ
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-blue-600">
        ⚠️ データが古い場合は「強制リフレッシュ」をクリックしてください
      </div>
    </div>
  )
}