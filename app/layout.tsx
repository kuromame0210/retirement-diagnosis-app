import type { Metadata } from "next"
import { Suspense } from "react"
import Script from "next/script"
import { Inter } from "next/font/google"
import GaPageView from "@/components/ga-page-view"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const GA_ID = process.env.NEXT_PUBLIC_GA_ID   // ← ここで取得
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID

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
        
        {/* ---------- Facebook Pixel ---------- */}
        {FB_PIXEL_ID && (
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
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
