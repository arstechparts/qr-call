'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string | null
  panel_token: string
}

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  token: string | null
  is_active: boolean
  created_at: string
}

export default function TablesPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string>('')

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://qr-call.vercel.app'

  const nextNumber = useMemo(() => {
    const max = rows.reduce((m, r) => (r.table_number > m ? r.table_number : m), 0)
    return max + 1
  }, [rows])

  async function loadAll() {
    setLoading(true)
    setErr('')

    // 1) RESTAURANT BUL (panel_token ile!)
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,name,panel_token')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr) {
      setErr(rErr.message)
      setRestaurant(null)
      setRows([])
      setLoading(false)
      return
    }

    if (!r) {
      setErr('Panel bulunamadı (restaurant yok).')
      setRestaurant(null)
      setRows([])
      setLoading(false)
      return
    }

    setRestaurant(r as Restaurant)

    // 2) MASALARI ÇEK
    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id,restaurant_id,table_number,table_token,token,is_active,created_at')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (tErr) {
      setErr(tErr.message)
      setRows([])
      setLoading(false)
      return
    }

    setRows((t || []) as TableRow[])
    setLoading(false)
  }

  async function addNextTable() {
    if (!restaurant) return
    setAdding(true)
    setErr('')

    // Sadece restaurant_id + table_number gönderiyoruz.
    // token / table_token DB’de default/trigger ile dolmalı.
    const { error } = await supabase.from('restaurant_tables').insert({
      restaurant_id: restaurant.id,
      table_number: nextNumber,
      is_active: true,
    })

    if (error) {
      setErr(error.message)
      setAdding(false)
      return
    }

    await loadAll()
    setAdding(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 10 }}>Masalar</h1>

      <button
        onClick={addNextTable}
        disabled={!restaurant || adding}
        style={{
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid #ddd',
          background: adding ? '#f3f3f3' : 'white',
          cursor: adding ? 'not-allowed' : 'pointer',
          fontSize: 16,
        }}
      >
        {adding ? 'Ekleniyor...' : 'Sıradaki Masayı Ekle'}
      </button>

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

      {loading ? (
        <div style={{ marginTop: 20, opacity: 0.7 }}>Yükleniyor…</div>
      ) : rows.length === 0 ? (
        <div style={{ marginTop: 20, opacity: 0.7 }}>Henüz masa yok.</div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {rows.map((r) => {
            const qrLink = `${origin}/t/${r.table_token}`
            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>Masa {r.table_number}</div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link
                    href={`/panel/${panelToken}/tables/${r.id}`}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 10,
                      textDecoration: 'none',
                      color: 'black',
                      fontWeight: 600,
                    }}
                  >
                    QR Gör
                  </Link>

                  <a
                    href={qrLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 10,
                      textDecoration: 'none',
                      color: 'black',
                      fontWeight: 600,
                    }}
                  >
                    QR Link
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}