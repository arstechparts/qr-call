'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string
  panel_token: string
}

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string | null
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
  const [error, setError] = useState<string | null>(null)

  const origin = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)

    // 1) Panel token -> restaurant bul
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,name,panel_token')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr) {
      setError(rErr.message)
      setRestaurant(null)
      setRows([])
      setLoading(false)
      return
    }

    if (!r) {
      setError('Panel bulunamadı (restaurant yok).')
      setRestaurant(null)
      setRows([])
      setLoading(false)
      return
    }

    setRestaurant(r)

    // 2) Sadece bu restaurant'ın masalarını çek
    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id,restaurant_id,table_number,table_token,token,is_active,created_at')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (tErr) {
      setError(tErr.message)
      setRows([])
      setLoading(false)
      return
    }

    setRows((t ?? []) as TableRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    if (!restaurant) return
    setAdding(true)
    setError(null)

    const maxNum = rows.reduce((m, x) => Math.max(m, Number(x.table_number || 0)), 0)
    const nextNumber = maxNum + 1

    // token (text) NOT NULL olabiliyor -> dolduruyoruz
    const tokenText = crypto.randomUUID().replaceAll('-', '') // 32 char
    // table_token (uuid) -> uuid olarak
    const tableTokenUuid = crypto.randomUUID()

    const { error: insErr } = await supabase.from('restaurant_tables').insert({
      restaurant_id: restaurant.id,
      table_number: nextNumber,
      token: tokenText,
      table_token: tableTokenUuid,
      is_active: true,
    })

    if (insErr) {
      setError(insErr.message)
      setAdding(false)
      return
    }

    await loadAll()
    setAdding(false)
  }

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h2>Masalar</h2>
        <div>Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h2>Masalar</h2>

      {restaurant && (
        <div style={{ marginBottom: 12, opacity: 0.8 }}>
          Restoran: <b>{restaurant.name}</b>
        </div>
      )}

      <button
        onClick={addNextTable}
        disabled={adding || !restaurant}
        style={{
          padding: '10px 14px',
          border: '1px solid #ddd',
          borderRadius: 10,
          background: '#fff',
          cursor: adding ? 'not-allowed' : 'pointer',
          marginBottom: 18,
        }}
      >
        {adding ? 'Ekleniyor...' : 'Sıradaki Masayı Ekle'}
      </button>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: '1px solid #f3b4b4',
            background: '#fff5f5',
            borderRadius: 10,
            color: '#8a1f1f',
          }}
        >
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ opacity: 0.7 }}>Henüz masa yok.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((r) => {
            const customerUrl = `${origin}/t/${r.table_token ?? ''}`

            return (
              <div
                key={r.id}
                style={{
                  padding: 14,
                  border: '1px solid #e5e5e5',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 700 }}>Masa {r.table_number}</div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Link
                    href={`/panel/${panelToken}/tables/${r.id}`}
                    style={{
                      padding: '8px 10px',
                      border: '1px solid #ddd',
                      borderRadius: 10,
                      textDecoration: 'none',
                      color: '#111',
                      background: '#fff',
                    }}
                  >
                    QR Gör
                  </Link>

                  <a
                    href={customerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '8px 10px',
                      border: '1px solid #ddd',
                      borderRadius: 10,
                      textDecoration: 'none',
                      color: '#111',
                      background: '#fff',
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