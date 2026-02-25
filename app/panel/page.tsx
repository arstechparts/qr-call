'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type RequestRow = {
  id: string
  restaurant_id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
}

const LS_KEY = 'qr_panel_sound_enabled'
const AUTO_REMOVE_SECONDS = 10

export default function PanelPage() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [enabling, setEnabling] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)

  const trTime = (iso: string) => {
    const d = new Date(iso)
    const fixed = new Date(d.getTime() + 3 * 60 * 60 * 1000)

    const parts = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(fixed)

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`
  }

  const requestTypeLabel = (t: string) => {
    if (t === 'waiter') return 'Garson Bekleniyor'
    if (t === 'bill') return 'Hesap İstiyor'
    return t
  }

  const statusLabel = (s: string) => (s === 'completed' ? 'Tamamlandı' : 'Bekliyor')

  const playDing = async () => {
    if (!soundEnabled) return
    try {
      const a = audioRef.current
      if (!a) return
      a.currentTime = 0
      await a.play()
    } catch {}
  }

  const beepForNewCount = (count: number) => {
    if (!soundEnabled) return
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        playDing()
      }, i * 450)
    }
  }

  const load = async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('id, restaurant_id, table_number, request_type, status, created_at')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    const newRows = (data as RequestRow[]) ?? []
    setRows(newRows)

    if (firstLoadRef.current) {
      firstLoadRef.current = false
      const set = new Set<string>()
      for (const r of newRows) set.add(r.id)
      seenIdsRef.current = set
      return
    }

    let newlyArrived = 0
    for (const r of newRows) {
      if (!seenIdsRef.current.has(r.id)) newlyArrived++
    }

    const updated = new Set<string>()
    for (const r of newRows) updated.add(r.id)
    seenIdsRef.current = updated

    if (newlyArrived > 0) beepForNewCount(newlyArrived)
  }

  useEffect(() => {
    setSoundEnabled(localStorage.getItem(LS_KEY) === '1')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled])

  const enableSound = async () => {
    setEnabling(true)
    try {
      const a = audioRef.current
      if (a) {
        const prevMuted = a.muted
        a.muted = true
        a.currentTime = 0
        await a.play()
        a.pause()
        a.currentTime = 0
        a.muted = prevMuted
      }
      localStorage.setItem(LS_KEY, '1')
      setSoundEnabled(true)
    } catch {
      localStorage.removeItem(LS_KEY)
      setSoundEnabled(false)
    } finally {
      setEnabling(false)
    }
  }

  const disableSound = () => {
    localStorage.removeItem(LS_KEY)
    setSoundEnabled(false)
  }

  const complete = async (id: string) => {
    setRows((prev) => prev.filter((x) => x.id !== id))
    await supabase.from('requests').update({ status: 'completed' }).eq('id', id)
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 14 }}>Panel</h1>

      <audio ref={audioRef} src="/ding.wav" preload="auto" />

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          padding: 14,
          maxWidth: 980,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 16 }}>
            <b>Ses:</b> {soundEnabled ? '🔊 Açık' : '🔇 Kapalı'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {soundEnabled ? (
            <button onClick={disableSound}>Sesli Bildirimi Kapat</button>
          ) : (
            <button onClick={enableSound} disabled={enabling}>
              {enabling ? 'Açılıyor...' : 'Sesli Bildirimi Aç'}
            </button>
          )}
          <button onClick={load}>Yenile</button>
        </div>
      </div>

      {errorMsg ? <p style={{ color: 'red' }}>{errorMsg}</p> : null}

      <div style={{ maxWidth: 980 }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              padding: 14,
              border: '1px solid #ddd',
              borderRadius: 12,
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div>
              <div><b>Masa:</b> {r.table_number}</div>
              <div><b>Tip:</b> {requestTypeLabel(r.request_type)}</div>
              <div><b>Durum:</b> {statusLabel(r.status)}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{trTime(r.created_at)}</div>
            </div>

            <button onClick={() => complete(r.id)} style={{ padding: '10px 14px' }}>
              Tamamlandı Yap
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}