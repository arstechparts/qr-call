'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PanelTablesBridge() {
  const router = useRouter()

  useEffect(() => {
    const last = localStorage.getItem('last_panel_token')
    if (last) router.replace(`/panel/${last}/tables`)
    else router.replace('/panel')
  }, [router])

  return null
}