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
  created_at?: string
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://qr-call.vercel.app'

  const tokenSafe = (panelToken || '').trim()

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [working, setWorking] = useState<boolean>(false)

  const allNumbers = useMemo(() => Array.from({ length: 34 }, (_, i) => i + 1), [])

  const tableByNumber = useMemo(() => {
    const m = new Map<number, TableRow>()
    for (const t of tables) m.set(t.table_number, t)
    return m
  }, [tables])

  async function loadAll() {
    setLoading(true)
    setError('')

    try {
      if (!tokenSafe) {
        setRestaurant(null)
        setTables([])
        setError('Panel token gelmedi (URL yanlış olabilir).')
        return
      }

      const r = await supabase
        .from('restaurants')
        .select('id,name,panel_token')
        .eq('panel_token', tokenSafe)
        .maybeSingle()

      if (r.error) throw r.error

      if (!r.data) {
        setRestaurant(null)
        setTables([])
        setError('Restaurant bulunamadı (panel token yanlış olabilir).')
        return
      }

      setRestaurant(r.data as RestaurantRow)

      const t = await supabase
        .from('restaurant_tables')
        .select('id,restaurant_id,table_number,table_token,is_active,created_at')
        .eq('restaurant_id', r.data.id)
        .order('table_number', { ascending: true })

      if (t.error) throw t.error

      setTables((t.data ?? []) as TableRow[])
    } catch (e: any) {
      setError(e?.message || 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenSafe])

  function newUuid(): string {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
      .toString(16)
      .slice(2)}`
  }

  async function createTable(tableNumber: number) {
    if (!restaurant) return
    if (tableByNumber.get(tableNumber)) return

    setWorking(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert({
          restaurant_id: restaurant.id,
          table_number: tableNumber,
          is_active: true,
          table_token: newUuid(),
        })
        .select('id,restaurant_id,table_number,table_token,is_active,created_at')
        .single()

      if (error) throw error

      setTables((prev) => {
        const next = [...prev, data as TableRow]
        next.sort((a, b) => a.table_number - b.table_number)
        return next
      })
    } catch (e: any) {
      setError(e?.message || 'Masa oluşturulamadı')
    } finally {
      setWorking(false)
    }
  }

  async function createNextMissing() {
    if (!restaurant) return

    setWorking(true)
    setError('')

    try {
      const missing = allNumbers.find((n) => !tableByNumber.get(n))
      if (!missing) return
      await createTable(missing)
    } finally {
      setWorking(false)
    }
  }

  function openQr(tableToken: string) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(
      `${APP_URL}/t/${tableToken}`
    )}`
    window.open(qrUrl, '_blank')
  }

  function openCustomerLink(tableToken: string) {
    const url = `${APP_URL}/t/${tableToken}`
    window.open(url, '_blank')
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
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
            onClick={createNextMissing}
            disabled={!restaurant || working || loading}
            style={{
              padding: '14px 16px',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.10)',
              color: '#fff',
              fontWeight: 700,
              opacity: !restaurant || working || loading ? 0.4 : 1,
              cursor: !restaurant || working || loading ? 'not-allowed' : 'pointer',
            }}
          >
            Masa Ekle (1-34)
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
          {allNumbers.map((n) => {
            const row = tableByNumber.get(n)

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
                      onClick={() => openCustomerLink(row.table_token)}
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
                  <button
                    onClick={() => createTable(n)}
                    disabled={!restaurant || working || loading}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontWeight: 700,
                      opacity: !restaurant || working || loading ? 0.4 : 1,
                      cursor: !restaurant || working || loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Oluştur
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}