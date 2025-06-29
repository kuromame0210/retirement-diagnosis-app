/**
 * V3診断システム - 専用レイアウト
 */

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "V3診断 - AIテキスト診断システム",
  description: "全テキスト回答による高精度キャリア診断。いつでも途中診断可能。",
  keywords: "V3診断,テキスト診断,キャリア診断,転職相談,AI分析",
}

export default function V3Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* V3専用ヘッダー */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 px-4 sm:px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-white/20 rounded text-xs font-bold">V3</span>
            <span className="text-sm font-medium">AIテキスト診断</span>
          </div>
          <div className="hidden sm:block text-xs opacity-80">
            途中でも診断可能 • 最後まで答えるとより正確
          </div>
          {/* モバイル用短縮版 */}
          <div className="sm:hidden text-xs opacity-80">
            途中診断OK
          </div>
        </div>
      </div>
      
      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-4xl">
        {children}
      </main>
      
      {/* V3専用フッター */}
      <footer className="bg-gray-100 border-t py-6 mt-12">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-gray-600">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
              V3システム
            </span>
            <div className="hidden sm:flex items-center gap-4">
              <span>|</span>
              <span>全テキスト回答形式</span>
              <span>|</span>
              <span>Claude 3.5 Sonnet AI分析</span>
            </div>
            {/* モバイル用簡略版 */}
            <div className="sm:hidden text-xs">
              全テキスト回答 • AI分析
            </div>
          </div>
          <p className="text-xs sm:text-sm">あなたのキャリアの次のステップを見つけましょう</p>
        </div>
      </footer>
    </div>
  )
}