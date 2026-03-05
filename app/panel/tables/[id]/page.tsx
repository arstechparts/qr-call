'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'react-qr-code'
import Link from 'next/link'

type Row = {
  id: string
  table_number: number
  table_token: string | null
  token: string | null
}

export default function Page({ params }: { params: { id: string } }) {
  const id = params.id
  const [row, setRow] = useState<Row | null>(null)

  const appUrl = useMemo(
    () => process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app',
    []
  )

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('id,table_number,table_token,token')
        .eq('id', id)
        .maybeSingle()

      setRow((data as Row) ?? null)
    })()
  }, [id])

  if (!row) return <div style={{ padding: 16 }}>Masa bulunamadı.</div>

  const t = (row.table_token || row.token || '').toString()
  const url = `${appUrl}/t/${t}`

  return (
    <div style={{ padding: 16 }}>
      <Link href="/panel/tables">← Masalara Dön</Link>
      <h1>Masa {row.table_number} QR</h1>

      <div style={{ background: '#fff', padding: 16, display: 'inline-block', borderRadius: 12 }}>
        <QRCode value={url} size={260} />
      </div>

      <div style={{ marginTop: 10, wordBreak: 'break-all' }}>{url}</div>

      <button onClick={() => window.print()} style={{ marginTop: 12, padding: 12 }}>
        Yazdır / PDF
      </button>
    </div>
  )
}