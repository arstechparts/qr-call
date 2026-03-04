'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  id: string
  table_number: number
  table_token: string
}

export default function Page() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, table_token')
      .order('table_number', { ascending: true })

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
    const nextNum = maxNum + 1

    const { error } = await supabase
      .from('restaurant_tables')
      .insert({ table_number: nextNum })

    // duplicate (unique index) olduysa 1 arttırıp tekrar dene
    if (error && (error as any).code === '23505') {
      const { error: error2 } = await supabase
        .from('restaurant_tables')
        .insert({ table_number: nextNum + 1 })

      if (error2) {
        alert(error2.message)
        setLoading(false)
        return
      }
    } else if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    await load()
    setLoading(false)
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Masalar</h1>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={addNextTable}
          style={{ padding: 10 }}
          disabled={loading}
        >
          {loading ? 'Ekleniyor...' : 'Sıradaki Masayı Ekle'}
        </button>
      </div>

      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid #ddd',
            padding: 10,
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>Masa {r.table_number}</div>

          <div>
            <a href={`/panel/tables/${r.id}`} style={{ marginRight: 10 }}>
              QR Gör
            </a>

            <a href={`/t/${r.table_token}`} target="_blank">
              QR Link
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}