'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  table_number: number
  restaurant_id: string
}

export default function Page() {
  const params = useParams()
  const incoming = (params?.table as string) || ''

  const [table, setTable] = useState<TableRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)

      // 1) Önce TEXT token ile dene
      const a = await supabase
        .from('restaurant_tables')
        .select('table_number, restaurant_id')
        .eq('token', incoming)
        .eq('is_active', true)
        .maybeSingle()

      if (a.data) {
        setTable(a.data as TableRow)
        setLoading(false)
        return
      }

      // 2) Olmazsa UUID table_token ile dene
      const b = await supabase
        .from('restaurant_tables')
        .select('table_number, restaurant_id')
        .eq('table_token', incoming)
        .eq('is_active', true)
        .maybeSingle()

      if (b.data) setTable(b.data as TableRow)
      else setTable(null)

      setLoading(false)
    })()
  }, [incoming])

  async function send(type: 'waiter' | 'bill') {
    if (!table) return

    const { error } = await supabase.from('requests').insert({
      restaurant_id: table.restaurant_id,
      table_number: table.table_number,
      request_type: type,
      status: 'waiting'
    })

    if (error) alert(error.message)
    else alert('İstek gönderildi ✅')
  }

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <b>Premium v2</b>
        <div>Yükleniyor…</div>
      </div>
    )
  }

  if (!table) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <b>Premium v2</b>
        <div>QR geçersiz</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Param: {incoming}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <b>Premium v2</b>
      <h1>Masa {table.table_number}</h1>

      <div style={{ display: 'grid', gap: 20, marginTop: 30 }}>
        <button onClick={() => send('waiter')} style={{ padding: 20, fontSize: 18 }}>
          Garson Çağır
        </button>

        <button onClick={() => send('bill')} style={{ padding: 20, fontSize: 18 }}>
          Hesap İste
        </button>
      </div>
    </div>
  )
}