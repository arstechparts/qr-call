'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string
  panel_token: string | null
}

type Table = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  is_active: boolean
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const APP = 'https://qr-call.vercel.app'

  // DEMO için Casita'yı direkt bağladık
  const DEMO_RESTAURANT_ID = '2d0e88c2-7835-4a1b-86fe-e28e44f0b87d'
  const DEMO_RESTAURANT_NAME = 'Casita Nişantaşı'

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const tableMap = useMemo(() => {
    const m = new Map<number, Table>()
    tables.forEach((t) => m.set(t.table_number, t))
    return m
  }, [tables])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      // Restaurant sabit Casita
      setRestaurant({
        id: DEMO_RESTAURANT_ID,
        name: DEMO_RESTAURANT_NAME,
        panel_token: panelToken || null,
      })

      // Casita restaurant_id ile masaları çek
      const { data: t, error: tErr } = await supabase
        .from('restaurant_tables')
        .select('id,restaurant_id,table_number,table_token,is_active')
        .eq('restaurant_id', DEMO_RESTAURANT_ID)
        .order('table_number', { ascending: true })

      if (tErr) throw tErr

      setTables((t || []) as Table[])
    } catch (e: any) {
      setError(e?.message || 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function getQrUrl(tableToken: string) {
    return (
      'https://api.qrserver.com/v1/create-qr-code/?size=1200x1200&data=' +
      encodeURIComponent(`${APP}/t/${tableToken}`)
    )
  }

  function openQr(tableToken: string) {
    window.open(getQrUrl(tableToken), '_blank')
  }

  function openLink(tableToken: string) {
    window.open(`${APP}/t/${tableToken}`, '_blank')
  }

  async function downloadQr(tableToken: string, tableNumber: number) {
    try {
      const res = await fetch(getQrUrl(tableToken))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `masa-${tableNumber}-qr.png`
      document.body.appendChild(a)
      a.click()
      a.remove()

      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || 'QR indirilemedi')
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 20 }}>
      <div
        style={{
          borderRadius: 28,
          padding: 20,
          background:
            'radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(180deg, #0b1220 0%, #060a12 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>Masalar</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              {loading ? 'Yükleniyor…' : restaurant ? restaurant.name : '—'}
            </div>
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 16,
              padding: 14,
              border: '1px solid rgba(255,100,100,0.35)',
              background: 'rgba(255,100,100,0.12)',
              color: '#ffd5d5',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          {[...Array(34)].map((_, i) => {
            const n = i + 1
            const row = tableMap.get(n)

            return (
              <div
                key={n}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.06)',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>Masa {n}</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                    {row ? 'Oluşturuldu' : 'Henüz oluşturulmadı'}
                  </div>
                </div>

                {row ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => openQr(row.table_token)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      QR Gör
                    </button>

                    <button
                      onClick={() => downloadQr(row.table_token, row.table_number)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      QR İndir
                    </button>

                    <button
                      onClick={() => openLink(row.table_token)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Link Aç
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.45)',
                      fontWeight: 600,
                    }}
                  >
                    —
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}