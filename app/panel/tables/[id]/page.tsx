'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'react-qr-code'
import QR from 'qrcode'

type Row = {
  id: string
  restaurant_id: string
  table_number: number
  token: string | null
  table_token: string | null
  is_active: boolean
}

export default function Page() {
  const params = useParams<{ token: string; id: string }>()
  const panelToken = params?.token
  const id = params?.id

  const [row, setRow] = useState<Row | null>(null)

  const baseUrl = useMemo(() => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
    return typeof window !== 'undefined' ? window.location.origin : ''
  }, [])

  const qrUrl = useMemo(() => {
    if (!row) return ''
    const t = row.table_token ?? row.token
    return `${baseUrl}/t/${t}`
  }, [row, baseUrl])

  useEffect(() => {
    ;(async () => {
      if (!id) return
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('id, restaurant_id, table_number, token, table_token, is_active')
        .eq('id', id)
        .single()

      if (error) alert(error.message)
      else setRow(data as Row)
    })()
  }, [id])

  async function downloadPng() {
    if (!row) return
    const dataUrl = await QR.toDataURL(qrUrl, { margin: 2, width: 1024 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `masa-${row.table_number}-qr.png`
    a.click()
  }

  if (!row) return <div style={{ padding: 40 }}>Yükleniyor…</div>

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Masa {row.table_number} QR</h1>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href={`/panel/${panelToken}/tables`} style={{ textDecoration: 'none' }}>
            ← Masalar
          </Link>
          <button onClick={() => window.print()} style={{ padding: '10px 12px', cursor: 'pointer' }}>
            Yazdır
          </button>
          <button onClick={downloadPng} style={{ padding: '10px 12px', cursor: 'pointer' }}>
            PNG İndir
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'grid', placeItems: 'center' }}>
        <div style={{ background: 'white', padding: 18, borderRadius: 12, border: '1px solid #eee' }}>
          <QRCode value={qrUrl} size={320} />
        </div>

        <div style={{ marginTop: 14, fontFamily: 'monospace', fontSize: 12, opacity: 0.8 }}>
          {qrUrl}
        </div>
      </div>
    </div>
  )
}