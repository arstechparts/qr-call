'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  table_number: number
  restaurant_id: string | null
}

export default function Page({ params }: { params: { table: string } }) {
  const incoming = params.table

  const [row, setRow] = useState<TableRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)

      // table_token (uuid) veya token (text) ikisini de kabul et
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('table_number, restaurant_id')
        .or(`table_token.eq.${incoming},token.eq.${incoming}`)
        .maybeSingle()

      if (error || !data) {
        setRow(null)
      } else {
        setRow(data as TableRow)
      }

      setLoading(false)
    })()
  }, [incoming])

  async function send(type: 'waiter' | 'bill') {
    if (!row?.restaurant_id) return alert('restaurant_id yok')

    const { error } = await supabase.from('requests').insert({
      restaurant_id: row.restaurant_id,
      table_number: row.table_number,
      request_type: type,
      status: 'waiting',
    })

    if (error) alert(error.message)
    else alert('Gönderildi ✅')
  }

  if (loading) return <div style={{ padding: 16 }}>Yükleniyor...</div>

  if (!row) return <div style={{ padding: 16 }}>QR geçersiz / bulunamadı</div>

  return (
    <div style={{ padding: 16 }}>
      <h1>Masa {row.table_number}</h1>

      <button onClick={() => send('waiter')} style={{ padding: 12, marginRight: 10 }}>
        Garson Çağır
      </button>

      <button onClick={() => send('bill')} style={{ padding: 12 }}>
        Hesap İste
      </button>
    </div>
  )
}