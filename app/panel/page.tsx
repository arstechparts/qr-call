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

export default function Panel() {
  const [rows, setRows] = useState<ReqRow[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [soundOn, setSoundOn] = useState(false)
  const [trOffsetMs, setTrOffsetMs] = useState<number | null>(null)

  // refresh sonrası ses açık kalsın
  useEffect(() => {
    setSoundOn(localStorage.getItem('soundOn') === '1')
  }, [])

  useEffect(() => {
    localStorage.setItem('soundOn', soundOn ? '1' : '0')
  }, [soundOn])

  async function load() {
    const { data } = await supabase
      .from('requests')
      .select('id, table_number, request_type, created_at')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    setRows((data ?? []) as ReqRow[])
  }

  // ✅ TR offset'u DB’den al (tarayıcıya güvenme)
  async function syncTrOffset() {
    const { data, error } = await supabase.rpc('tr_now')
    if (error || !data) return

    const trNow = new Date(data as string).getTime()
    const utcNow = Date.now()
    setTrOffsetMs(trNow - utcNow)
  }

  function fmtTr(iso: string) {
    const base = new Date(iso).getTime()
    const ms = trOffsetMs ?? 0
    const d = new Date(base + ms)

    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const HH = String(d.getHours()).padStart(2, '0')
    const MI = String(d.getMinutes()).padStart(2, '0')
    const SS = String(d.getSeconds()).padStart(2, '0')

    return `${dd}.${mm}.${yyyy} ${HH}:${MI}:${SS}`
  }

  async function playDing() {
    if (!soundOn) return
    const a = audioRef.current
    if (!a) return
    try {
      a.currentTime = 0
      a.volume = 1
      await a.play()
    } catch {}
  }

  async function unlockSound() {
    setSoundOn(true)
    const a = audioRef.current
    if (!a) return
    try {
      a.volume = 0
      a.currentTime = 0
      await a.play()
      a.pause()
      a.volume = 1
    } catch {}
    // test ding
    await playDing()
  }

  useEffect(() => {
    load()
    syncTrOffset()

    const ch = supabase
      .channel('requests-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, async () => {
        await load()
        await playDing()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, async () => {
        await load()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn])

  async function complete(id: string) {
    await supabase
      .from('requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <audio ref={audioRef} src="/ding.wav" preload="auto" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Garson Paneli</h1>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>PANEL v4</div>
        </div>

        <button onClick={unlockSound} style={{ padding: '10px 14px', cursor: 'pointer' }}>
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
              <div style={{ opacity: 0.85 }}>{label(r.request_type)}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{fmtTr(r.created_at)}</div>
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