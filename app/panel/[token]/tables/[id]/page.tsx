'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import QR from 'qrcode'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string | null
  token: string | null
}

export default function TableQrPage() {
  const params = useParams<{ token: string; id: string }>()
  const panelToken = params.token
  const tableId = params.id

  const [row, setRow] = useState<TableRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null)

  const appUrl = useMemo(() => process.env.NEXT_PUBLIC_APP_URL || '', [])

  const customerUrl = useMemo(() => {
    const t = (row?.table_token || row?.token || '').toString()
    return t ? `${appUrl}/t/${t}` : ''
  }, [row, appUrl])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('restaurant_tables').select('id,restaurant_id,table_number,table_token,token').eq('id', tableId).maybeSingle()
      if (!error && data) setRow(data as TableRow)
      setLoading(false)
    }
    load()
  }, [tableId])

  useEffect(() => {
    async function makePng() {
      if (!customerUrl) return
      const url = await QR.toDataURL(customerUrl, { margin: 1, width: 1024 })
      setPngDataUrl(url)
    }
    makePng()
  }, [customerUrl])

  function downloadPng() {
    if (!pngDataUrl || !row) return
    const a = document.createElement('a')
    a.href = pngDataUrl
    a.download = `masa-${row.table_number}.png`
    a.click()
  }

  if (loading) return <div style={{ padding: 16 }}>Yükleniyor…</div>
  if (!row) return <div style={{ padding: 16 }}>Masa bulunamadı.</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Masa {row.table_number} — QR</div>
          <div style={{ opacity: 0.7, wordBreak: 'break-all' }}>{customerUrl}</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/panel/${panelToken}/tables`} style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
            Masalara Dön
          </Link>
          <button onClick={downloadPng} style={{ padding: '10px 12px' }}>
            PNG İndir
          </button>
        </div>
      </div>

      <div style={{ height: 18 }} />

      <div style={{ background: '#fff', padding: 18, borderRadius: 12, display: 'inline-block' }}>
        <QRCode value={customerUrl} size={260} />
      </div>
    </div>
  )
}