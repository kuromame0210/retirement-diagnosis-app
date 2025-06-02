import type { Metadata } from "next"
import { Suspense } from "react"
import Script from "next/script"
import { Inter } from "next/font/google"
import GaPageView from "@/components/ga-page-view"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const GA_ID = process.env.NEXT_PUBLIC_GA_ID   // ← ここで取得

export const metadata: Metadata = {
  title: "退職診断 - あなたに最適な働き方を見つける",
  description:
    "AI診断で現在の状況を整理し、最適な行動を提案します。無料で匿名利用可能。",
  keywords: "退職診断,転職相談,キャリア診断,仕事の悩み,働き方",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        {/* ---------- Google tag (gtag.js)  ---------- */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: false });
              `}
            </Script>
          </>
        )}
      </head>

      <body className={inter.className}>
        <Suspense fallback={null}>
          {/* page_view を送るクライアント側フック */}
          <GaPageView />
        </Suspense>

        {/* 画面本体 */}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {children}
        </div>
      </body>
    </html>
  )
}
