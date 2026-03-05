'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RestaurantRow = {
  id: string
  name: string
  panel_token: string | null
}

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  is_active: boolean
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://qr-call.vercel.app'

  const RANGE_MIN = 1
  const RANGE_MAX = 34

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])

  const [qrOpen, setQrOpen] = useState(false)
  const [qrTitle, setQrTitle] = useState('')
  const [qrLink, setQrLink] = useState('')
  const [qrImg, setQrImg] = useState('')

  const numbers = useMemo(() => {
    const arr: number[] = []
    for (let i = RANGE_MIN; i <= RANGE_MAX; i++) arr.push(i)
    return arr
  }, [])

  const tableByNumber = useMemo(() => {
    const m = new Map<number, TableRow>()
    for (const t of tables) m.set(t.table_number, t)
    return m
  }, [tables])

  const missingNumbers = useMemo(() => {
    return numbers.filter((n) => !tableByNumber.has(n))
  }, [numbers, tableByNumber])

  async function loadAll() {
    setLoading(true)
    setError(null)

    // 1) Restaurant'ı panel token ile bul
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,name,panel_token')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (rErr) {
      setRestaurant(null)
      setTables([])
      setError(rErr.message)
      setLoading(false)
      return
    }

    if (!r) {
      setRestaurant(null)
      setTables([])
      // Bu mesajı ekranda göstermiyoruz (kafanı karıştırmasın), sadece butonu kilitleyeceğiz.
      setError(null)
      setLoading(false)
      return
    }

    setRestaurant(r as RestaurantRow)

    // 2) Mevcut masaları çek
    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id,restaurant_id,table_number,table_token,is_active')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (tErr) {
      setTables([])
      setError(tErr.message)
      setLoading(false)
      return
    }

    setTables((t as TableRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  function openQrModal(tableNumber: number, token: string) {
    const link = `${APP_URL}/t/${token}`
    const img = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(
      link
    )}`

    setQrTitle(`Masa ${tableNumber}`)
    setQrLink(link)
    setQrImg(img)
    setQrOpen(true)
  }

  async function downloadQr() {
    try {
      const res = await fetch(qrImg)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${qrTitle.replace(/\s+/g, '_')}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // iOS bazen indir yerine yeni sekmede açıyor, sorun değil:
      window.open(qrImg, '_blank')
    }
  }

  function newUuid(): string {
    // Browser UUID (DB extension derdi yok)
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    // Fallback
    return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
  }

  async function createTable(tableNumber: number) {
    if (!restaurant) return
    if (tableByNumber.has(tableNumber)) return

    setWorking(true)
    setError(null)

    const payload = {
      restaurant_id: restaurant.id,
      table_number: tableNumber,
      is_active: true,
      table_token: newUuid(),
    }

    const { data, error: insErr } = await supabase
      .from('restaurant_tables')
      .insert(payload)
      .select('id,restaurant_id,table_number,table_token,is_active')
      .single()

    if (insErr) {
      setError(insErr.message)
      setWorking(false)
      return
    }

    setTables((prev) => {
      const next = [...prev, data as TableRow]
      next.sort((a, b) => a.table_number - b.table_number)
      return next
    })

    setWorking(false)
  }

  async function createNextMissing() {
    if (!restaurant) return
    const next = missingNumbers[0]
    if (!next) return
    await createTable(next)
  }

  const canUse = !!restaurant && !loading

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-2xl font-bold text-white/90">Masalar</div>
          <div className="text-white/50 text-sm">
            {restaurant ? `${restaurant.name}` : '—'}
          </div>
        </div>

        <button
          onClick={createNextMissing}
          disabled={!canUse || working || missingNumbers.length === 0}
          className={`px-4 py-3 rounded-2xl font-semibold transition
            ${
              !canUse || working || missingNumbers.length === 0
                ? 'bg-white/10 text-white/40'
                : 'bg-white/15 text-white hover:bg-white/20'
            }`}
        >
          Masa Ekle (1-{RANGE_MAX})
        </button>
      </div>

      {/* Error: sadece gerçek sistem hataları */}
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-100 px-4 py-3">
          {error}
        </div>
      ) : null}

      {/* Eğer restaurant yoksa: butonlar kilitli, ama hata yazdırmıyoruz */}
      {!restaurant && !loading ? (
        <div className="rounded-2xl bg-white/10 text-white/70 px-4 py-4">
          Panel token ile restoran eşleşmedi. (restaurants.tablosunda <b>panel_token</b> dolu
          olmalı)
        </div>
      ) : null}

      {/* List */}
      <div className