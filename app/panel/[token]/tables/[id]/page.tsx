'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'react-qr-code'
import Link from 'next/link'

type Restaurant = { id: string; name: string; panel_token: string }
type TableRow = { id: string; restaurant_id: string; table_number: number; table_token: string }

export default function TableQrPage({ params }: { params: { token: string; id: string } }) {
  const panelToken = params.token
  const tableId = params.id

  const [err, setErr] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [row, setRow] = useState<TableRow | null>(null)

  const baseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    )
  }, [])

  useEffect(() => {
    ;(async () => {
      setErr(null)

      const r = await supabase
        .from('restaurants')
        .select('id, name, panel_token')
        .eq('panel_token', panelToken)
        .limit(1)
        .maybeSingle()

      if (r.error || !r.data) {
        setErr('Panel bulunamadı (restaurant yok).')
        return
      }
      setRestaurant(r.data as Restaurant)

      const t = await supabase
        .from('restaurant_tables')
        .select('id, restaurant_id, table_number, table_token')
        .eq('id', tableId)
        .eq('restaurant_id', r.data.id)
        .limit(1)
        .maybeSingle()

      if (t.error || !t.data) {
        setErr('Masa bulunamadı.')
        return
      }

      setRow(t.data as TableRow)
    })()
  }, [panelToken, tableId])

  if (err) return <div style={{ padding: 16 }}>{err}</div>
  if (!row || !restaurant) return <div style={{ padding: 16 }}>Yükleniyor…</div>

  const url = `${baseUrl}/t/${row.table_token}`

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/panel/${panelToken}/tables`}>← Masalara dön</Link>
      </div>

      <h2 style={{ margin: 0 }}>Masa {row.table_number} QR</h2>
      <div style={{ opacity: 0.7, marginTop: 6 }}>{restaurant.name}</div>

      <div style={{ marginTop: 18, padding: 16, border: '1px solid #ddd', borderRadius: 12, display: 'inline-block', background: '#fff' }}>
        <QRCode value={url} size={240} />
      </div>

      <div style={{ marginTop: 14 }}>
        <a href={url} target="_blank" rel="noreferrer">{url}</a>
      </div>
    </div>
  )
}