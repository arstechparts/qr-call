'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  table_number: number
  restaurant_id: string
  table_token: string
}

export default function Page() {
  const params = useParams()
  const incoming = String(params?.table ?? '')

  const [row, setRow] = useState<TableRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)

      // table_token ile bul (biz QR'ı bununla basıyoruz)
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('table_number, restaurant_id, table_token')
        .eq('table_token', incoming)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        setRow(null)
        setLoading(false)
        return
      }

      setRow((data as TableRow) ?? null)
      setLoading(false)
    })()
  }, [incoming])

  async function send(type: 'waiter' | 'bill') {
    if (!row) return

    const { error } = await supabase.from('requests').insert({
      restaurant_id: row.restaurant_id,
      table_number: row.table_number,
      request_type: type,
      status: 'waiting',
    })

    if (error) alert(error.message)
    else alert('İstek gönderildi ✅')
  }

  if (loading) return <div style={{ padding: 18, color: 'white', background: '#070A12', minHeight: '100vh' }}>Yükleniyor...</div>

  if (!row) {
    return (
      <div style={{ padding: 18, color: 'white', background: '#070A12', minHeight: '100vh' }}>
        QR bulunamadı / geçersiz
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070A12', padding: 14, color: 'white' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ borderRadius: 18, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>CASITA PREMIUM v1</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>Masa {row.table_number}</div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <button onClick={() => send('waiter')} style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 900 }}>
            Garson Çağır
          </button>

          <button onClick={() => send('bill')} style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 900 }}>
            Hesap İste
          </button>

          <a href={`/t/${incoming}/menu`} style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 900, textDecoration: 'none', textAlign: 'center' }}>
            Menü
          </a>
        </div>
      </div>
    </div>
  )
}