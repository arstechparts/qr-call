'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Restaurant = {
  id: string
  name: string
  panel_token: string
}

type RequestRow = {
  id: string
  restaurant_id: string
  table_number: number
  request_type: 'waiter' | 'bill' | 'menu' | string
  status: 'waiting' | 'completed' | string
  created_at: string
}

function formatTR(dateIso: string) {
  const d = new Date(dateIso)
  const parts = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`
}

function requestTypeLabel(t: string) {
  if (t === 'waiter') return 'Garson Çağır'
  if (t === 'bill') return 'Hesap İste'
  if (t === 'menu') return 'Menü'
  return t
}

export default function RequestsPage({ params }: { params: { token: string } }) {
  const pathname = usePathname()

  // ✅ Bazen Next route/params karışınca token boş geliyor.
  // Bu yüzden URL’den de tokenı “fallback” alıyoruz.
  const tokenFromUrl = useMemo(() => {
    // /panel/<token>/requests
    const parts = (pathname ?? '').split('/').filter(Boolean)
    const i = parts.indexOf('panel')
    if (i >= 0 && parts[i + 1]) return parts[i + 1]
    return ''
  }, [pathname])

  const panelToken = (params?.token || tokenFromUrl || '').trim()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Ses
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevWaitingRef = useRef<number>(0)

  const pageStyle = useMemo(
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

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    padding: 14,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  }

  async function fetchRequests(restaurantId: string) {
    const { data, error } = await supabase
      .from('requests')
      .select('id, restaurant_id, table_number, request_type, status, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw new Error(error.message)
    return (data ?? []) as RequestRow[]
  }

  async function loadAll() {
    setLoading(true)
    setErrorMsg(null)

    if (!panelToken) {
      setRestaurant(null)
      setRows([])
      setLoading(false)
      setErrorMsg('Panel token bulunamadı. Linki token ile aç: /panel/<token>/requests')
      return
    }

    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id, name, panel_token')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr || !r) {
      setRestaurant(null)
      setRows([])
      setLoading(false)
      setErrorMsg(`Panel bulunamadı (restaurant yok). Token: ${panelToken}`)
      return
    }

    const rest = r as Restaurant
    setRestaurant(rest)

    try {
      const list = await fetchRequests(rest.id)
      setRows(list)
      prevWaitingRef.current = list.filter((x) => x.status === 'waiting').length
    } catch (e: any) {
      setRows([])
      setErrorMsg(e?.message ?? 'Requests çekilemedi')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  // ✅ Realtime + ✅ 3sn polling fallback (realtime kapalı olsa bile düşer)
  useEffect(() => {
    if (!restaurant?.id) return

    let alive = true

    const channel = supabase
      .channel(`requests-${restaurant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests', filter: `restaurant_id=eq.${restaurant.id}` },
        async () => {
          if (!alive) return
          const list = await fetchRequests(restaurant.id)
          setRows(list)

          const waitingCount = list.filter((x) => x.status === 'waiting').length
          if (soundEnabled && waitingCount > prevWaitingRef.current) {
            try {
              if (audioRef.current) {
                audioRef.current.currentTime = 0
                await audioRef.current.play()
              }
            } catch {}
          }
          prevWaitingRef.current = waitingCount
        }
      )
      .subscribe()

    const timer = setInterval(async () => {
      if (!alive) return
      try {
        const list = await fetchRequests(restaurant.id)
        setRows(list)

        const waitingCount = list.filter((x) => x.status === 'waiting').length
        if (soundEnabled && waitingCount > prevWaitingRef.current) {
          try {
            if (audioRef.current) {
              audioRef.current.currentTime = 0
              await audioRef.current.play()
            }
          } catch {}
        }
        prevWaitingRef.current = waitingCount
      } catch {}
    }, 3000)

    return () => {
      alive = false
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [restaurant?.id, soundEnabled])

  async function enableSound() {
    if (!audioRef.current) return
    try {
      audioRef.current.currentTime = 0
      await audioRef.current.play()
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setSoundEnabled(true)
      alert('Ses açıldı ✅')
    } catch {
      alert('iPhone ses engeli: tekrar dokunup deneyin.')
    }
  }

  async function complete(id: string) {
    const { error } = await supabase.from('requests').update({ status: 'completed' }).eq('id', id)
    if (error) alert(error.message)
  }

  const waiting = rows.filter((r) => r.status === 'waiting')
  const history = rows.filter((r) => r.status !== 'waiting')

  return (
    <div style={pageStyle}>
      <audio ref={audioRef} src="/ding.wav" preload="auto" />

      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>Panel Token</div>
            <div style={{ fontSize: 14, fontWeight: 800, opacity: 0.9 }}>{panelToken || '(boş)'}</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
              {restaurant ? restaurant.name : 'Yükleniyor…'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={enableSound}
              style={{
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: soundEnabled ? 'rgba(46, 204, 113, 0.18)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {soundEnabled ? 'Ses Açık ✅' : 'Sesi Aç 🔊'}
            </button>

            <button
              onClick={loadAll}
              style={{
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              Yenile
            </button>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              borderRadius: 12,
              padding: 12,
              background: 'rgba(255, 0, 0, 0.10)',
              border: '1px solid rgba(255, 0, 0, 0.20)',
              color: '#ffd6d6',
              whiteSpace: 'pre-wrap',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href={panelToken ? `/panel/${panelToken}/tables` : '/panel'}
            style={{ color: '#fff', textDecoration: 'none' }}
          >
            ← Masalar
          </Link>
        </div>

        {loading ? (
          <div style={cardStyle}>Yükleniyor…</div>
        ) : (
          <>
            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
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
                        borderRadius: 14,
                        padding: 12,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>
                          Masa {r.table_number} · {requestTypeLabel(r.request_type)}
                        </div>
                        <div style={{ opacity: 0.75, marginTop: 4 }}>
                          {formatTR(r.created_at)}
                        </div>
                      </div>

                      <button
                        onClick={() => complete(r.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          height: 42,
                          fontWeight: 800,
                        }}
                      >
                        Tamamlandı
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
                Geçmiş ({history.length})
              </div>

              {history.length === 0 ? (
                <div style={{ opacity: 0.75 }}>Henüz geçmiş yok.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {history.slice(0, 50).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        borderRadius: 14,
                        padding: 12,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 900 }}>
                        Masa {r.table_number} · {requestTypeLabel(r.request_type)}
                      </div>
                      <div style={{ opacity: 0.7, marginTop: 4 }}>
                        {formatTR(r.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}