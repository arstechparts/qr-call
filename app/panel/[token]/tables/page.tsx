'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string | null
  token: string | null
  is_active: boolean | null
  created_at: string
}

export default function PanelTablesPage() {
  const params = useParams<{ token: string }>()
  const panelToken = params.token

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const appUrl = useMemo(() => process.env.NEXT_PUBLIC_APP_URL || '', [])

  async function loadAll() {
    setLoading(true)
    setErr(null)

    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,name')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr || !r?.id) {
      setRestaurantId(null)
      setRestaurantName(null)
      setRows([])
      setErr('Panel bulunamadı (restaurant yok).')
      setLoading(false)
      return
    }

    setRestaurantId(r.id)
    setRestaurantName(r.name)

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (error) {
      setErr(error.message)
      setRows([])
    } else {
      setRows((data || []) as TableRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    if (!restaurantId) return

    try {
      setErr(null)

      const max = rows.reduce((m, x) => Math.max(m, x.table_number || 0), 0)
      const next = max + 1

      const uuid = crypto.randomUUID()

      // token(text) ve table_token(uuid) ikisini de dolduruyoruz -> DB "token not null" / "uuid" hataları bitiyor
      const payload: any = {
        restaurant_id: restaurantId,
        table_number: next,
        table_token: uuid,
        token: uuid,
        is_active: true,
      }

      const { error } = await supabase.from('restaurant_tables').insert(payload)

      if (error) throw error

      await loadAll()
    } catch (e: any) {
      setErr(e?.message || 'Hata')
      alert(e?.message || 'Hata')
    }
  }

  function customerUrl(r: TableRow) {
    // Öncelik: table_token (uuid) — yoksa token(text)
    const t = (r.table_token || r.token || '').toString()
    return `${appUrl}/t/${t}`
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Masalar {restaurantName ? `— ${restaurantName}` : '(bulunamadı)'}</div>
          <div style={{ opacity: 0.6, fontSize: 12 }}>panel_token: {panelToken}</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/panel/${panelToken}`} style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
            Panele Dön
          </Link>
          <button onClick={addNextTable} style={{ padding: '10px 12px' }}>
            Sıradaki Masayı Ekle
          </button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {err ? (
        <div style={{ padding: 14, border: '1px solid #f3b', borderRadius: 10, background: '#fff0f6', marginBottom: 12 }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div>Yükleniyor…</div>
      ) : rows.length === 0 ? (
        <div style={{ opacity: 0.7 }}>Henüz masa yok.</div>
      ) : (
        <div>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                padding: 14,
                border: '1px solid #ddd',
                borderRadius: 12,
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 700 }}>Masa {r.table_number}</div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* QR Gör: panel içi QR sayfası */}
                <Link
                  href={`/panel/${panelToken}/tables/${r.id}`}
                  style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, textDecoration: 'none' }}
                >
                  QR Gör
                </Link>

                {/* QR Link: müşteri linki */}
                <a
                  href={customerUrl(r)}
                  style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, textDecoration: 'none' }}
                >
                  QR Link
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}