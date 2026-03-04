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

      // token ile dene
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

      // table_token ile dene (UUID)
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
      <div style={{ minHeight: '100vh', background: '#070A12', color: 'white', padding: 18 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 18 }}>
          <div style={{ borderRadius: 18, padding: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Premium</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>Yükleniyor…</div>
          </div>
        </div>
      </div>
    )
  }

  if (!table) {
    return (
      <div style={{ minHeight: '100vh', background: '#070A12', color: 'white', padding: 18 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 18 }}>
          <div style={{ borderRadius: 18, padding: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Premium</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>QR geçersiz</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>Bu QR kapalı ya da bulunamadı.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070A12', color: 'white', padding: 18 }}>
      <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 18 }}>
        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)'
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.85 }}>Premium</div>

          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
            Masa {table.table_number}
          </div>

          <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            <button
              onClick={() => send('waiter')}
              style={{
                padding: 16,
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <img src="/waiter-v2.png" alt="Garson" style={{ width: 28, height: 28 }} />
              Garson Çağır
            </button>

            <button
              onClick={() => send('bill')}
              style={{
                padding: 16,
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <img src="/bill.png" alt="Hesap" style={{ width: 28, height: 28 }} />
              Hesap İste
            </button>

            <a
              href={`/t/${incoming}/menu`}
              style={{
                padding: 16,
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 800,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              Menüyü Gör
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}