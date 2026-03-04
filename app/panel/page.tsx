'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type ReqRow = {
  id: string
  table_number: number
  request_type: string
  created_at: string
}

function label(type: string) {
  if (type === 'waiter') return 'Garson Çağır'
  if (type === 'bill') return 'Hesap İste'
  return type
}

function trTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
}

export default function Panel() {
  const [rows, setRows] = useState<ReqRow[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [soundOn, setSoundOn] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('requests')
      .select('id, table_number, request_type, created_at')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    setRows((data ?? []) as ReqRow[])
  }

  function beep() {
    if (!soundOn) return
    audioRef.current?.play().catch(() => {})
  }

  useEffect(() => {
    load()

    const ch = supabase
      .channel('requests-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, async () => {
        await load()
        beep()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [soundOn])

  async function complete(id: string) {
    await supabase.from('requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Garson Paneli</h1>

        <button
          onClick={() => {
            setSoundOn(true)
            setTimeout(() => beep(), 50)
          }}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
        >
          {soundOn ? 'Ses Açık ✅' : 'Sesi Aç'}
        </button>
      </div>

      <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              border: '1px solid #ddd',
              padding: 14,
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>Masa {r.table_number}</div>
              <div style={{ opacity: 0.8 }}>{label(r.request_type)}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{trTime(r.created_at)}</div>
            </div>

            <button onClick={() => complete(r.id)} style={{ padding: '10px 14px', cursor: 'pointer' }}>
              Tamamlandı
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}