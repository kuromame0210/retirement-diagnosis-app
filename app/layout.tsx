import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "退職診断 - あなたに最適な働き方を見つける",
  description: "AI診断で現在の状況を整理し、最適な行動を提案します。無料で匿名利用可能。",
  keywords: "退職診断,転職相談,キャリア診断,仕事の悩み,働き方",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">{children}</div>
      </body>
    </html>
  )
}
