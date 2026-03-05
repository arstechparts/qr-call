'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  restaurant_id: string | null
  table_number: number
  table_token: string | null
  token: string | null
}

export default function Page() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const appUrl = useMemo(
    () => process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app',
    []
  )

  async function load() {
    setLoading(true)

    // DEMO: tablodan restaurant_id otomatik çek
    const { data: first } = await supabase
      .from('restaurant_tables')
      .select('restaurant_id')
      .not('restaurant_id', 'is', null)
      .limit(1)
      .maybeSingle()

    const rid = (first?.restaurant_id as string) || null
    setRestaurantId(rid)

    const q = await supabase
      .from('restaurant_tables')
      .select('id,restaurant_id,table_number,table_token,token')
      .order('table_number', { ascending: true })

    setRows((q.data ?? []) as TableRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addNext() {
    if (!restaurantId) return alert('restaurant_id bulunamadı')
    if (adding) return

    setAdding(true)

    const maxNum = rows.reduce((m, r) => Math.max(m, r.table_number), 0)
    const nextNum = maxNum + 1

    const uuid = crypto.randomUUID()
    const tokenText = uuid.replaceAll('-', '')

    const { error } = await supabase.from('restaurant_tables').insert({
      restaurant_id: restaurantId,
      table_number: nextNum,
      table_token: uuid,
      token: tokenText,
      is_active: true,
    })

    if (error) alert(error.message)

    await load()
    setAdding(false)
  }

  function customerUrl(r: TableRow) {
    const t = (r.table_token || r.token || '').toString()
    return `${appUrl}/t/${t}`
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Masalar</h1>

      <button onClick={addNext} disabled={adding} style={{ padding: 12 }}>
        {adding ? 'Ekleniyor...' : 'Sıradaki Masayı Ekle'}
      </button>

      {loading ? (
        <div style={{ marginTop: 12 }}>Yükleniyor...</div>
      ) : (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 12 }}>
              <b>Masa {r.table_number}</b>

              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <Link href={`/panel/tables/${r.id}`}>QR Gör</Link>
                <a href={customerUrl(r)} target="_blank" rel="noreferrer">
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