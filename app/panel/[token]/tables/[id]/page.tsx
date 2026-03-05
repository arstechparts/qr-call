'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'react-qr-code'

type Row = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string | null
  token: string | null
}

export default function QrPage({ params }: { params: { token: string; id: string } }) {
  const panelToken = params.token
  const id = params.id

  const [row, setRow] = useState<Row | null>(null)

  const appUrl = useMemo(() => process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app', [])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('id,restaurant_id,table_number,table_token,token')
        .eq('id', id)
        .maybeSingle()

      setRow((data as Row) ?? null)
    })()
  }, [id])

  const url = useMemo(() => {
    if (!row) return ''
    const t = (row.table_token || row.token || '').toString()
    return `${appUrl}/t/${t}`
  }, [row, appUrl])

  if (!row) return <div style={{ padding: 20 }}>Yükleniyor…</div>

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Masa {row.table_number} — QR</h1>
          <div style={{ opacity: 0.7, marginTop: 6, wordBreak: 'break-all' }}>{url}</div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/panel/${panelToken}/tables`} style={{ textDecoration: 'none' }}>
            Masalara Dön
          </Link>

          <button onClick={() => window.print()} style={{ padding: '10px 14px', cursor: 'pointer' }}>
            Yazdır / PDF
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, background: '#fff', padding: 18, borderRadius: 14, display: 'inline-block' }}>
        <QRCode value={url} size={280} />
      </div>
    </div>
  )
}