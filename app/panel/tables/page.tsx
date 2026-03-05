'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import QR from 'qrcode'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Basit token üretimi (güçlendirmek istersen crypto/randomUUID kullanırız)
function makeToken(len = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  token: string
  is_active: boolean
  created_at: string
}

export default function TablesPage() {
  // Şimdilik sabit varsayım: restaurant_id panel login’den gelecek.
  // Senin auth/tenant yapına göre burayı bağlarız.
  const restaurantId = 'RESTAURANT_UUID_BURAYA' // TODO: auth sonrası dinamik

  const [tableNumber, setTableNumber] = useState<number>(1)
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(false)
  const baseUrl = useMemo(() => {
    // prod domainin varsa NEXT_PUBLIC_APP_URL ile daha sağlam olur
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
    return typeof window !== 'undefined' ? window.location.origin : ''
  }, [])

  async function load() {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true })

    if (!error && data) setRows(data as TableRow[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createTable() {
    setLoading(true)
    try {
      const token = makeToken()
      const { error } = await supabase.from('tables').insert({
        restaurant_id: restaurantId,
        table_number: tableNumber,
        token
      })
      if (error) {
        alert(error.message)
        return
      }
      setTableNumber((n) => n + 1)
      await load()
    } finally {
      setLoading(false)
    }
  }

  async function downloadPng(token: string, tableNo: number) {
    const url = `${baseUrl}/t/${token}`
    const dataUrl = await QR.toDataURL(url, { margin: 2, width: 512 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `masa-${tableNo}-qr.png`
    a.click()
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Masalar & QR</h1>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
        <label>
          Masa No:
          <input
            type="number"
            value={tableNumber}
            min={1}
            onChange={(e) => setTableNumber(parseInt(e.target.value || '1', 10))}
            style={{ marginLeft: 8, padding: 8, width: 120 }}
          />
        </label>

        <button
          onClick={createTable}
          disabled={loading}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
        >
          {loading ? 'Ekleniyor…' : 'Masa Oluştur'}
        </button>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gap: 14 }}>
        {rows.map((r) => {
          const url = `${baseUrl}/t/${r.token}`
          return (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr auto',
                gap: 16,
                alignItems: 'center',
                border: '1px solid #e5e5e5',
                borderRadius: 12,
                padding: 14
              }}
            >
              <div style={{ background: 'white', padding: 8, borderRadius: 8 }}>
                <QRCode value={url} size={96} />
              </div>

              <div>
                <div style={{ fontWeight: 700 }}>Masa {r.table_number}</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{url}</div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => downloadPng(r.token, r.table_number)}
                  style={{ padding: '10px 12px', cursor: 'pointer' }}
                >
                  PNG indir
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}