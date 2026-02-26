'use client'

import { useEffect, useState } from 'react'
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
  const token = params?.table

  const [row, setRow] = useState<TableRow | null>(null)
  const [loading, setLoading] = useState(true)

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

      if (error) setRow(null)
      else setRow(data as TableRow)

      setLoading(false)
    })()
  }, [token])

  return (
    <div style={{ minHeight: '100vh', padding: 18, background: '#0b0f1a', color: 'white' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 18 }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          CASITA PREMIUM v1
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)'
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.85 }}>Casita Nişantaşı</div>

          {loading ? (
            <div style={{ marginTop: 10 }}>Yükleniyor…</div>
          ) : !row ? (
            <div style={{ marginTop: 10 }}>QR geçersiz</div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 22, fontWeight: 800 }}>
              Masa {row.table_number}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}