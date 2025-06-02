// components/ga-page-view.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function GaPageView() {
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const url = pathname + (search.toString() ? `?${search}` : '')
    if ((window as any).gtag) {
      ;(window as any).gtag('event', 'page_view', { page_path: url })
    }
  }, [pathname, search])

  return null
}
