'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
  created_at?: string
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

  const cardStyle: React.CSSProperties = {
    borderRadius: 24,
    padding: 18,
    color: '#fff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  }

  async function loadAll() {
    setLoading(true)
    setErr(null)

    // 1) restaurant bul
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

    // 2) masaları çek
    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id, restaurant_id, table_number, table_token, is_active, created_at')
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
    if (!restaurant) {
      setErr('Restaurant bulunamadı (panel token yanlış olabilir).')
      return
    }

    setAdding(true)
    setErr(null)

    const nextNumber =
      tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) + 1 : 1

    // UUID üret
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

  return (
    <div style={bgStyle}>
      <div style={{ width: '100%', maxWidth: 760, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Link href={`/panel/${panelToken}`} style={{ textDecoration: 'none' }}>
            <div style={{ ...cardStyle, padding: '12px 16px', cursor: 'pointer' }}>Panel</div>
          </Link>
          <Link href={`/panel/${panelToken}/requests`} style={{ textDecoration: 'none' }}>
            <div style={{ ...cardStyle, padding: '12px 16px', cursor: 'pointer' }}>İstekler</div>
          </Link>
          <div style={{ ...cardStyle, padding: '12px 16px', opacity: 0.9 }}>Masalar</div>
        </div>

        <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Masalar</div>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.8 }}>
              {restaurant ? `${restaurant.name}` : 'Yükleniyor...'}
            </div>
          </div>

          <button
            onClick={addNextTable}
            disabled={adding || !restaurant}
            style={{
              borderRadius: 16,
              padding: '14px 16px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: adding ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)',
              color: '#fff',
              fontWeight: 800,
              cursor: adding ? 'not-allowed' : 'pointer',
              minWidth: 170,
            }}
          >
            {adding ? 'Ekleniyor…' : 'Masa Ekle (+1)'}
          </button>
        </div>

        {err && (
          <div
            style={{
              ...cardStyle,
              border: '1px solid rgba(255,80,80,0.35)',
              background: 'rgba(255,0,0,0.08)',
              color: '#ffd7d7',
            }}
          >
            {err}
          </div>
        )}

        <div style={cardStyle}>
          {loading ? (
            <div style={{ opacity: 0.85 }}>Yükleniyor…</div>
          ) : tables.length === 0 ? (
            <div style={{ opacity: 0.85 }}>Henüz masa yok.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {tables.map(t => {
                const customerLink = `https://qr-call.vercel.app/t/${t.table_token}`
                return (
                  <div
                    key={t.id}
                    style={{
                      borderRadius: 18,
                      padding: 14,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'rgba(255,255,255,0.04)',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>Masa {t.table_number}</div>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>
                        {t.is_active ? 'aktif' : 'pasif'}
                      </div>
                    </div>

                    <div style={{ fontSize: 13, opacity: 0.8, wordBreak: 'break-all' }}>
                      token: {t.table_token}
                    </div>

                    <a
                      href={customerLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: 6,
                        textDecoration: 'none',
                        borderRadius: 14,
                        padding: '10px 12px',
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontWeight: 800,
                        width: 'fit-content',
                      }}
                    >
                      QR / Müşteri Linkini Aç
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button
          onClick={loadAll}
          style={{
            ...cardStyle,
            cursor: 'pointer',
            textAlign: 'center',
            fontWeight: 900,
            padding: 14,
          }}
        >
          Yenile
        </button>
      </div>
    </div>
  )
}