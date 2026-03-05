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
  const tableToken = (incoming || '').trim()

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
        .eq('table_token', tableToken as any) // uuid cast sorunu yaşamamak için
        .limit(1)
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
  }, [tableToken])

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
        <div style={{ width: '100%', maxWidth: 520, color: '#fff', opacity: 0.9 }}>
          <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Premium</div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>Yükleniyor...</div>
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
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Premium</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1 }}>QR geçersiz</div>
            <div style={{ marginTop: 10, fontSize: 18, opacity: 0.85 }}>
              Bu QR kapalı ya da bulunamadı.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: 28,
    padding: 18,
    color: '#fff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  }

  const actionCardStyle: React.CSSProperties = { ...cardStyle, padding: 22 }

  const imgWrapStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    background: 'transparent',
  }

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: 260,
    objectFit: 'cover',
    display: 'block',
  }

  const titleStyle: React.CSSProperties = {
    marginTop: 14,
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: -0.6,
    textAlign: 'center',
  }

  const subtitleStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 18,
    opacity: 0.8,
    textAlign: 'center',
  }

  const buttonLikeStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    textAlign: 'left',
    color: 'inherit',
  }

  return (
    <div style={bgStyle}>
      <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 16 }}>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 6 }}>Premium</div>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1 }}>
            Masa {row.table_number}
          </div>
        </div>

        <button style={buttonLikeStyle} onClick={() => sendRequest('waiter')} disabled={sending !== null}>
          <div style={actionCardStyle}>
            <div style={imgWrapStyle}>
              <img src="/waiter-v2.png" alt="Garson" style={imgStyle} />
            </div>
            <div style={titleStyle}>Garson Çağır</div>
            <div style={subtitleStyle}>
              {sending === 'waiter' ? 'Gönderiliyor…' : 'Lütfen butona tıklayınız'}
            </div>
          </div>
        </button>

        <button style={buttonLikeStyle} onClick={() => sendRequest('bill')} disabled={sending !== null}>
          <div style={actionCardStyle}>
            <div style={imgWrapStyle}>
              <img src="/bill.png" alt="Hesap" style={imgStyle} />
            </div>
            <div style={titleStyle}>Hesap İste</div>
            <div style={subtitleStyle}>
              {sending === 'bill' ? 'Gönderiliyor…' : 'Lütfen butona tıklayınız'}
            </div>
          </div>
        </button>

        <a href={`/t/${tableToken}/menu`} style={{ textDecoration: 'none' }}>
          <div style={actionCardStyle}>
            <div style={imgWrapStyle}>
              <img src="/menu.png" alt="Menü" style={imgStyle} />
            </div>
            <div style={titleStyle}>Menü</div>
          </div>
        </a>
      </div>
    </div>
  )
}