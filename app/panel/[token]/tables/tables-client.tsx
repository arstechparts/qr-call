'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string
  panel_token: string | null
}

type Table = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const APP = 'https://qr-call.vercel.app'

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const tableMap = useMemo(() => {
    const m = new Map<number, Table>()
    tables.forEach(t => m.set(t.table_number, t))
    return m
  }, [tables])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      /* 1️⃣ panel token → restaurant bul */
      const { data: r, error: rErr } = await supabase
        .from('restaurants')
        .select('id,name,panel_token')
        .eq('panel_token', panelToken)
        .maybeSingle()

      if (rErr) throw rErr
      if (!r) {
        setError('Restaurant bulunamadı')
        return
      }

      setRestaurant(r)

      /* 2️⃣ restaurant_id → masaları çek */
      const { data: t, error: tErr } = await supabase
        .from('restaurant_tables')
        .select('id,restaurant_id,table_number,table_token')
        .eq('restaurant_id', r.id)
        .order('table_number')

      if (tErr) throw tErr

      setTables(t || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [panelToken])

  function openQr(token: string) {
    const url = `${APP}/t/${token}`

    const qr =
      'https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=' +
      encodeURIComponent(url)

    window.open(qr, '_blank')
  }

  function openLink(token: string) {
    window.open(`${APP}/t/${token}`, '_blank')
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>

      <h1 style={{ fontSize: 32, marginBottom: 10 }}>Masalar</h1>

      <div style={{ marginBottom: 20 }}>
        {loading && 'Yükleniyor...'}
        {!loading && restaurant && restaurant.name}
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {[...Array(34)].map((_, i) => {
        const n = i + 1
        const row = tableMap.get(n)

        return (
          <div
            key={n}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 10,
              borderBottom: '1px solid #ddd',
            }}
          >
            <div>
              <b>Masa {n}</b>
              <div style={{ fontSize: 12 }}>
                {row ? 'Oluşturuldu' : 'Henüz oluşturulmadı'}
              </div>
            </div>

            {row && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => openQr(row.table_token)}>
                  QR Gör
                </button>

                <button onClick={() => openLink(row.table_token)}>
                  Link Aç
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}