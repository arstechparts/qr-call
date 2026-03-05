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
  table_token: string
  is_active: boolean
  created_at?: string
}

export default function PanelTablesPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [adding, setAdding] = useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app'

  const wrapStyle = useMemo(
    () => ({
      minHeight: '100vh',
      padding: 16,
      background:
        'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
        'linear-gradient(180deg, #0b1220 0%, #0a0f1a 100%)',
      color: '#fff',
    }),
    []
  )

  const cardStyle: React.CSSProperties = {
    borderRadius: 18,
    padding: 14,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  }

  async function loadAll() {
    setLoading(true)
    setErr(null)

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

    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id, restaurant_id, table_number, table_token, is_active, created_at')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (tErr) {
      setTables([])
      setErr(tErr.message)
      setLoading(false)
      return
    }

    setTables((t || []) as TableRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    setAdding(true)
    setErr(null)

    // ✅ SQL'de çalışan fonksiyonun parametreli hali:
    // add_next_table_by_panel(p_panel_token text)
    const { error } = await supabase.rpc('add_next_table_by_panel', {
      p_panel_token: panelToken,
    })

    setAdding(false)

    if (error) {
      setErr(error.message)
      return
    }

    await loadAll()
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
    alert('Link kopyalandı ✅')
  }

  if (loading) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Masalar</div>
          <div style={{ opacity: 0.8, marginTop: 8 }}>Yükleniyor…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapStyle}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 12 }}>
        <div
          style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Masalar</div>
            {restaurant ? <div style={{ opacity: 0.75, marginTop: 6 }}>{restaurant.name}</div> : null}
          </div>

          <button
            onClick={addNextTable}
            disabled={adding}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.10)',
              color: '#fff',
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            {adding ? 'Ekleniyor…' : 'Masa Ekle (+1)'}
          </button>
        </div>

        {err ? (
          <div
            style={{
              ...cardStyle,
              border: '1px solid rgba(255,0,0,0.35)',
              background: 'rgba(255,0,0,0.10)',
            }}
          >
            {err}
          </div>
        ) : null}

        {tables.length === 0 ? (
          <div style={cardStyle}>Henüz masa yok.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {tables.map((t) => {
              const customerUrl = `${baseUrl}/t/${t.table_token}`
              const qrPageUrl = `${baseUrl}/panel/tables/${t.id}`

              return (
                <div
                  key={t.id}
                  style={{
                    ...cardStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 900 }}>Masa {t.table_number}</div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => window.open(qrPageUrl, '_blank')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontWeight: 900,
                      }}
                    >
                      QR Gör / İndir
                    </button>

                    <button
                      onClick={() => window.open(customerUrl, '_blank')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontWeight: 900,
                      }}
                    >
                      Müşteri Sayfası
                    </button>

                    <button
                      onClick={() => copyLink(customerUrl)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontWeight: 900,
                      }}
                    >
                      Link Kopyala
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}