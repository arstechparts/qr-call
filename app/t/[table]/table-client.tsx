'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  table_number: number
  restaurant_id: string
  table_token: string
  is_active: boolean
}

export default function TableClient({ incoming }: { incoming: string }) {
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [row, setRow] = useState<TableRow | null>(null)
  const [sending, setSending] = useState<'waiter' | 'bill' | null>(null)

  const bgStyle = useMemo(
    () => ({
      minHeight: '100vh',
      padding: 16,
      background:
        'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
        'linear-gradient(180deg, #0b1220 0%, #0a0f1a 100%)',
      display: 'flex',
      justifyContent: 'center',
    }),
    []
  )

  useEffect(() => {
    let alive = true

    ;(async () => {
      setLoading(true)
      setInvalid(false)

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, restaurant_id, table_token, is_active')
        .eq('table_token', incoming)
        .maybeSingle()

      if (!alive) return

      if (error || !data || data.is_active === false) {
        setInvalid(true)
        setRow(null)
      } else {
        setRow(data as TableRow)
      }

      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [incoming])

  async function sendRequest(type: 'waiter' | 'bill') {
    if (!row) return

    setSending(type)

    const { error } = await supabase.from('requests').insert({
      restaurant_id: row.restaurant_id,
      table_number: row.table_number,
      table_token: row.table_token,
      request_type: type,
      status: 'waiting',
    })

    setSending(null)

    if (error) {
      alert(error.message)
      return
    }

    alert('Gönderildi ✅')
  }

  if (loading) {
    return (
      <div style={bgStyle}>
        <div style={{ width: '100%', maxWidth: 520, color: '#fff' }}>
          <div style={{ fontSize: 40, fontWeight: 800 }}>Yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (invalid || !row) {
    return (
      <div style={bgStyle}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div
            style={{
              borderRadius: 24,
              padding: 22,
              color: '#fff',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 900 }}>QR geçersiz</div>
          </div>
        </div>
      </div>
    )
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: 28,
    padding: 22,
    color: '#fff',
    background: 'rgba(255,255,255,0.06)',
  }

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: 260,
    objectFit: 'cover',
  }

  const titleStyle: React.CSSProperties = {
    marginTop: 12,
    fontSize: 34,
    fontWeight: 900,
    textAlign: 'center',
  }

  return (
    <div style={bgStyle}>
      <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 40, fontWeight: 900 }}>
            Masa {row.table_number}
          </div>
        </div>

        <button onClick={() => sendRequest('waiter')}>
          <div style={cardStyle}>
            <img src="/waiter-v2.png" style={imgStyle} />
            <div style={titleStyle}>Garson Çağır</div>
          </div>
        </button>

        <button onClick={() => sendRequest('bill')}>
          <div style={cardStyle}>
            <img src="/bill.png" style={imgStyle} />
            <div style={titleStyle}>Hesap İste</div>
          </div>
        </button>

        <a href={`/t/${incoming}/menu`}>
          <div style={cardStyle}>
            <img src="/menu.png" style={imgStyle} />
            <div style={titleStyle}>Menü</div>
          </div>
        </a>
      </div>
    </div>
  )
}