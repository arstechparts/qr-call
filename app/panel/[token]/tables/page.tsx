'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = { id: string; name: string | null }
type TableRow = {
  id: string
  table_number: number
  table_token: string | null
  token: string | null
  is_active: boolean | null
}

export default function TablesPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string>('')

  const appUrl = useMemo(() => process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app', [])

  async function loadAll() {
    setLoading(true)
    setErr('')

    // 1) restaurant bul
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,name')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr) {
      setRestaurant(null)
      setRows([])
      setErr(rErr.message)
      setLoading(false)
      return
    }

    if (!r) {
      setRestaurant(null)
      setRows([])
      setErr('Panel bulunamadı (restaurant yok).')
      setLoading(false)
      return
    }

    setRestaurant(r)

    // 2) masalar
    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id,table_number,table_token,token,is_active')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (tErr) {
      setRows([])
      setErr(tErr.message)
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

    // Güvenli: hem uuid hem text doldur
    const uuid = crypto.randomUUID()
    const tokenText = uuid.replaceAll('-', '')

    const { error } = await supabase.from('restaurant_tables').insert({
      restaurant_id: restaurant.id,
      table_number: nextNum,
      table_token: uuid,   // uuid
      token: tokenText,    // text
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

  function customerUrl(r: TableRow) {
    const t = (r.table_token || r.token || '').toString()
    return `${appUrl}/t/${t}`
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Masalar</h1>
          <div style={{ opacity: 0.7, marginTop: 4 }}>{restaurant?.name ?? ''}</div>
        </div>

        <button onClick={addNext} disabled={!restaurant || adding} style={{ padding: '10px 14px', cursor: 'pointer' }}>
          {adding ? 'Ekleniyor…' : 'Sıradaki Masayı Ekle'}
        </button>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #ffb4b4', background: '#ffecec', borderRadius: 10 }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 14 }}>Yükleniyor…</div>
      ) : rows.length === 0 ? (
        <div style={{ marginTop: 14, opacity: 0.7 }}>Henüz masa yok.</div>
      ) : (
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                border: '1px solid #e5e5e5',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                background: '#fff',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>Masa {r.table_number}</div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href={`/panel/${panelToken}/tables/${r.id}`} style={{ textDecoration: 'none' }}>
                  QR Gör
                </Link>

                <a href={customerUrl(r)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  QR Link
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}