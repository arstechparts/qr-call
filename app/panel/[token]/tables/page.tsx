'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = { id: string; name: string; panel_token: string }
type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  is_active: boolean
}

export default function TablesPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [adding, setAdding] = useState(false)

  const base = useMemo(() => {
    // NEXT_PUBLIC_APP_URL varsa onu kullan; yoksa current origin
    return process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  }, [])

  async function load() {
    setLoading(true)
    setErr(null)

    // 1) panel_token -> restaurant bul
    const r = await supabase
      .from('restaurants')
      .select('id, name, panel_token')
      .eq('panel_token', panelToken)
      .limit(1)
      .maybeSingle()

    if (r.error || !r.data) {
      setRestaurant(null)
      setTables([])
      setErr('Panel bulunamadı (restaurant yok).')
      setLoading(false)
      return
    }

    setRestaurant(r.data as Restaurant)

    // 2) restaurant_id -> masaları çek
    const t = await supabase
      .from('restaurant_tables')
      .select('id, restaurant_id, table_number, table_token, is_active')
      .eq('restaurant_id', r.data.id)
      .order('table_number', { ascending: true })

    if (t.error) {
      setErr(t.error.message)
      setTables([])
    } else {
      setTables((t.data || []) as TableRow[])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    if (!restaurant) return
    setAdding(true)
    setErr(null)

    const maxNum = tables.reduce((m, x) => Math.max(m, x.table_number), 0)
    const nextNum = maxNum + 1

    const ins = await supabase.from('restaurant_tables').insert({
      restaurant_id: restaurant.id, // <-- ASLA "demo" değil!
      table_number: nextNum,
      is_active: true,
    })

    if (ins.error) {
      setErr(ins.error.message)
      setAdding(false)
      return
    }

    await load()
    setAdding(false)
  }

  if (loading) return <div style={{ padding: 24 }}>Yükleniyor…</div>

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 8 }}>Masalar {restaurant ? `(${restaurant.name})` : '(bulunamadı)'}</h2>

      <button
        onClick={addNextTable}
        disabled={!restaurant || adding}
        style={{
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid #ddd',
          background: '#fff',
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        {adding ? 'Ekleniyor…' : 'Sıradaki Masayı Ekle'}
      </button>

      {err && (
        <div style={{ padding: 12, border: '1px solid #f5b5b5', background: '#ffecec', borderRadius: 10, marginBottom: 16 }}>
          {err}
        </div>
      )}

      {tables.length === 0 ? (
        <div>Henüz masa yok.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {tables.map((r) => {
            const customerUrl = `${base}/t/${r.table_token}`

            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: 700 }}>Masa {r.table_number}</div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {/* QR Gör sayfası */}
                  <Link href={`/panel/${panelToken}/tables/${r.id}`} style={{ textDecoration: 'none' }}>
                    QR Gör
                  </Link>

                  {/* QR Link (müşteri linki) */}
                  <a href={customerUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    QR Link
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <Link href={`/panel/${panelToken}`} style={{ textDecoration: 'none' }}>
          ← Panele dön
        </Link>
        {'  '}|{'  '}
        <Link href={`/panel/${panelToken}/requests`} style={{ textDecoration: 'none' }}>
          İstekler
        </Link>
      </div>
    </div>
  )
}