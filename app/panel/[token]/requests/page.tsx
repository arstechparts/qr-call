'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type ReqRow = {
  id: string
  restaurant_id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
  completed_at: string | null
}

const RESTAURANT_ID = '32c79585-1936-49d2-b3de-3edcee16d40e'

export default function Page() {
  const [rows, setRows] = useState<ReqRow[]>([])

  async function load() {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    if (error) alert(error.message)
    else setRows((data ?? []) as ReqRow[])
  }

  useEffect(() => {
    load()

    // realtime: yeni request gelince otomatik yenile
    const ch = supabase
      .channel('requests-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  async function complete(id: string) {
    const { error } = await supabase
      .from('requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) alert(error.message)
    else load()
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Bekleyen İstekler</h1>

      {rows.length === 0 ? (
        <div>Bekleyen istek yok.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                border: '1px solid #eee',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>Masa {r.table_number}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {r.request_type === 'waiter' ? 'Garson' : r.request_type === 'bill' ? 'Hesap' : r.request_type}
                  {' · '}
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>

              <button onClick={() => complete(r.id)} style={{ padding: '10px 12px', cursor: 'pointer' }}>
                Tamamlandı
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}