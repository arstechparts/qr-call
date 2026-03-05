'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = { id: string; name: string; panel_token: string }

type ReqRow = {
  id: string
  restaurant_id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
}

function trTime(iso: string) {
  // Türkiye saati
  return new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
}

export default function RequestsPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<ReqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/ding.wav')
    audioRef.current.preload = 'auto'
  }, [])

  async function playDing() {
    try {
      if (!soundEnabled) return
      await audioRef.current?.play()
    } catch {
      // iOS bazen engeller, sorun değil
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setErr(null)

      const { data: r, error: rErr } = await supabase
        .from('restaurants')
        .select('id, name, panel_token')
        .eq('panel_token', panelToken)
        .maybeSingle()

      if (!alive) return

      if (rErr || !r) {
        setRestaurant(null)
        setRows([])
        setErr('Panel bulunamadı (restaurant yok).')
        setLoading(false)
        return
      }

      setRestaurant(r as Restaurant)

      const { data: reqs, error: qErr } = await supabase
        .from('requests')
        .select('id, restaurant_id, table_number, request_type, status, created_at')
        .eq('restaurant_id', r.id)
        .order('created_at', { ascending: false })

      if (!alive) return

      if (qErr) setErr(qErr.message)
      setRows((reqs || []) as ReqRow[])
      setLoading(false)

      // realtime
      const channel = supabase
        .channel(`requests-${r.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'requests', filter: `restaurant_id=eq.${r.id}` },
          async () => {
            const { data: fresh } = await supabase
              .from('requests')
              .select('id, restaurant_id, table_number, request_type, status, created_at')
              .eq('restaurant_id', r.id)
              .order('created_at', { ascending: false })

            if (!alive) return
            setRows((fresh || []) as ReqRow[])
            await playDing()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })()

    return () => {
      alive = false
    }
  }, [panelToken, soundEnabled])

  async function complete(id: string) {
    const { error } = await supabase.from('requests').update({ status: 'done' }).eq('id', id)
    if (error) alert(error.message)
  }

  if (loading) return <div>Yükleniyor…</div>

  return (
    <div>
      <h2 style={{ margin: '6px 0 6px' }}>İstekler {restaurant ? `- ${restaurant.name}` : ''}</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button
          onClick={async () => {
            setSoundEnabled(true)
            try {
              await audioRef.current?.play()
              audioRef.current?.pause()
              if (audioRef.current) audioRef.current.currentTime = 0
            } catch {}
          }}
        >
          Sesi Aç
        </button>

        <a href={`/panel/${panelToken}/tables`}>Masalar</a>
      </div>

      {err && (
        <div style={{ background: '#ffe6e6', border: '1px solid #ffb3b3', padding: 10, borderRadius: 8 }}>
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              border: '1px solid #e5e5e5',
              borderRadius: 10,
              padding: 12,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>Masa {r.table_number}</div>
              <div>Tip: {r.request_type}</div>
              <div>Durum: {r.status}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{trTime(r.created_at)}</div>
            </div>

            <button onClick={() => complete(r.id)}>Tamamlandı</button>
          </div>
        ))}
      </div>
    </div>
  )
}