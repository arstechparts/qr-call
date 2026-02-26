'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string
  panel_token: string
}

type Row = {
  id: string
  restaurant_id: string
  table_number: number
  token: string | null
  table_token: string | null
  created_at: string
}

export default function Page() {
  const params = useParams<{ token: string }>()
  const panelToken = params?.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  const nextTableNumber = useMemo(() => {
    const used = new Set(rows.map((r) => r.table_number))
    let n = 1
    while (used.has(n)) n++
    return n
  }, [rows])

  async function loadRestaurant() {
    if (!panelToken) return null

    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, panel_token')
      .eq('panel_token', panelToken)
      .single()

    if (error) {
      alert(error.message)
      return null
    }

    return data as Restaurant
  }

  async function loadTables(restaurantId: string) {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true })

    if (error) alert(error.message)
    else setRows((data ?? []) as Row[])
  }

  useEffect(() => {
    ;(async () => {
      const r = await loadRestaurant()
      if (!r) return
      setRestaurant(r)
      await loadTables(r.id)
    })()
  }, [panelToken])

  async function createTable() {
    if (!restaurant) return
    setLoading(true)

    const tableNo = nextTableNumber
    const uuid = crypto.randomUUID()
    const tokenText = uuid.replaceAll('-', '')

    const { error } = await supabase.from('restaurant_tables').insert([
      {
        restaurant_id: restaurant.id,
        table_number: tableNo,
        table_token: uuid,
        token: tokenText,
        is_active: true
      }
    ])

    if (error) alert(error.message)
    else await loadTables(restaurant.id)

    setLoading(false)
  }

  if (!restaurant) return <div style={{ padding: 40 }}>Yükleniyor…</div>

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{restaurant.name} · Masalar</h1>
        <Link href={`/panel/${panelToken}`}>← Panel</Link>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
        <input type="number" value={nextTableNumber} disabled style={{ padding: 10, width: 120, opacity: 0.7 }} />
        <button onClick={createTable} disabled={loading}>
          {loading ? 'Ekleniyor...' : `Masa ${nextTableNumber} Ekle`}
        </button>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        {rows.length === 0 ? (
          <div>Henüz masa yok.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                gap: 14,
                padding: '10px 6px',
                borderBottom: '1px solid #eee'
              }}
            >
              <div>
                <b>Masa {r.table_number}</b>
              </div>

              {/* Şimdilik QR sayfası yoksa bu linki kaldırabiliriz */}
              <Link
                href={`/panel/${panelToken}/tables/${r.id}`}
                style={{
                  padding: '8px 10px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  textDecoration: 'none'
                }}
              >
                QR Gör
              </Link>

              <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.7 }}>
                {r.table_token ?? r.token}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}