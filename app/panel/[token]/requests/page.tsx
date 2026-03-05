'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
  // TR saat/tarih: 04.03.2026 22:37
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

function statusLabel(s: string) {
  if (s === 'waiting') return 'Bekliyor'
  if (s === 'completed') return 'Tamamlandı'
  return s
}

export default function RequestsPage({ params }: { params: { token: string } }) {
  const panelToken = params.token

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Ses
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevCountRef = useRef<number>(0)

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

  async function loadRestaurantAndRequests() {
    setLoading(true)
    setErrorMsg(null)

    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id, name, panel_token')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr || !r) {
      setRestaurant(null)
      setRows([])
      setLoading(false)
      setErrorMsg('Panel bulunamadı (restaurant yok).')
      return
    }

    setRestaurant(r as Restaurant)

    const { data: reqs, error: qErr } = await supabase
      .from('requests')
      .select('id, restaurant_id, table_number, request_type, status, created_at')
      .eq('restaurant_id', r.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (qErr) {
      setRows([])
      setLoading