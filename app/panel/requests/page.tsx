'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Req = {
  id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
}

export default function Page() {
  const [rows, setRows] = useState<Req[]>([])

  async function load() {
    const { data } = await supabase
      .from('requests')
      .select('id,table_number,request_type,status,created_at')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    setRows((data ?? []) as Req[])
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 2000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h1>İstekler</h1>

      {rows.length === 0 ? (
        <div>Aktif istek yok.</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 12, marginBottom: 10 }}>
            <b>Masa {r.table_number}</b> — {r.request_type} — {new Date(r.created_at).toLocaleString('tr-TR')}
          </div>
        ))
      )}
    </div>
  )
}