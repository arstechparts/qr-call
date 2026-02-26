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
  const token = params?.table

  const [row, setRow] = useState<TableRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<null | 'waiter' | 'bill'>(null)

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

      if (error) setRow(null)
      else setRow(data as TableRow)

      setLoading(false)
    })()
  }, [token])

  async function sendRequest(type: 'waiter' | 'bill') {
    if (!row) return
    setSending(type)

    const { error } = await supabase.from('requests').insert([
      {
        restaurant_id: row.restaurant_id,
        table_number: row.table_number,
        request_type: type,
        status: 'waiting'
      }
    ])

    if (error) {
      alert(error.message)
    } else {
      alert('Gönderildi ✅')
    }

    setSending(null)
  }

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
            Masa: <b>{row.table_number}</b>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <button
              onClick={() => sendRequest('waiter')}
              disabled={sending !== null}
              style={{ padding: 16, borderRadius: 14, cursor: 'pointer' }}
            >
              {sending === 'waiter' ? 'Gönderiliyor…' : 'Garson Çağır'}
            </button>

            <button
              onClick={() => sendRequest('bill')}
              disabled={sending !== null}
              style={{ padding: 16, borderRadius: 14, cursor: 'pointer' }}
            >
              {sending === 'bill' ? 'Gönderiliyor…' : 'Hesap İste'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}