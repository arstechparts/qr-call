'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RestaurantRow = {
  id: string
  name: string
  panel_token: string
}

type RequestRow = {
  id: string
  restaurant_id: string
  table_number: number
  request_type: 'waiter' | 'bill' | string
  status: 'waiting' | 'completed' | string
  created_at: string
  completed_at?: string | null
}

// ✅ KESİN TR SAAT (UTC + 3) — Intl yok, sapıtmaz
function formatTR(iso?: string | null) {
  if (!iso) return ''

  const utcMs = Date.parse(iso)
  if (Number.isNaN(utcMs)) return ''

  const trMs = utcMs + 3 * 60 * 60 * 1000
  const s = new Date(trMs).toISOString() // trMs'i UTC gibi yazar ama biz zaten +3 verdik

  const yyyy = s.slice(0, 4)
  const mm = s.slice(5, 7)
  const dd = s.slice(8, 10)
  const hh = s.slice(11, 13)
  const mi = s.slice(14, 16)
  const ss = s.slice(17, 19)

  return `${dd}.${mm}.${yyyy} ${hh}:${mi}:${ss}`
}

function formatTRNow() {
  const trMs = Date.now() + 3 * 60 * 60 * 1000
  const s = new Date(trMs).toISOString()
  const yyyy = s.slice(0, 4)
  const mm = s.slice(5, 7)
  const dd = s.slice(8, 10)
  const hh = s.slice(11, 13)
  const mi = s.slice(14, 16)
  const ss = s.slice(17, 19)
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}:${ss}`
}

function labelType(t: string) {
  if (t === 'waiter') return 'Garson Çağır'
  if (t === 'bill') return 'Hesap İste'
  return t
}

export default function RequestsClient({ panelToken }: { panelToken: string }) {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)

  const [waiting, setWaiting] = useState<RequestRow[]>([])
  const [history, setHistory] = useState<RequestRow[]>([])

  const [soundUnlocked, setSoundUnlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const bgStyle = useMemo(
    () => ({
      minHeight: '100vh',
      padding: 16,
      background:
        'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
        'linear-gradient(180deg, #0b1220 0%, #0a0f1a 100%)',
      color: '#fff',
    }),
    []
  )

  const card: React.CSSProperties = {
    borderRadius: 18,
    padding: 14,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  }

  function ding() {
    try {
      if (!soundUnlocked) return
      if (!audioRef.current) return
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch {}
  }

  async function unlockSound() {
    setSoundUnlocked(true)
    if (!audioRef.current) return
    try {
      audioRef.current.currentTime = 0
      await audioRef.current.play()
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    } catch {}
  }

  async function loadAll(rid?: string) {
    const restaurantId = rid || restaurant?.id
    if (!restaurantId) return

    const { data, error } = await supabase
      .from('requests')
      .select('id, restaurant_id, table_number, request_type, status, created_at, completed_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      setErr(error.message)
      setWaiting([])
      setHistory([])
      return
    }

    const all = (data || []) as RequestRow[]
    setWaiting(all.filter((x) => x.status === 'waiting'))
    setHistory(all.filter((x) => x.status !== 'waiting'))
  }

  useEffect(() => {
    let alive = true

    ;(async () => {
      setLoading(true)
      setErr(null)
      setRestaurant(null)
      setWaiting([])
      setHistory([])

      const { data: r, error: rErr } = await supabase
        .from('restaurants')
        .select('id, name, panel_token')
        .eq('panel_token', panelToken)
        .limit(1)
        .maybeSingle()

      if (!alive) return

      if (rErr || !r) {
        setErr('Panel bulunamadı (restaurant yok).')
        setLoading(false)
        return
      }

      setRestaurant(r as RestaurantRow)
      await loadAll((r as RestaurantRow).id)

      setLoading(false)
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  useEffect(() => {
    if (!restaurant?.id) return

    const channel = supabase
      .channel(`requests:${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          const row = payload.new as RequestRow
          if (row.status === 'waiting') {
            setWaiting((prev) => [row, ...prev])
            ding()
          } else {
            setHistory((prev) => [row, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          const row = payload.new as RequestRow
          setWaiting((prev) => prev.filter((x) => x.id !== row.id))
          setHistory((prev) => [row, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id, soundUnlocked])

  async function complete(id: string) {
    const { error } = await supabase
      .from('requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) alert(error.message)
  }

  if (loading) {
    return (
      <div style={bgStyle}>
        <div style={{ maxWidth: 820, margin: '0 auto', ...card }}>
          <div style={{ opacity: 0.7, fontSize: 13 }}>Panel</div>
          <div style={{ fontSize: 34, fontWeight: 900, marginTop: 6 }}>Yükleniyor…</div>
        </div>
      </div>
    )
  }

  if (err || !restaurant) {
    return (
      <div style={bgStyle}>
        <div style={{ maxWidth: 820, margin: '0 auto', ...card }}>
          <div style={{ opacity: 0.7, fontSize: 13 }}>Panel</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>Hata</div>
          <div style={{ marginTop: 10, opacity: 0.85 }}>{err || 'Bilinmeyen hata'}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={bgStyle}>
      <audio ref={audioRef} src="/ding.wav" preload="auto" />

      <div style={{ maxWidth: 920, margin: '0 auto', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Panel</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{restaurant.name}</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
              Şu an (TR): {formatTRNow()}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={unlockSound}
              style={{
                borderRadius: 14,
                padding: '10px 14px',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 900,
              }}
            >
              Sesi Aç 🔊
            </button>

            <button
              onClick={() => loadAll()}
              style={{
                borderRadius: 14,
                padding: '10px 14px',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 900,
              }}
            >
              Yenile ↻
            </button>
          </div>
        </div>

        <div style={{ ...card }}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
            Bekleyen İstekler ({waiting.length})
          </div>

          {waiting.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Şu an bekleyen istek yok.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {waiting.map((r) => (
                <div
                  key={r.id}
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>
                      Masa {r.table_number} • {labelType(r.request_type)}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                      {formatTR(r.created_at)}
                    </div>
                  </div>

                  <button
                    onClick={() => complete(r.id)}
                    style={{
                      borderRadius: 14,
                      padding: '10px 14px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.10)',
                      color: '#fff',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Tamamlandı ✅
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...card }}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Geçmiş</div>
          {history.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Henüz geçmiş kayıt yok.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {history.slice(0, 50).map((r) => (
                <div
                  key={r.id}
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    Masa {r.table_number} • {labelType(r.request_type)} • {r.status}
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                    {formatTR(r.created_at)}
                    {r.completed_at ? ` → ${formatTR(r.completed_at)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}