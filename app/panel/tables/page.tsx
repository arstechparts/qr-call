'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  id: string
  table_number: number
  table_token: string
}

const RESTAURANT_ID = 'demo' // şimdilik demo. sonra token’dan gerçek restaurant_id çözeceğiz.

export default function Page() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, table_token')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('table_number', { ascending: true })

    if (error) {
      alert(error.message)
      return
    }

    setRows((data as Row[]) || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function addNextTable() {
    if (loading) return
    setLoading(true)

    // en büyük masa numarasını bul
    const maxNum = rows.reduce((m, r) => Math.max(m, r.table_number), 0)
    let nextNum = maxNum + 1

    // 2 kere deneme (olası duplicate için)
    for (let i = 0; i < 2; i++) {
      const { error } = await supabase.from('restaurant_tables').insert({
        restaurant_id: RESTAURANT_ID,
        table_number: nextNum,
      })

      if (!error) {
        await load()
        setLoading(false)
        return
      }

      // duplicate ise bir sonraki numarayı dene
      if ((error as any).code === '23505') {
        nextNum += 1
        continue
      }

      alert(error.message)
      setLoading(false)
      return
    }

    alert('Masa eklenemedi (duplicate). Tekrar deneyin.')
    setLoading(false)
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Masalar</h1>

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
            <a href={`/panel/tables/${r.id}`} style={{ textDecoration: 'none' }}>
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