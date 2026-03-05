'use client'

import { useEffect, useState } from 'react'
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
  table_token: string
  is_active: boolean
  created_at: string
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    setErr(null)

    // 1) restaurant
    const { data: r, error: re } = await supabase.rpc('get_restaurant_by_panel_token', {
      p_panel_token: panelToken,
    })

    const rr = Array.isArray(r) ? r[0] : null

    if (re || !rr) {
      setRestaurant(null)
      setTables([])
      setErr('Restaurant bulunamadı (panel token yanlış olabilir).')
      setLoading(false)
      return
    }

    setRestaurant(rr as RestaurantRow)

    // 2) tables
    const { data: t, error: te } = await supabase.rpc('list_tables_by_panel', {
      p_panel_token: panelToken,
    })

    if (te) {
      setTables([])
      setErr(te.message)
    } else {
      setTables(((t as any[]) || []) as TableRow[])
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

    const { error } = await supabase.rpc('add_next_table_by_panel', {
      p_panel_token: panelToken,
    })

    if (error) {
      setErr(error.message)
      setAdding(false)
      return
    }

    await load()
    setAdding(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 16,
        background:
          'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
          'linear-gradient(180deg, #0b1220 0%, #0a0f1a 100%)',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, display: 'grid', gap: 14 }}>
        <div
          style={{
            borderRadius: 24,
            padding: 18,
            color: '#fff',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Masalar</div>
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
              borderRadius: 24,
              padding: 18,
              color: '#fff',
              background: 'rgba(255,80,80,0.08)',
              border: '1px solid rgba(255,80,80,0.35)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            borderRadius: 24,
            padding: 18,
            color: '#fff',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}
        >
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
                    onClick={() => window.open(`/t/${t.table_token}`, '_blank')}
                    style={{
                      borderRadius: 14,
                      padding: '10px 12px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    QR Görüntüle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={load}
          style={{
            borderRadius: 24,
            padding: 18,
            color: '#fff',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Yenile
        </button>
      </div>
    </div>
  )
}