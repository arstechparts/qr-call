'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'qrcode'

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

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => {
    const arr: number[] = []
    for (let i = 1; i <= 34; i++) arr.push(i)
    return arr
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const token = (panelToken || '').trim()
      if (!token) {
        setRestaurant(null)
        setTables([])
        setError('Panel token gelmedi (URL yanlış olabilir).')
        return
      }

      const { data: r, error: rErr } = await supabase
        .from('restaurants')
        .select('id,name,panel_token')
        .eq('panel_token', token)
        .maybeSingle()

      if (rErr) throw rErr
      if (!r) {
        setRestaurant(null)
        setTables([])
        setError('Restaurant bulunamadı (panel token yanlış olabilir).')
        return
      }

      setRestaurant(r)

      const { data: t, error: tErr } = await supabase
        .from('restaurant_tables')
        .select('id,restaurant_id,table_number,table_token,is_active')
        .eq('restaurant_id', r.id)
        .order('table_number', { ascending: true })

      if (tErr) throw tErr
      setTables(t || [])
    } catch (e: any) {
      setError(e?.message || 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  const tableByNumber = useMemo(() => {
    const m = new Map<number, TableRow>()
    for (const t of tables) m.set(t.table_number, t)
    return m
  }, [tables])

  async function createTable(tableNumber: number) {
    if (!restaurant) return
    setWorking(true)
    setError(null)
    try {
      // idempotent: varsa hata vermesin diye önce kontrol
      const existing = tableByNumber.get(tableNumber)
      if (existing) return

      const { data, error: insErr } = await supabase
        .from('restaurant_tables')
        .insert({
          restaurant_id: restaurant.id,
          table_number: tableNumber,
          is_active: true,
        })
        .select('id,restaurant_id,table_number,table_token,is_active')
        .single()

      if (insErr) throw insErr

      setTables((prev) => {
        const next = [...prev, data]
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
    setError(null)
    try {
      // 1-34 aralığında ilk eksik numarayı bul
      let target: number | null = null
      for (const n of range) {
        if (!tableByNumber.get(n)) {
          target = n
          break
        }
      }
      if (!target) return
      await createTable(target)
    } finally {
      setWorking(false)
    }
  }

  async function showQr(table: TableRow) {
    try {
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/t/${table.table_token}`
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 720 })
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write(`
        <html>
          <head><title>Masa ${table.table_number} QR</title></head>
          <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#111;">
            <div style="text-align:center;">
              <div style="color:#fff;font-family:system-ui;margin-bottom:12px;font-size:20px;">Masa ${table.table_number}</div>
              <img src="${dataUrl}" style="background:#fff;padding:12px;border-radius:16px;max-width:90vw;max-height:80vh;" />
              <div style="margin-top:12px;">
                <a download="masa-${table.table_number}-qr.png" href="${dataUrl}"
                   style="display:inline-block;padding:10px 14px;background:#fff;border-radius:10px;text-decoration:none;font-family:system-ui;">
                  QR İndir
                </a>
              </div>
            </div>
          </body>
        </html>
      `)
      w.document.close()
    } catch (e: any) {
      setError(e?.message || 'QR oluşturulamadı')
    }
  }

  // UI (minimal ve sağlam)
  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <div
        style={{
          borderRadius: 24,
          padding: 18,
          background: 'rgba(15, 23, 42, 0.85)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Masalar</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
              {restaurant ? restaurant.name : loading ? 'Yükleniyor…' : '—'}
            </div>
          </div>

          <button
            onClick={createNextMissing}
            disabled={!restaurant || loading || working}
            style={{
              padding: '14px 16px',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.12)',
              background: working || !restaurant ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontWeight: 700,
              minWidth: 150,
              cursor: !restaurant || loading || working ? 'not-allowed' : 'pointer',
            }}
          >
            Masa Ekle (1-34)
          </button>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 16,
              padding: 14,
              border: '1px solid rgba(255, 99, 99, 0.45)',
              background: 'rgba(255, 99, 99, 0.12)',
              color: '#ffd0d0',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {range.map((n) => {
            const t = tableByNumber.get(n)
            return (
              <div
                key={n}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 14px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>Masa {n}</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', marginTop: 4, fontWeight: 600 }}>
                    {t ? 'Oluşturuldu' : 'Henüz oluşturulmadı'}
                  </div>
                </div>

                {t ? (
                  <button
                    onClick={() => showQr(t)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    QR Görüntüle
                  </button>
                ) : (
                  <button
                    onClick={() => createTable(n)}
                    disabled={!restaurant || loading || working}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: !restaurant || loading || working ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: !restaurant || loading || working ? 'not-allowed' : 'pointer',
                      opacity: !restaurant || loading || working ? 0.5 : 1,
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