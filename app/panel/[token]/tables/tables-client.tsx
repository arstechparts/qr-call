'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RestaurantRow = {
  id: string
  name: string
  panel_token: string
}

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string // uuid -> string gelir
  is_active: boolean
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [adding, setAdding] = useState(false)

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

  async function load() {
    setLoading(true)
    setErr(null)

    // 1) Restoranı PANEL TOKEN ile bul
    const { data: r, error: re } = await supabase
      .from('restaurants')
      .select('id, name, panel_token')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (re || !r) {
      setRestaurant(null)
      setTables([])
      setErr('Restaurant bulunamadı (panel token yanlış olabilir).')
      setLoading(false)
      return
    }

    setRestaurant(r as RestaurantRow)

    // 2) Masaları getir
    const { data: t, error: te } = await supabase
      .from('restaurant_tables')
      .select('id, restaurant_id, table_number, table_token, is_active')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (te) {
      setTables([])
      setErr(te.message)
    } else {
      setTables((t || []) as TableRow[])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    if (adding) return
    setAdding(true)
    setErr(null)

    // RPC param adı: p_panel_token (SQL'de böyle)
    const { data, error } = await supabase.rpc('add_next_table_by_panel', {
      p_panel_token: panelToken,
    })

    if (error) {
      setErr(error.message)
      setAdding(false)
      return
    }

    // yeni masa eklendi -> listeyi yenile
    await load()
    setAdding(false)
  }

  function openQr(tableToken: string) {
    window.open(`/t/${tableToken}`, '_blank')
  }

  return (
    <div style={bgStyle}>
      <div style={{ width: '100%', maxWidth: 680, display: 'grid', gap: 14 }}>
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.6 }}>Masalar</div>
            <div style={{ marginTop: 6, opacity: 0.7, fontSize: 14 }}>
              {loading ? 'Yükleniyor…' : restaurant ? 'Hazır' : '—'}
            </div>
          </div>

          <button
            onClick={addNextTable}
            disabled={loading || !restaurant || adding}
            style={{
              borderRadius: 18,
              padding: '14px 16px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontWeight: 800,
              cursor: loading || !restaurant || adding ? 'not-allowed' : 'pointer',
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
              background: 'rgba(255,80,80,0.08)',
            }}
          >
            {err}
          </div>
        )}

        <div style={cardStyle}>
          {!loading && tables.length === 0 ? (
            <div style={{ opacity: 0.8 }}>Henüz masa yok.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {tables.map((t) => (
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
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Masa {t.table_number}</div>

                  <button
                    onClick={() => openQr(t.table_token)}
                    style={{
                      borderRadius: 14,
                      padding: '10px 12px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontWeight: 800,
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