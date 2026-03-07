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

type RestaurantRow = {
  id: string
  name: string
  instagram_url: string | null
  is_active?: boolean | null
}

export default function TableClient({ tableToken }: { tableToken: string }) {
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [row, setRow] = useState<TableRow | null>(null)
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [sending, setSending] = useState<'waiter' | 'bill' | null>(null)

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

      if (!isUuid(tableToken)) {
        setInvalid(true)
        setRow(null)
        setRestaurant(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, restaurant_id, table_token, is_active')
        .eq('table_token', tableToken)
        .limit(1)
        .maybeSingle()

      if (!alive) return

      if (error || !data || data.is_active === false) {
        setInvalid(true)
        setRow(null)
        setRestaurant(null)
        setLoading(false)
        return
      }

      setRow(data as TableRow)

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('id, name, instagram_url, is_active')
        .eq('id', data.restaurant_id)
        .limit(1)
        .maybeSingle()

      if (!alive) return

      if (restaurantData) {
        setRestaurant(restaurantData as RestaurantRow)
      } else {
        setRestaurant({
          id: data.restaurant_id,
          name: 'Casita',
          instagram_url:
            'https://www.instagram.com/casitarestaurants?igsh=ZHc2emt2bjRnd2F4',
          is_active: true,
        })
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

  if (loading) {
    return (
      <div style={bgStyle}>
        <div style={{ width: '100%', maxWidth: 760, color: '#fff', opacity: 0.92 }}>
          <div
            style={{
              fontSize: 16,
              opacity: 0.8,
              marginBottom: 8,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {restaurant?.name || 'Yükleniyor...'}
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>Yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (invalid || !row) {
    return (
      <div style={bgStyle}>
        <div style={{ width: '100%', maxWidth: 760 }}>
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
            <div
              style={{
                fontSize: 16,
                opacity: 0.8,
                marginBottom: 8,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
            >
              {restaurant?.name || 'Restoran'}
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>QR geçersiz</div>
            <div style={{ marginTop: 10, fontSize: 18, opacity: 0.85 }}>
              Bu QR kapalı ya da bulunamadı.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const restaurantName = restaurant?.name || 'Restoran'
  const instagramUrl = restaurant?.instagram_url || '#'

  const shellStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 760,
    display: 'grid',
    gap: 10,
    alignContent: 'start',
  }

  const glassStyle: React.CSSProperties = {
    borderRadius: 28,
    color: '#fff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(6px)',
  }

  const topBarStyle: React.CSSProperties = {
    ...glassStyle,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  }

  const buttonLikeStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    textAlign: 'left',
    color: 'inherit',
  }

  const horizontalCardStyle: React.CSSProperties = {
    ...glassStyle,
    padding: 12,
    overflow: 'hidden',
  }

  const cardRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '38% 1fr',
    alignItems: 'stretch',
    gap: 12,
  }

  const imageBoxStyle: React.CSSProperties = {
    width: '100%',
    height: 152,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 0,
    background: 'transparent',
  }

  const textColCenterStyle: React.CSSProperties = {
    minHeight: 152,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '8px 6px',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 31,
    fontWeight: 700,
    letterSpacing: 0.2,
    lineHeight: 1.05,
    textAlign: 'center',
    fontFamily: 'Georgia, "Times New Roman", serif',
    textShadow: '0 2px 10px rgba(0,0,0,0.25)',
  }

  const footerStyle: React.CSSProperties = {
    ...glassStyle,
    padding: '14px 16px',
    textAlign: 'center',
    fontSize: 15,
    opacity: 0.95,
  }

  return (
    <div style={bgStyle}>
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: -0.4,
              whiteSpace: 'nowrap',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {restaurantName}
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: -0.4,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              flex: 1,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            Masa {row.table_number}
          </div>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              textDecoration: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              padding: '10px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.12)',
              whiteSpace: 'nowrap',
              pointerEvents: instagramUrl === '#' ? 'none' : 'auto',
              opacity: instagramUrl === '#' ? 0.5 : 1,
            }}
          >
            {restaurantName} Instagram
          </a>
        </div>

        <a href={`/t/${row.table_token}/menu`} style={{ textDecoration: 'none' }}>
          <div style={horizontalCardStyle}>
            <div style={cardRowStyle}>
              <div style={imageBoxStyle}>
                <img
                  src="/menu.png"
                  alt="Menü"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center center',
                    display: 'block',
                  }}
                />
              </div>

              <div style={textColCenterStyle}>
                <div style={titleStyle}>Menü</div>
              </div>
            </div>
          </div>
        </a>

        <button
          style={buttonLikeStyle}
          onClick={() => sendRequest('waiter')}
          disabled={sending !== null}
        >
          <div style={horizontalCardStyle}>
            <div style={cardRowStyle}>
              <div style={imageBoxStyle}>
                <img
                  src="/waiter-v2.png"
                  alt="Garson"
                  style={{
                    width: '118%',
                    height: '118%',
                    objectFit: 'cover',
                    objectPosition: 'center 30%',
                    display: 'block',
                    marginLeft: '-9%',
                    marginTop: '-6%',
                  }}
                />
              </div>

              <div style={textColCenterStyle}>
                <div style={titleStyle}>Garson Çağır</div>
              </div>
            </div>
          </div>
        </button>

        <button
          style={buttonLikeStyle}
          onClick={() => sendRequest('bill')}
          disabled={sending !== null}
        >
          <div style={horizontalCardStyle}>
            <div style={cardRowStyle}>
              <div style={imageBoxStyle}>
                <img
                  src="/bill.png"
                  alt="Hesap"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center center',
                    display: 'block',
                  }}
                />
              </div>

              <div style={textColCenterStyle}>
                <div style={titleStyle}>Hesap İste</div>
              </div>
            </div>
          </div>
        </button>

        <div style={footerStyle}>
          Founder <b>Berk ARSLAN</b>
        </div>
      </div>
    </div>
  )
}