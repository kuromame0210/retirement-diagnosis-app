// components/TrackButton.tsx
'use client'

import { ReactNode, MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

/* gtag ヘルパー（共通 util に置いても可） */
const track = (action: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', action, params)
  }
}

interface Props {
  href?: string                 // 省略すれば単なる計測ボタン
  label: string                 // GA4: label パラメータ
  step?: number                 // GA4: step パラメータ
  disabled?: boolean
  onClick?: () => void          // 追加処理（例: nextQuestion）
  children: ReactNode
  size?: 'lg' | 'md' | 'sm'
}

/* -------------------------------------------------- */
export default function TrackButton({
  href,
  label,
  step,
  disabled,
  onClick,
  children,
}: Props) {
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    /* 1) GA イベント送信 */
    track('step_click', { label, step })

    /* 2) 任意コールバック */
    onClick?.()

    /* 3) 遷移処理 (任意) */
    if (href) {
      if (href.startsWith('http')) {
        /* 外部 URL → 新規タブ */
        window.open(href, '_blank', 'noopener,noreferrer')
      } else {
        /* 内部 URL → App Router push */
        router.push(href)
      }
    }
  }

  return (
    <Button disabled={disabled} onClick={handleClick}>
      {children}
    </Button>
  )
}
