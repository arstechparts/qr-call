'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const TR_TZ = 'Europe/Istanbul'

function formatTR(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)

  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(d)
}

export default function RequestsPage({
  params,
}: {
  params: { token: string }
}) {

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
            marginBottom: 10
          }}
        >

          <div><b>Masa:</b> {r.table_number}</div>

          <div><b>İstek:</b> {r.request_type}</div>

          <div><b>Durum:</b> {r.status}</div>

          <div><b>Saat:</b> {formatTR(r.created_at)}</div>

        </div>

      ))}

    </div>

  )
}