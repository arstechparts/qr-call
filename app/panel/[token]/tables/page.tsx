'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  table_number: number
  table_token: string
}

type RestaurantRow = {
  id: string
  name: string
}

export default function Page() {
  const params = useParams<{ token: string }>()
  const panelToken = useMemo(() => (params?.token ? String(params.token) : ''), [params])

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)

  async function loadRestaurantAndTables() {
    if (!panelToken) return

    // 1) restaurant bul
    const { data: rData, error: rErr } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('panel_token', panelToken)
      .single()

    if (rErr) {
      alert(rErr.message)
      setBooting(false)
      return
    }

    const r = rData as RestaurantRow
    setRestaurant(r)

    // 2) masaları çek
    const { data: tData, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, table_token')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (tErr) {
      alert(tErr.message)
      setBooting(false)
      return
    }

    setRows((tData as TableRow[]) || [])
    setBooting(false)
  }

  useEffect(() => {
    loadRestaurantAndTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    if (loading) return
    if (!restaurant?.id) return

    setLoading(true)

    const maxNum = rows.reduce((m, r) => Math.max(m, r.table_number), 0)
    let nextNum = maxNum + 1

    // duplicate ihtimaline karşı 5 deneme
    for (let i = 0; i < 5; i++) {
      const { error } = await supabase.from('restaurant_tables').insert({
        restaurant_id: restaurant.id,
        table_number: nextNum,
      })

      if (!error) {
        await loadRestaurantAndTables()
        setLoading(false)
        return
      }

      // duplicate unique hatası -> bir sonraki numarayı dene
      if ((error as any).code === '23505') {
        nextNum += 1
        continue
      }

      alert(error.message)
      setLoading(false)
      return
    }

    alert('Masa eklenemedi. Tekrar deneyin.')
    setLoading(false)
  }

  if (booting) {
    return <div style={{ padding: 40 }}>Yükleniyor...</div>
  }

  if (!restaurant) {
    return <div style={{ padding: 40 }}>Panel bulunamadı.</div>
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Masalar</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>{restaurant.name}</div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={addNextTable} style={{ padding: 10 }} disabled={loading}>
          {loading ? 'Ekleniyor...' : 'Sıradaki Masayı Ekle'}
        </button>
      </div>

      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid #ddd',
            padding: 12,
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>Masa {r.table_number}</div>

          <div style={{ display: 'flex', gap: 12 }}>
            <a href={`/panel/${panelToken}/tables/${r.id}`} style={{ textDecoration: 'none' }}>
              QR Gör
            </a>

            <a href={`/t/${r.table_token}`} target="_blank" style={{ textDecoration: 'none' }}>
              QR Link
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}