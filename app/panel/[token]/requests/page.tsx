'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

function trDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function typeLabel(t: string) {
  if (t === 'waiter') return 'Garson'
  if (t === 'bill') return 'Hesap'
  if (t === 'menu') return 'Menü'
  return t
}

export default function RequestsPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<ReqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const wrap = useMemo(
    () => ({
      minHeight: '100vh',
      padding: 16,
      background: '#0b1220',
      color: '#fff',
    }),
    []
  )

  // ding.wav public'de olmalı
  useEffect(() => {
    audioRef.current = new Audio('/ding.wav')
    audioRef.current.preload = 'auto'
  }, [])

  async function playDing() {
    try {
      if (!soundEnabled) return
      if (!audioRef.current) return
      audioRef.current.currentTime = 0
      await audioRef.current.play()
    } catch {
      // iOS bazen engeller (kullanıcı Sesi Aç'a basmadan)
    }
  }

  async function loadRequests(rid: string) {
    const { data, error } = await supabase
      .from('requests')
      .select('id, restaurant_id, table_number, request_type, status, created_at')
      .eq('restaurant_id', rid)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      setErr(error.message)
      return
    }
    setRows((data || []) as ReqRow[])
  }

  // 1) Restaurant'ı panel_token ile bul
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setErr(null)

      const { data: r, error: rErr } = await supabase
        .from('restaurants')
        .select('id, name, panel_token')
        .eq('panel_token', panelToken)
        .limit(1)
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
      await loadRequests(r.id)
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [panelToken])

  // 2) Realtime subscribe (anlık düşsün + ses çalsın)
  useEffect(() => {
    if (!restaurant?.id) return
    let alive = true

    const rid = restaurant.id

    const channel = supabase
      .channel(`requests-live-${rid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests', filter: `restaurant_id=eq.${rid}` },
        async () => {
          if (!alive) return
          await loadRequests(rid)
          await playDing()
        }
      )
      .subscribe()

    return () => {
      alive = false
      supabase.removeChannel(channel)
    }
    // soundEnabled değişince subscribe resetlemiyoruz, playDing zaten kontrol ediyor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id, soundEnabled])

  async function complete(id: string) {
    const { error } = await supabase.from('requests').update({ status: 'done' }).eq('id', id)
    if (error) alert(error.message)
    if (restaurant?.id) await loadRequests(restaurant.id)
  }

  if (loading) return <div style={wrap}>Yükleniyor…</div>

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <a href={`/panel/${panelToken}`} style={{ color: '#9bdcff' }}>
          Panel
        </a>
        <a href={`/panel/${panelToken}/tables`} style={{ color: '#9bdcff' }}>
          Masalar
        </a>

        <button
          onClick