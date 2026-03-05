'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ✅ Türkiye sabit UTC+3 (yaz saati yok)
function formatTR(iso?: string | null) {
  if (!iso) return ''

  const utc = new Date(iso)
  const tr = new Date(utc.getTime() + 3 * 60 * 60 * 1000)

  const pad = (n: number) => String(n).padStart(2, '0')

  const yyyy = tr.getUTCFullYear()
  const mm = pad(tr.getUTCMonth() + 1)
  const dd = pad(tr.getUTCDate())
  const hh = pad(tr.getUTCHours())
  const mi = pad(tr.getUTCMinutes())
  const ss = pad(tr.getUTCSeconds())

  return `${dd}.${mm}.${yyyy} ${hh}:${mi}:${ss}`
}

export default function RequestsPage({ params }: { params: { token: string } }) {
  const [requests, setRequests] = useState<any[]>([])

  async function load() {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })

    setRequests(data || [])
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 30 }}>
      <h1>İstekler</h1>

      {requests.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid #ddd',
            borderRadius: 10,
            padding: 15,
            marginBottom: 10,
          }}
        >
          <div>
            <b>Masa:</b> {r.table_number}
          </div>

          <div>
            <b>İstek:</b> {r.request_type}
          </div>

          <div>
            <b>Durum:</b> {r.status}
          </div>

          <div>
            <b>Saat (TR):</b> {formatTR(r.created_at)}
          </div>
        </div>
      ))}
    </div>
  )
}