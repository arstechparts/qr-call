'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RequestRow = {
  id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
}

function formatTR(iso?: string | null) {
  if (!iso) return ''

  const utc = new Date(iso).getTime()
  const tr = new Date(utc + 3 * 60 * 60 * 1000)

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(tr.getDate())}.${pad(tr.getMonth() + 1)}.${tr.getFullYear()} ${pad(tr.getHours())}:${pad(tr.getMinutes())}:${pad(tr.getSeconds())}`
}

function labelOf(type: string) {
  if (type === 'bill') return 'Hesap İste'
  if (type === 'waiter') return 'Garson Çağır'
  return type
}

export default function RequestsClient({ panelToken }: { panelToken: string }) {
  const [waiting, setWaiting] = useState<RequestRow[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function load() {
    const { data } = await supabase
      .from('requests')
      .select('id, table_number, request_type, status, created_at')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    setWaiting((data as RequestRow[]) || [])
  }

  async function enableSound() {
    // iPhone / Safari: ses için kullanıcı etkileşimi şart
    try {
      if (!audioRef.current) return
      audioRef.current.currentTime = 0
      await audioRef.current.play()
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setSoundEnabled(true)
      alert('Ses açıldı ✅')
    } catch (e) {
      alert('Ses açılamadı. Sessizde olmayın ve tekrar deneyin.')
    }
  }

  function ding() {
    if (!soundEnabled) return
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {})
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('requests-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        () => {
          load()
          ding()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled])

  async function complete(id: string) {
    await supabase.from('requests').update({ status: 'completed' }).eq('id', id)
    load()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 20,
        background: 'linear-gradient(#0b1220,#0a0f1a)',
        color: '#fff',
      }}
    >
      {/* SES DOSYAN: public/ding.wav olmalı */}
      <audio ref={audioRef} src="/ding.wav" preload="auto" />

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800 }}>
            Bekleyen İstekler ({waiting.length})
          </div>

          <button
            onClick={enableSound}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontWeight: 800,
            }}
          >
            {soundEnabled ? 'Ses Açık ✅' : 'Sesi Aç 🔊'}
          </button>
        </div>

        {waiting.length === 0 && <div style={{ opacity: 0.7 }}>Bekleyen çağrı yok</div>}

        {waiting.map((r) => (
          <div
            key={r.id}
            style={{
              background: 'rgba(255,255,255,0.06)',
              padding: 18,
              borderRadius: 14,
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                Masa {r.table_number} • {labelOf(r.request_type)}
              </div>

              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 14 }}>
                {formatTR(r.created_at)}
              </div>
            </div>

            <button
              onClick={() => complete(r.id)}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: '#22c55e',
                color: '#fff',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              Tamamlandı
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}