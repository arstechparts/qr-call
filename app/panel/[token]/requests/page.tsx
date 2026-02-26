'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string
  panel_token: string
  logo_url?: string | null
}

type ReqRow = {
  id: string
  restaurant_id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
  completed_at: string | null
}

const fmtTR = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })

export default function Page() {
  const params = useParams<{ token: string }>()
  const panelToken = params?.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<ReqRow[]>([])

  async function loadRestaurant() {
    if (!panelToken) return null
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, panel_token, logo_url')
      .eq('panel_token', panelToken)
      .single()
    if (error) return null
    return data as Restaurant
  }

  async function load(restaurantId: string) {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    if (error) alert(error.message)
    else setRows((data ?? []) as ReqRow[])
  }

  useEffect(() => {
    ;(async () => {
      const r = await loadRestaurant()
      if (!r) return
      setRestaurant(r)
      await load(r.id)

      const ch = supabase
        .channel(`requests-live-${r.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => load(r.id))
        .subscribe()

      return () => {
        supabase.removeChannel(ch)
      }
    })()
  }, [panelToken])

  async function complete(id: string) {
    const { error } = await supabase
      .from('requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) alert(error.message)
    else if (restaurant) load(restaurant.id)
  }

  if (!restaurant) return <div style={{ padding: 40 }}>Yükleniyor…</div>

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {restaurant.logo_url ? (
            <img src={restaurant.logo_url} alt="logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
          ) : null}
          <h1 style={{ margin: 0 }}>{restaurant.name} · İstekler</h1>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Link href={`/panel/${panelToken}`}>Panel</Link>
          <Link href={`/panel/${panelToken}/tables`}>Masalar</Link>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {rows.length === 0 ? (
          <div>Bekleyen istek yok.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>Masa {r.table_number}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {r.request_type === 'waiter' ? 'Garson' : r.request_type === 'bill' ? 'Hesap' : r.request_type}
                    {' · '}
                    {fmtTR(r.created_at)}
                  </div>
                </div>

                <button onClick={() => complete(r.id)} style={{ padding: '10px 12px', cursor: 'pointer' }}>
                  Tamamlandı
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}