'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  id: string
  restaurant_id: string
  table_number: number
  token: string | null
  table_token: string | null
  created_at: string
}

const RESTAURANT_ID = '32c79585-1936-49d2-b3de-3edcee16d40e'

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])

  const nextTableNumber = useMemo(() => {
    const used = new Set(rows.map((r) => r.table_number))
    let n = 1
    while (used.has(n)) n++
    return n
  }, [rows])

  async function loadTables() {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('table_number', { ascending: true })

    if (error) {
      alert(error.message)
      return
    }
    setRows((data ?? []) as Row[])
  }

  useEffect(() => {
    loadTables()
  }, [])

  async function createTable() {
    setLoading(true)

    const tableNo = nextTableNumber
    const uuid = crypto.randomUUID()
    const tokenText = uuid.replaceAll('-', '')

    const { error } = await supabase.from('restaurant_tables').insert([
      {
        restaurant_id: RESTAURANT_ID,
        table_number: tableNo,
        table_token: uuid,
        token: tokenText,
        is_active: true
      }
    ])

    if (error) {
      alert(error.message)
    } else {
      await loadTables()
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Masalar</h1>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <input
          type="number"
          value={nextTableNumber}
          disabled
          style={{ padding: 10, width: 120, opacity: 0.7 }}
        />
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

              <Link
                href={`/panel/tables/${r.id}`}
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