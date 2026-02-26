'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  is_active: boolean
}

type RestaurantRow = {
  id: string
  name: string
  // eğer sende varsa kullanırız, yoksa boş kalır
  logo_url?: string | null
}

export default function TablePage() {
  const params = useParams<{ table: string }>()
  const token = params?.table

  const [table, setTable] = useState<TableRow | null>(null)
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<null | 'waiter' | 'bill'>(null)
  const [toast, setToast] = useState<string | null>(null)

  const title = useMemo(() => {
    if (loading) return 'Yükleniyor…'
    if (!table) return 'QR geçersiz'
    return `Masa ${table.table_number}`
  }, [loading, table])

  useEffect(() => {
    ;(async () => {
      if (!token) return
      setLoading(true)

      const t = await supabase
        .from('restaurant_tables')
        .select('id, restaurant_id, table_number, table_token, is_active')
        .eq('table_token', token)
        .eq('is_active', true)
        .single()

      if (t.error || !t.data) {
        setTable(null)
        setRestaurant(null)
        setLoading(false)
        return
      }

      setTable(t.data as TableRow)

      const r = await supabase
        .from('restaurants')
        .select('id, name, logo_url')
        .eq('id', t.data.restaurant_id)
        .single()

      if (!r.error && r.data) setRestaurant(r.data as RestaurantRow)
      else setRestaurant(null)

      setLoading(false)
    })()
  }, [token])

  async function sendRequest(type: 'waiter' | 'bill') {
    if (!table) return
    setToast(null)
    setSending(type)

    const { error } = await supabase.from('requests').insert([
      {
        restaurant_id: table.restaurant_id,
        table_number: table.table_number,
        request_type: type,
        status: 'waiting'
      }
    ])

    if (error) alert(error.message)
    else setToast(type === 'waiter' ? 'Garson çağrıldı ✅' : 'Hesap istendi ✅')

    setSending(null)
  }

  return (
    <div style={{ minHeight: '100vh', padding: 18, background: '#0b0f1a', color: 'white' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 18 }}>
        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {restaurant?.logo_url ? (
              <img src={restaurant.logo_url} alt="logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
            ) : null}
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              {restaurant?.name ?? 'Restoran'}
            </div>
          </div>

          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{title}</div>

          {!table ? (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)'
              }}
            >
              Bu QR kod geçersiz ya da masa kapalı.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                <button
                  onClick={() => sendRequest('waiter')}
                  disabled={sending !== null}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.10)',
                    color: 'white'
                  }}
                >
                  {sending === 'waiter' ? 'Gönderiliyor…' : 'Garson Çağır'}
                </button>

                <button
                  onClick={() => sendRequest('bill')}
                  disabled={sending !== null}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.10)',
                    color: 'white'
                  }}
                >
                  {sending === 'bill' ? 'Gönderiliyor…' : 'Hesap İste'}
                </button>
              </div>

              {toast ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 14,
                    background: 'rgba(34,197,94,0.18)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    fontWeight: 800
                  }}
                >
                  {toast}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}