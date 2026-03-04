'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = { id: string; name: string | null }
type TableRow = { id: string; table_number: number; table_token: string; token: string | null }

export default function TablesPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const origin = useMemo(() => {
    if (typeof window === 'undefined') return 'https://qr-call.vercel.app'
    return window.location.origin
  }, [])

  async function loadAll() {
    setLoading(true)
    setErr('')

    // restaurant bul
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,name')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr) {
      setErr(rErr.message)
      setRestaurant(null)
      setRows([])
      setLoading(false)
      return
    }

    if (!r) {
      setErr('Panel bulunamadı (restaurant yok).')
      setRestaurant(null)
      setRows([])
      setLoading(false)
      return
    }

    setRestaurant(r)

    // sadece bu restaurant masaları
    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id,table_number,table_token,token')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (tErr) {
      setErr(tErr.message)
      setRows([])
      setLoading(false)
      return
    }

    setRows((t ?? []) as TableRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNext() {
    if (!restaurant) return
    if (adding) return

    setAdding(true)
    setErr('')

    const maxNum = rows.reduce((m, x) => Math.max(m, Number(x.table_number || 0)), 0)
    const nextNum = maxNum + 1

    // DB bazen token/table_token NOT NULL istiyor -> biz dolduralım
    const tokenText = crypto.randomUUID().replaceAll('-', '') // text
    const tableTokenUuid = crypto.randomUUID() // uuid string

    const { error } = await supabase.from('restaurant_tables').insert({
      restaurant_id: restaurant.id,
      table_number: nextNum,
      token: tokenText,
      table_token: tableTokenUuid,
      is_active: true,
    })

    if (error) {
      setErr(error.message)
      setAdding(false)
      return
    }

    await loadAll()
    setAdding(false)
  }

  if (loading) return <div style={{ padding: 24 }}>Yükleniyor...</div>

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ margin: 0 }}>Masalar</h1>
      <div style={{ opacity: 0.75, marginTop: 6 }}>
        {restaurant?.name ?? ''} {restaurant ? '' : '(bulunamadı)'}
      </div>

      <button
        onClick={addNext}
        disabled={!restaurant || adding}
        style={{ padding: '10px 14px', marginTop: 14, cursor: 'pointer' }}
      >
        {adding ? 'Ekleniyor...' : 'Sıradaki Masayı Ekle'}
      </button>

      {err ? (
        <div style={{ marginTop: 12, padding: 10, border: '1px solid #ffb4b4', background: '#ffecec', borderRadius: 10 }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {rows.map((r) => {
          const customerUrl = `${origin}/t/${r.table_token}`
          return (
            <div
              key={r.id}
              style={{
                border: '1px solid #ddd',
                padding: 12,
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'white',
              }}
            >
              <div style={{ fontWeight: 800 }}>Masa {r.table_number}</div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link href={`/panel/${panelToken}/tables/${r.id}`}>QR Gör</Link>
                <a href={customerUrl} target="_blank" rel="noreferrer">
                  QR Link
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}