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

// ✅ Türkiye sabit UTC+3 (kesin)
// ISO UTC geliyorsa +3 ekleyip gösterir.
function trTimeFixedUTC3(iso: string) {
  const d = new Date(iso)
  const tr = new Date(d.getTime() + 3 * 60 * 60 * 1000)

  const dd = String(tr.getUTCDate()).padStart(2, '0')
  const mm = String(tr.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = tr.getUTCFullYear()

  const HH = String(tr.getUTCHours()).padStart(2, '0')
  const MI = String(tr.getUTCMinutes()).padStart(2, '0')
  const SS = String(tr.getUTCSeconds()).padStart(2, '0')

  return `${dd}.${mm}.${yyyy} ${HH}:${MI}:${SS}`
}

export default function Panel() {
  const [rows, setRows] = useState<ReqRow[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ✅ ses ayarı refresh sonrası da kalsın
  const [soundOn, setSoundOn] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('soundOn')
    if (saved === '1') setSoundOn(true)
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

  async function playAlert() {
    if (!soundOn) return

    // 1) alert.mp3 çal
    const a = audioRef.current
    if (a) {
      try {
        a.currentTime = 0
        a.volume = 1
        await a.play()
        return
      } catch {
        // devam: fallback beep
      }
    }

    // 2) Fallback: WebAudio beep (dosya olmasa bile)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      o.connect(g)
      g.connect(ctx.destination)
      g.gain.value = 0.12
      o.start()
      setTimeout(() => {
        o.stop()
        ctx.close()
      }, 180)
    } catch {}
  }

  // ✅ “Sesi Aç” bir kere tıkla → unlock + test beep
  async function unlockSound() {
    setSoundOn(true)

    // mp3 unlock dene
    const a = audioRef.current
    if (a) {
      try {
        a.volume = 0
        a.currentTime = 0
        await a.play()
        a.pause()
        a.volume = 1
      } catch {}
    }

    // test beep
    await playAlert()
  }

  useEffect(() => {
    load()

    // ✅ Anlık güncelleme: INSERT + UPDATE dinle
    const ch = supabase
      .channel('requests-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, async () => {
        await load()
        await playAlert()
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
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Garson Paneli</h1>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>PANEL v3</div>
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
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {trTimeFixedUTC3(r.created_at)}
              </div>
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