'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Req = {
  id: string
  table_number: number
  status: string
  created_at: string
  request_type: string | null
}

export default function PanelPage() {
  const [rows, setRows] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWaiting = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setRows((data ?? []) as Req[])
    setLoading(false)
  }

  const markDone = async (id: string) => {
    const { error } = await supabase
      .from('requests')
      .update({ status: 'completed' })
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Update hatası, console’a bak')
      return
    }

    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  useEffect(() => {
    fetchWaiting()
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>📣 Canlı Çağrı Paneli</h1>

      <button onClick={fetchWaiting} style={{ marginBottom: 16 }}>
        Yenile
      </button>

      {loading && <p>Yükleniyor...</p>}
      {!loading && rows.length === 0 && <p>Şu an bekleyen yok ✅</p>}

      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Masa {r.table_number}
              </div>
              <div style={{ opacity: 0.8 }}>
                Tip: {r.request_type ?? '-'} •{' '}
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>

            <button onClick={() => markDone(r.id)}>Completed</button>
          </div>
        ))}
      </div>
    </div>
  )
}