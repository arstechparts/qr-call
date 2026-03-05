'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string
  panel_token: string
}

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  token: string | null
  is_active: boolean
  created_at: string
}

export default function TablesPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const appUrl = useMemo(() => {
    const u = process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app'
    return u.replace(/\/$/, '')
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setErr(null)

      const { data: r, error: rErr } = await supabase
        .from('restaurants')
        .select('id, name, panel_token')
        .eq('panel_token', panelToken)
        .maybeSingle()

      if (!alive) return

      if (rErr || !r) {
        setRestaurant(null)
        setTables([])
        setErr('Panel bulunamadı (restaurant yok).')
        setLoading(false)
        return
      }

      setRestaurant(r as Restaurant)

      const { data: t, error: tErr } = await supabase
        .from('restaurant_tables')
        .select('id, restaurant_id, table_number, table_token, token, is_active, created_at')
        .eq('restaurant_id', r.id)
        .order('table_number', { ascending: true })

      if (!alive) return

      if (tErr) {
        setErr(tErr.message)
        setTables([])
      } else {
        setTables((t || []) as TableRow[])
      }
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [panelToken])

  async function refreshTables(rid: string) {
    const { data: t } = await supabase
      .from('restaurant_tables')
      .select('id, restaurant_id, table_number, table_token, token, is_active, created_at')
      .eq('restaurant_id', rid)
      .order('table_number', { ascending: true })

    setTables((t || []) as TableRow[])
  }

  async function addNextTable() {
    if (!restaurant) return
    setAdding(true)
    setErr(null)

    try {
      const max = tables.reduce((m, x) => Math.max(m, x.table_number), 0)
      const nextNum = max + 1

      const tableTokenUuid = crypto.randomUUID() // uuid
      const tokenText = tableTokenUuid.replaceAll('-', '') // text (NOT NULL ise kurtarır)

      const { error } = await supabase.from('restaurant_tables').insert({
        restaurant_id: restaurant.id,
        table_number: nextNum,
        table_token: tableTokenUuid,
        token: tokenText, // bazı tablolar NOT NULL istiyor
        is_active: true,
      })

      if (error) {
        setErr(error.message)
        return
      }

      await refreshTables(restaurant.id)
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div>Yükleniyor…</div>

  return (
    <div>
      <h2 style={{ margin: '6px 0 6px' }}>Masalar {restaurant ? `- ${restaurant.name}` : '(bulunamadı)'}</h2>

      <div style={{ marginBottom: 12 }}>
        <button onClick={addNextTable} disabled={!restaurant || adding}>
          {adding ? 'Ekleniyor…' : 'Sıradaki Masayı Ekle'}
        </button>
      </div>

      {err && (
        <div style={{ background: '#ffe6e6', border: '1px solid #ffb3b3', padding: 10, borderRadius: 8 }}>
          {err}
        </div>
      )}

      {!restaurant ? (
        <div style={{ marginTop: 12 }}>Henüz masa yok.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {tables.map((t) => {
            const customerLink = `${appUrl}/t/${t.table_token}`

            return (
              <div
                key={t.id}
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 700 }}>Masa {t.table_number}</div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <a href={customerLink} target="_blank" rel="noreferrer">
                    QR Link
                  </a>
                  <a href={customerLink} target="_blank" rel="noreferrer">
                    QR Gör
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <a href={`/panel/${panelToken}/requests`}>İstekler</a>
      </div>
    </div>
  )
}