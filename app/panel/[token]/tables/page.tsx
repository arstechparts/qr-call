'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  is_active: boolean
}

export default function TablePage() {
  const params = useParams<{ table: string }>()
  const token = params?.table // burada "table" aslında table_token

  const [row, setRow] = useState<TableRow | null>(null)
  const [loading, setLoading] = useState(true)

  const title = useMemo(() => {
    if (loading) return 'Yükleniyor…'
    if (!row) return 'QR geçersiz'
    return `Masa ${row.table_number}`
  }, [loading, row])

  useEffect(() => {
    ;(async () => {
      if (!token) return

      setLoading(true)

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('id, restaurant_id, table_number, table_token, is_active')
        .eq('table_token', token)
        .eq('is_active', true)
        .single()

      if (error) {
        setRow(null)
      } else {
        setRow(data as TableRow)
      }

      setLoading(false)
    })()
  }, [token])

  return (
    <div style={{ padding: 28, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>{title}</h1>

      {!row ? (
        <div style={{ padding: 14, border: '1px solid #eee', borderRadius: 12 }}>
          Bu QR kod geçersiz ya da masa kapalı.
        </div>
      ) : (
        <>
          <div style={{ padding: 14, border: '1px solid #eee', borderRadius: 12, marginBottom: 16 }}>
            Restoran: <span style={{ fontFamily: 'monospace' }}>{row.restaurant_id}</span>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <button
              onClick={() => alert('Garson çağır (bir sonraki adımda requests insert)')}
              style={{ padding: 16, borderRadius: 14, cursor: 'pointer' }}
            >
              Garson Çağır
            </button>

            <button
              onClick={() => alert('Hesap iste (bir sonraki adımda requests insert)')}
              style={{ padding: 16, borderRadius: 14, cursor: 'pointer' }}
            >
              Hesap İste
            </button>
          </div>
        </>
      )}
    </div>
  )
}