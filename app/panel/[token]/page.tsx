
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

export default function PanelTokenPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>('')

  const [rows, setRows] = useState<ReqRow[]>([])
  const [soundOn, setSoundOn] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ses tercihini sakla
  useEffect(() => {
    setSoundOn(localStorage.getItem('soundOn') === '1')
  }, [])

  useEffect(() => {
    localStorage.setItem('soundOn', soundOn ? '1' : '0')
  }, [soundOn])

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
    if (a) {
      try {
        a.volume = 0
        a.currentTime = 0
        await a.play()
        a.pause()
        a.volume = 1
      } catch {}
    }
    await playDing()
  }

  async function loadRestaurant() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (error) {
      alert(error.message)
      return
    }
    if (!data) {
      alert('Panel bulunamadı (restaurant yok).')
      return
    }

    setRestaurantId(data.id)
    setRestaurantName(data.name ?? '')
  }

  async function loadRequests(rid: string) {
    const { data, error } = await supabase
      .from('requests')
      .select('id, table_number, request_type, created_at')
      .eq('restaurant_id', rid)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setRows((data ?? []) as ReqRow[])
  }

  useEffect(() => {
    loadRestaurant()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  useEffect(() => {
    if (!restaurantId) return

    // ilk yükle
    loadRequests(restaurantId)

    // realtime
    const ch = supabase
      .channel(`req-live-${restaurantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, async (payload) => {
        // sadece bu restaurant ise
        const newRow: any = payload.new
        if (newRow?.restaurant_id !== restaurantId) return
        await loadRequests(restaurantId)
        await playDing()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, async (payload) => {
        const newRow: any = payload.new
        if (newRow?.restaurant_id !== restaurantId) return
        await loadRequests(restaurantId)
      })
      .subscribe()

    // fallback polling (realtime kaçarsa)
    const iv = setInterval(() => {
      loadRequests(restaurantId)
    }, 2000)

    return () => {
      clearInterval(iv)
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, soundOn])

  async function complete(id: string) {
    if (!restaurantId) return
    await supabase
      .from('requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)

    await loadRequests(restaurantId)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <audio ref={audioRef} src="/ding.wav" preload="auto" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Garson Paneli</h1>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {restaurantName ? `Restoran: ${restaurantName}` : `Token: ${panelToken}`}
          </div>
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
              gap: 12,
              background: 'white'
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>Masa {r.table_number}</div>
              <div style={{ opacity: 0.85 }}>{label(r.request_type)}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {new Date(r.created_at).toLocaleString('tr-TR')}
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