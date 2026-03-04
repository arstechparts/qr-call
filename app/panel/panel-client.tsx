'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type ReqRow = {
  id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
  completed_at: string | null
  restaurant_id: string | null
}

function requestTypeLabel(t: string) {
  if (t === 'waiter') return 'Garson'
  if (t === 'bill') return 'Hesap'
  if (t === 'menu') return 'Menü'
  return t
}

function statusLabel(s: string) {
  if (s === 'waiting') return 'Bekliyor'
  if (s === 'completed') return 'Tamamlandı'
  return s
}

function trTime(iso: string) {
  // TR saat/tarih (İstanbul) + 2 haneli gün/ay
  const d = new Date(iso)
  const date = d.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
  const time = d.toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

export default function PanelClient({ token }: { token: string }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [rows, setRows] = useState<ReqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const panelLinks = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || ''
    return {
      tables: `${base}/panel/${token}/tables`,
      requests: `${base}/panel/${token}/requests`,
    }
  }, [token])

  useEffect(() => {
    audioRef.current = new Audio('/ding.wav')
    audioRef.current.preload = 'auto'
  }, [])

  async function enableSound() {
    try {
      if (!audioRef.current) return
      // iOS/Browser izin için kullanıcı aksiyonu şart
      await audioRef.current.play()
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setSoundEnabled(true)
      alert('Ses açıldı ✅')
    } catch {
      alert('Ses açmak için tekrar dokun.')
    }
  }

  async function playDing() {
    if (!soundEnabled) return
    try {
      if (!audioRef.current) return
      audioRef.current.currentTime = 0
      await audioRef.current.play()
    } catch {
      // sessiz geç
    }
  }

  async function loadRestaurantAndRequests() {
    setLoading(true)

    // 1) restaurant bul (panel_token ile)
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,name')
      .eq('panel_token', token)
      .maybeSingle()

    if (rErr || !r?.id) {
      setRestaurantId(null)
      setRestaurantName(null)
      setRows([])
      setLoading(false)
      return
    }

    setRestaurantId(r.id)
    setRestaurantName(r.name)

    // 2) istekleri çek
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('restaurant_id', r.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!error && data) setRows(data as ReqRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadRestaurantAndRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (!restaurantId) return

    // realtime: restaurant_id filtresi
    const channel = supabase
      .channel(`requests-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const newRow = payload.new as ReqRow
          setRows((prev) => [newRow, ...prev])
          playDing()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const upd = payload.new as ReqRow
          setRows((prev) => prev.map((x) => (x.id === upd.id ? upd : x)))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, soundEnabled])

  async function complete(id: string) {
    await supabase.from('requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Panel</div>
          <div style={{ opacity: 0.7 }}>
            {restaurantName ? `${restaurantName}` : 'Panel bulunamadı (restaurant yok).'}
          </div>
          <div style={{ opacity: 0.6, fontSize: 12 }}>token: {token}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={enableSound} style={{ padding: '10px 12px' }}>
            Sesi Aç
          </button>

          <Link href={`/panel/${token}/tables`} style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
            Masalar
          </Link>

          <Link href={`/panel/${token}/requests`} style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
            İstekler
          </Link>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {loading ? (
        <div>Yükleniyor…</div>
      ) : !restaurantId ? (
        <div style={{ padding: 14, border: '1px solid #f3b', borderRadius: 10, background: '#fff0f6' }}>
          Panel bulunamadı (restaurant yok).
        </div>
      ) : (
        <div>
          {rows.length === 0 ? (
            <div style={{ opacity: 0.7 }}>Henüz istek yok.</div>
          ) : (
            rows.map((r) => (
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
                  <div>
                    <b>Masa:</b> {r.table_number}
                  </div>
                  <div>
                    <b>Tip:</b> {requestTypeLabel(r.request_type)}
                  </div>
                  <div>
                    <b>Durum:</b> {statusLabel(r.status)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{trTime(r.created_at)}</div>
                </div>

                <button onClick={() => complete(r.id)} style={{ padding: '10px 14px' }}>
                  Tamamlandı Yap
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}