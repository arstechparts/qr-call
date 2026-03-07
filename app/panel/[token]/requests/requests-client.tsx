'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RequestRow = {
  id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
  restaurant_id?: string | null
}

type RestaurantRow = {
  id: string
  name: string
  panel_token: string | null
  instagram_url?: string | null
  is_active?: boolean
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
  const DEMO_RESTAURANT_ID = '2d0e88c2-7835-4a1b-86fe-e28e44f0b87d'
  const DEMO_RESTAURANT_NAME = 'Casita Nişantaşı'

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [waiting, setWaiting] = useState<RequestRow[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [error, setError] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function resolveRestaurant() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, panel_token, instagram_url, is_active')
      .eq('panel_token', panelToken)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (data) {
      return data as RestaurantRow
    }

    return {
      id: DEMO_RESTAURANT_ID,
      name: DEMO_RESTAURANT_NAME,
      panel_token: panelToken || null,
      instagram_url: null,
      is_active: true,
    } as RestaurantRow
  }

  async function load(resolvedRestaurantId?: string) {
    try {
      let restaurantId = resolvedRestaurantId

      if (!restaurantId) {
        const resolvedRestaurant = await resolveRestaurant()
        setRestaurant(resolvedRestaurant)
        restaurantId = resolvedRestaurant.id
      }

      const { data, error } = await supabase
        .from('requests')
        .select('id, table_number, request_type, status, created_at, restaurant_id')
        .eq('status', 'waiting')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setWaiting((data as RequestRow[]) || [])
      setError('')
    } catch (e: any) {
      setError(e?.message || 'İstekler yüklenemedi')
    }
  }

  async function enableSound() {
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
    let activeRestaurantId = ''

    ;(async () => {
      const resolvedRestaurant = await resolveRestaurant()
      setRestaurant(resolvedRestaurant)
      activeRestaurantId = resolvedRestaurant.id
      await load(resolvedRestaurant.id)

      const channel = supabase
        .channel(`requests-live-${resolvedRestaurant.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'requests' },
          (payload: any) => {
            if (payload?.new?.restaurant_id === resolvedRestaurant.id) {
              load(resolvedRestaurant.id)
              ding()
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'requests' },
          (payload: any) => {
            const changedRestaurantId =
              payload?.new?.restaurant_id || payload?.old?.restaurant_id
            if (changedRestaurantId === resolvedRestaurant.id) {
              load(resolvedRestaurant.id)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })()

    return () => {
      activeRestaurantId = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken, soundEnabled])

  async function complete(id: string) {
    await supabase.from('requests').update({ status: 'completed' }).eq('id', id)
    if (restaurant?.id) {
      load(restaurant.id)
    } else {
      load()
    }
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
          <div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>
              Bekleyen İstekler ({waiting.length})
            </div>
            <div style={{ opacity: 0.65, marginTop: 4 }}>
              {restaurant ? restaurant.name : 'Yükleniyor…'}
            </div>
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

        {error ? (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 16,
              padding: 14,
              border: '1px solid rgba(255,100,100,0.35)',
              background: 'rgba(255,100,100,0.12)',
              color: '#ffd5d5',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

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