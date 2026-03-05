'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'react-qr-code'
import QR from 'qrcode'

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  is_active: boolean
}

export default function TableQrPage({ params }: { params: { id: string } }) {
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [row, setRow] = useState<TableRow | null>(null)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app'

  const wrapStyle = useMemo(
    () => ({
      minHeight: '100vh',
      padding: 16,
      background:
        'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
        'linear-gradient(180deg, #0b1220 0%, #0a0f1a 100%)',
      color: '#fff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    }),
    []
  )

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    padding: 16,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setErr(null)
      setRow(null)

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('id, restaurant_id, table_number, table_token, is_active')
        .eq('id', id)
        .limit(1)
        .maybeSingle()

      if (!alive) return

      if (error || !data) {
        setErr(error?.message || 'Masa bulunamadı')
        setLoading(false)
        return
      }

      setRow(data as TableRow)
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [id])

  async function downloadPng() {
    if (!row) return
    const url = `${baseUrl}/t/${row.table_token}`

    try {
      const pngDataUrl = await QR.toDataURL(url, { width: 512, margin: 2 })
      const a = document.createElement('a')
      a.href = pngDataUrl
      a.download = `masa-${row.table_number}.png`
      a.click()
    } catch (e: any) {
      alert(e?.message || 'QR indirilemedi')
    }
  }

  if (loading) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>Yükleniyor…</div>
      </div>
    )
  }

  if (err || !row) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Hata</div>
          <div style={{ marginTop: 10, opacity: 0.85 }}>{err || 'Bilinmeyen hata'}</div>
        </div>
      </div>
    )
  }

  const customerUrl = `${baseUrl}/t/${row.table_token}`

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Masa {row.table_number} QR</div>

        <div style={{ marginTop: 14, background: '#fff', padding: 14, borderRadius: 14 }}>
          <QRCode value={customerUrl} size={320} />
        </div>

        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8, wordBreak: 'break-all' }}>
          {customerUrl}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => window.open(customerUrl, '_blank')}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.10)',
              color: '#fff',
              fontWeight: 900,
            }}
          >
            Müşteri Sayfası
          </button>

          <button
            onClick={downloadPng}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.10)',
              color: '#fff',
              fontWeight: 900,
            }}
          >
            QR İndir (PNG)
          </button>
        </div>
      </div>
    </div>
  )
}