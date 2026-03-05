'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RestaurantRow = {
  id: string
  name: string
  panel_token: string | null
}

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  is_active: boolean
}

export default function PanelTablesPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])

  const bgStyle = useMemo(
    () => ({
      minHeight: '100vh',
      padding: 16,
      background:
        'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
        'linear-gradient(180deg, #0b1220 0%, #0a0f1a 100%)',
      display: 'flex',
      justifyContent: 'center',
    }),
    []
  )

  const card: React.CSSProperties = {
    borderRadius: 24,
    padding: 18,
    color: '#fff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  }

  const btn: React.CSSProperties = {
    width: '100%',
    borderRadius: 18,
    padding: '16px 14px',
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.10)',
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  }

  async function loadAll() {
    setLoading(true)
    setErr(null)

    // Restaurant'ı panel_token ile bul
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id, name, panel_token')
      .eq('panel_token', panelToken)
      .limit(1)
      .maybeSingle()

    if (rErr || !r) {
      setRestaurant(null)
      setTables([])
      setErr('Restaurant bulunamadı (panel token yanlış olabilir).')
      setLoading(false)
      return
    }

    setRestaurant(r as RestaurantRow)

    // Masaları çek
    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id, restaurant_id, table_number, table_token, is_active')
      .eq('restaurant_id', (r as RestaurantRow).id)
      .order('table_number', { ascending: true })

    if (tErr) {
      setTables([])
      setErr(tErr.message)
      setLoading(false)
      return
    }

    setTables((t ?? []) as TableRow[])
    setLoading(false)
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!alive) return
      await loadAll()
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    if (!restaurant) return

    setAdding(true)
    setErr(null)

    const nextNumber =
      tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) + 1 : 1

    const newToken =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    const { error } = await supabase.from('restaurant_tables').insert({
      restaurant_id: restaurant.id,
      table_number: nextNumber,
      table_token: newToken,
      is_active: true,
    })

    setAdding(false)

    if (error) {
      setErr(error.message)
      return
    }

    await loadAll()
  }

  function openQr(tableToken: string) {
    const url = `https://qr-call.vercel.app/t/${tableToken}`
    window.open(url, '_blank')
  }

  return (
    <div style={bgStyle}>
      <div style={{ width: '100%', maxWidth: 520, display: 'grid', gap: 14 }}>
        <div style={card}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>Masalar</div>
          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.8 }}>
            {restaurant ? restaurant.name : 'Yükleniyor…'}
          </div>
        </div>

        <button
          style={{
            ...btn,
            opacity: restaurant ? 1 : 0.45,
            cursor: restaurant ? (adding ? 'not-allowed' : 'pointer') : 'not-allowed',
          }}
          disabled={!restaurant || adding}
          onClick={addNextTable}
        >
          {adding ? 'Ekleniyor…' : 'Masa Ekle (+1)'}
        </button>

        {err && (
          <div
            style={{
              ...card,
              border: '1px solid rgba(255,80,80,0.35)',
              background: 'rgba(255,0,0,0.08)',
              color: '#ffd7d7',
            }}
          >
            {err}
          </div>
        )}

        <div style={card}>
          {loading ? (
            <div style={{ opacity: 0.85 }}>Yükleniyor…</div>
          ) : tables.length === 0 ? (
            <div style={{ opacity: 0.85 }}>Henüz masa yok.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {tables.map(t => (
                <div
                  key={t.id}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 900 }}>Masa {t.table_number}</div>

                  <button
                    onClick={() => openQr(t.table_token)}
                    style={{
                      borderRadius: 14,
                      padding: '10px 12px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.10)',
                      color: '#fff',
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    QR Görüntüle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}