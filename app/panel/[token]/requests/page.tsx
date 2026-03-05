'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = { id: string; name: string; panel_token: string }
type ReqRow = {
  id: string
  restaurant_id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
}

export default function RequestsPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [err, setErr] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<ReqRow[]>([])

  async function load() {
    setErr(null)

    const r = await supabase
      .from('restaurants')
      .select('id, name, panel_token')
      .eq('panel_token', panelToken)
      .limit(1)
      .maybeSingle()

    if (r.error || !r.data) {
      setRestaurant(null)
      setRows([])
      setErr('Panel bulunamadı (restaurant yok).')
      return
    }

    setRestaurant(r.data as Restaurant)

    const q = await supabase
      .from('requests')
      .select('id, restaurant_id, table_number, request_type, status, created_at')
      .eq('restaurant_id', r.data.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (q.error) {
      setErr(q.error.message)
      setRows([])
    } else {
      setRows((q.data as ReqRow[]) || [])
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>İstekler</div>
          <div style={{ opacity: 0.7 }}>{restaurant ? restaurant.name : ''}</div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={load} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd' }}>
            Yenile
          </button>
          <Link href={`/panel/${panelToken}/tables`}>Masalar</Link>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 14, padding: 12, border: '1px solid #f3b3b3', background: '#ffecec', borderRadius: 10, color: '#8a1f1f' }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ padding: 12, border: '1px solid #ddd', borderRadius: 12 }}>
            <b>Masa {r.table_number}</b> — {r.request_type} — {r.status}
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
              {new Date(r.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}