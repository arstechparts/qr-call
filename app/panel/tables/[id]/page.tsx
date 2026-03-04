'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = { id: string; panel_token: string }
type TableRow = { id: string; table_number: number; table_token: string; restaurant_id: string }

export default function TableQrPage({ params }: { params: { token: string; id: string } }) {
  const panelToken = params.token
  const tableId = params.id

  const [row, setRow] = useState<TableRow | null>(null)
  const [err, setErr] = useState('')

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://qr-call.vercel.app'

  const qrValue = useMemo(() => {
    if (!row) return ''
    return `${origin}/t/${row.table_token}`
  }, [row, origin])

  async function load() {
    setErr('')

    // restaurant bul
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,panel_token')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr) return setErr(rErr.message)
    if (!r) return setErr('Panel bulunamadı (restaurant yok).')

    const restaurant = r as Restaurant

    // masa bul (id + restaurant_id ile güvenli)
    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id,table_number,table_token,restaurant_id')
      .eq('id', tableId)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle()

    if (tErr) return setErr(tErr.message)
    if (!t) return setErr('Masa bulunamadı.')

    setRow(t as TableRow)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken, tableId])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 10 }}>QR</h1>

      {err ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: '1px solid #ffb4b4',
            background: '#ffecec',
            borderRadius: 10,
            color: '#a40000',
          }}
        >
          {err}
        </div>
      ) : null}

      {!row ? null : (
        <div
          style={{
            marginTop: 14,
            border: '1px solid #e5e5e5',
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            Masa {row.table_number}
          </div>

          <div style={{ background: 'white', padding: 16, display: 'inline-block', borderRadius: 12 }}>
            <QRCode value={qrValue} size={240} />
          </div>

          <div style={{ marginTop: 12, wordBreak: 'break-all', opacity: 0.8 }}>{qrValue}</div>
        </div>
      )}
    </div>
  )
}