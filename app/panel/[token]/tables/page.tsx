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
  created_at: string
}

export default function TablesPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [loading, setLoading] = useState(true)
  const [busyAdd, setBusyAdd] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<TableRow[]>([])

  const baseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    )
  }, [])

  async function loadAll() {
    setLoading(true)
    setErr(null)

    // 1) restaurant by panel_token
    const r = await supabase
      .from('restaurants')
      .select('id, name, panel_token')
      .eq('panel_token', panelToken)
      .limit(1)
      .maybeSingle()

    if (r.error || !r.data) {
      setRestaurant(null)
      setRows([])
      setErr('Panel bulunamadı (restaurant yok).')
      setLoading(false)
      return
    }

    setRestaurant(r.data as Restaurant)

    // 2) tables by restaurant_id
    const t = await supabase
      .from('restaurant_tables')
      .select('id, restaurant_id, table_number, table_token, is_active, created_at')
      .eq('restaurant_id', r.data.id)
      .order('table_number', { ascending: true })

    if (t.error) {
      setErr(t.error.message)
      setRows([])
    } else {
      setRows((t.data as TableRow[]) || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    if (!restaurant) return
    setBusyAdd(true)
    setErr(null)

    const maxNum = rows.reduce((m, x) => Math.max(m, x.table_number), 0)
    const nextNum = maxNum + 1

    const ins = await supabase.from('restaurant_tables').insert({
      restaurant_id: restaurant.id,
      table_number: nextNum,
      is_active: true,
      // table_token DB default üretiyorsa boş bırak
    })

    setBusyAdd(false)

    if (ins.error) {
      setErr(ins.error.message)
      return
    }

    await loadAll()
  }

  if (loading) return <div style={{ padding: 16 }}>Yükleniyor…</div>

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Masalar</div>
          <div style={{ opacity: 0.7 }}>
            {restaurant ? restaurant.name : '(bulunamadı)'}
          </div>
        </div>

        <button
          onClick={addNextTable}
          disabled={!restaurant || busyAdd}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd' }}
        >
          {busyAdd ? 'Ekleniyor…' : 'Sıradaki Masayı Ekle'}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <Link href={`/panel/${panelToken}`} style={{ marginRight: 12 }}>
          Panele dön
        </Link>
        <Link href={`/panel/${panelToken}/requests`}>İstekler</Link>
      </div>

      {err && (
        <div style={{ marginTop: 14, padding: 12, border: '1px solid #f3b3b3', background: '#ffecec', borderRadius: 10, color: '#8a1f1f' }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Henüz masa yok.</div>
        ) : (
          rows.map((r) => {
            const customerUrl = `${baseUrl}/t/${r.table_token}`
            return (
              <div key={r.id} style={{ padding: 14, border: '1px solid #ddd', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Masa {r.table_number}</div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Link href={`/panel/${panelToken}/tables/${r.id}`} style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 10 }}>
                    QR Gör
                  </Link>

                  <a href={customerUrl} target="_blank" rel="noreferrer" style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 10 }}>
                    QR Link
                  </a>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}