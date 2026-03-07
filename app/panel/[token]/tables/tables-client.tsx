'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string
  panel_token: string | null
  instagram_url?: string | null
  is_active?: boolean | null
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

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string>('')

  const tableMap = useMemo(() => {
    const m = new Map<number, Table>()
    tables.forEach((t) => m.set(Number(t.table_number), t))
    return m
  }, [tables])

  const visibleNumbers = useMemo(() => {
    const maxTableNumber =
      tables.length > 0 ? Math.max(...tables.map((t) => Number(t.table_number) || 0)) : 0

    const finalMax = Math.max(34, maxTableNumber)
    return Array.from({ length: finalMax }, (_, i) => i + 1)
  }, [tables])

  async function resolveRestaurant() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, panel_token, instagram_url, is_active')
      .eq('panel_token', panelToken)
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      throw new Error(`Restoran bulunamadı. Token: ${panelToken}`)
    }

    return data as Restaurant
  }

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const resolvedRestaurant = await resolveRestaurant()
      setRestaurant(resolvedRestaurant)

      const { data: t, error: tErr } = await supabase
        .from('restaurant_tables')
        .select('id, restaurant_id, table_number, table_token, is_active')
        .eq('restaurant_id', resolvedRestaurant.id)
        .order('table_number', { ascending: true })

      if (tErr) throw tErr

      setTables((t || []) as Table[])
    } catch (e: any) {
      setRestaurant(null)
      setTables([])
      setError(e?.message || 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [panelToken])

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

  function createUuid() {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async function addNextTable() {
    if (working || !restaurant) return

    setWorking(true)
    setError('')

    try {
      const maxTableNumber =
        tables.length > 0 ? Math.max(...tables.map((t) => Number(t.table_number) || 0)) : 0

      const nextTableNumber = maxTableNumber + 1
      const nextTableToken = createUuid()

      const { data, error: insertError } = await supabase
        .from('restaurant_tables')
        .insert({
          restaurant_id: restaurant.id,
          table_number: nextTableNumber,
          table_token: nextTableToken,
          is_active: true,
        })
        .select('id, restaurant_id, table_number, table_token, is_active')
        .single()

      if (insertError) throw insertError

      setTables((prev) => {
        const next = [...prev, data as Table]
        next.sort((a, b) => Number(a.table_number) - Number(b.table_number))
        return next
      })
    } catch (e: any) {
      setError(e?.message || 'Masa eklenemedi')
    } finally {
      setWorking(false)
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

          <button
            onClick={addNextTable}
            disabled={loading || working || !restaurant}
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontWeight: 700,
              cursor: loading || working || !restaurant ? 'not-allowed' : 'pointer',
              opacity: loading || working || !restaurant ? 0.5 : 1,
            }}
          >
            {working ? 'Ekleniyor...' : 'Masa Ekle (+1)'}
          </button>
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
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
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
          {visibleNumbers.map((n) => {
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