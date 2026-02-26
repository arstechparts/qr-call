'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Restaurant = {
  id: string
  name: string
  panel_token: string
}

export default function PanelPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!token) return

      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('panel_token', token)
        .single()

      if (data) setRestaurant(data as Restaurant)
    })()
  }, [token])

  if (!restaurant) return <div style={{ padding: 40 }}>Panel bulunamadı.</div>

  return (
    <div style={{ padding: 40 }}>
      <h1>{restaurant.name} Panel</h1>

      <div style={{ marginTop: 20, display: 'flex', gap: 20 }}>
        <Link href={`/panel/${token}/tables`}>Masalar</Link>
        <Link href={`/panel/${token}/requests`}>İstekler</Link>
      </div>
    </div>
  )
}