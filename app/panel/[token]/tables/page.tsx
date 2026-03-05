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

  const [qrOpen, setQrOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState<string>('')
  const [qrTitle, setQrTitle] = useState<string>('')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app'

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
    borderRadius: 22,
    padding: 16,
    color: '#fff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  }

  const btnStyle: React.CSSProperties = {
    borderRadius: 16,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    fontWeight: 700,
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

    // 2) tables çek
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
    setAdding(true)
    setErr(null)

    // SQL fonksiyonu: add_next_table_by_panel(p_panel_token text)
    const { data, error } = await supabase.rpc('add_next_table_by_panel', {
      p_panel_token: panelToken,
    })

    setAdding(false)

    if (error) {
      setErr(error.message)
      return
    }

    // data tek satır döner
    await loadAll()
  }

  function openQr(table: TableRow) {
    const url = `${appUrl}/t/${table.table_token}`
    setQrTitle(`Masa ${table.table_number}`)
    setQrUrl(url)
    setQrOpen(true)
  }

  async function downloadQr() {
    try {
      // ücretsiz QR servis (gör / indir hızlı)
      const img = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(
        qrUrl
      )}`

      const res = await fetch(img)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${qrTitle.replaceAll(' ', '_')}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch (e: any) {
      alert('İndirme hatası: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  return (
    <div style={bgStyle}>
      <div style={{ width: '100%', maxWidth: 720, display: 'grid', gap: 14 }}>
        {/* Header */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 6 }}>Masalar</div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.6 }}>
              {restaurant ? restaurant.name : '—'}
            </div>
          </div>

          <button onClick={addNextTable} style={btnStyle} disabled={adding || !restaurant}>
            {adding ? 'Ekleniyor…' : 'Masa Ekle (+1)'}
          </button>
        </div>

        {/* Error */}
        {err && (
          <div
            style={{
              ...cardStyle,
              border: '1px solid rgba(255,0,80,0.45)',
              background: 'rgba(255,0,80,0.10)',
              color: '#ffd7e3',
            }}
          >
            {err}
          </div>
        )}

        {/* List */}
        <div style={cardStyle}>
          {loading ? (
            <div style={{ opacity: 0.85, fontSize: 16 }}>Yükleniyor…</div>
          ) : tables.length === 0 ? (
            <div style={{ opacity: 0.85, fontSize: 16 }}>Henüz masa yok.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {tables.map((t) => (
                <div
                  key={t.id}
                  style={{
                    borderRadius: 18,
                    padding: 12,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'grid' }}>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>Masa {t.table_number}</div>
                    <div style={{ opacity: 0.75, fontSize: 12, wordBreak: 'break-all' }}>
                      token: {t.table_token}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btnStyle} onClick={() => openQr(t)}>
                      QR Görüntüle
                    </button>
                    <a
                      href={`${appUrl}/t/${t.table_token}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...btnStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Link Aç
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Modal */}
        {qrOpen && (
          <div
            onClick={() => setQrOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 520,
                borderRadius: 22,
                padding: 16,
                background: '#0b1220',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
                color: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, opacity: 0.75 }}>QR</div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{qrTitle}</div>
                </div>
                <button style={btnStyle} onClick={() => setQrOpen(false)}>
                  Kapat
                </button>
              </div>

              <div style={{ marginTop: 12, borderRadius: 18, overflow: 'hidden', background: '#fff' }}>
                <img
                  alt="QR"
                  style={{ width: '100%', display: 'block' }}
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(qrUrl)}`}
                />
              </div>

              <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12, wordBreak: 'break-all' }}>{qrUrl}</div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button style={btnStyle} onClick={downloadQr}>
                  QR İndir
                </button>
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...btnStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Link Aç
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}