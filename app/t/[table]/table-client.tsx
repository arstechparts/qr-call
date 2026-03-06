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

  const instagramUrl =
    'https://www.instagram.com/casitarestaurants?igsh=ZHc2emt2bjRnd2F4'

  const bgStyle = useMemo<React.CSSProperties>(
    () => ({
      minHeight: '100svh',
      padding: 10,
      background:
        'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
        'linear-gradient(180deg, #0b1220 0%, #0a0f1a 100%)',
      display: 'flex',
      justifyContent: 'center',
      overflowX: 'hidden',
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }),
    []
  )

  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setInvalid(false)

      if (!isUuid(incoming)) {
        setInvalid(true)
        setRow(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, restaurant_id, table_token, is_active')
        .eq('table_token', incoming)
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
  }, [incoming])

  async function sendRequest(type: 'waiter' | 'bill') {
    if (!row) return
    setSending(type)

    const { error } = await supabase.rpc('create_request_once', {
      p_table_token: row.table_token,
      p_request_type: type,
    })

    setSending(null)

    if (error) {
      alert(error.message)
      return
    }

    alert('Gönderildi ✅')
  }

  const shellStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 760,
    display: 'grid',
    gap: 12,
  }

  const glassStyle: React.CSSProperties = {
    borderRadius: 28,
    color: '#fff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(6px)',
  }

  const horizontalCardStyle: React.CSSProperties = {
    ...glassStyle,
    padding: 12,
  }

  const cardRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: 14,
    alignItems: 'center',
  }

  const imageBoxStyle: React.CSSProperties = {
    width: 160,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: -1,
    textAlign: 'center',
  }

  return (
    <div style={bgStyle}>
      <div style={shellStyle}>
        {/* TOP BAR */}
        <div
          style={{
            ...glassStyle,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700 }}>Casita</div>

          <div style={{ fontSize: 24, fontWeight: 900 }}>
            Masa {row?.table_number}
          </div>

          <a
            href={instagramUrl}
            target="_blank"
            style={{
              textDecoration: 'none',
              color: '#fff',
              fontSize: 14,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.10)',
            }}
          >
            Casita Instagram
          </a>
        </div>

        {/* MENU */}
        <a href={`/t/${row?.table_token}/menu`} style={{ textDecoration: 'none' }}>
          <div style={horizontalCardStyle}>
            <div style={cardRowStyle}>
              <div style={imageBoxStyle}>
                <img
                  src="/menu.png"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              <div style={titleStyle}>Menü Gör</div>
            </div>
          </div>
        </a>

        {/* WAITER */}
        <button
          style={{ background: 'none', border: 'none', padding: 0 }}
          onClick={() => sendRequest('waiter')}
        >
          <div style={horizontalCardStyle}>
            <div style={cardRowStyle}>
              <div style={imageBoxStyle}>
                <img
                  src="/waiter-v2.png"
                  style={{
                    width: '140%',
                    height: '140%',
                    objectFit: 'cover',
                    objectPosition: 'center 35%',
                    transform: 'translate(-15%, -10%)',
                  }}
                />
              </div>

              <div style={titleStyle}>Garson Çağır</div>
            </div>
          </div>
        </button>

        {/* BILL */}
        <button
          style={{ background: 'none', border: 'none', padding: 0 }}
          onClick={() => sendRequest('bill')}
        >
          <div style={horizontalCardStyle}>
            <div style={cardRowStyle}>
              <div style={imageBoxStyle}>
                <img
                  src="/bill.png"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              <div style={titleStyle}>Hesap İste</div>
            </div>
          </div>
        </button>

        {/* FOOTER */}
        <div
          style={{
            ...glassStyle,
            padding: 12,
            textAlign: 'center',
          }}
        >
          Founder <b>Berk ARSLAN</b>
        </div>
      </div>
    </div>
  )
}