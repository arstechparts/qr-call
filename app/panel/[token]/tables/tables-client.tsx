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
      // Restaurant yoksa ekranda gereksiz kırmızı hata basmayacağız.
      setRestaurant(null)
      setTables([])
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
      // iOS bazen indir yerine yeni sekmede açıyor
      window.open(qrImg, '_blank')
    }
  }

  function newUuid(): string {
    // DB extension istemiyoruz; tarayıcıdan UUID üret.
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
      .toString(16)
      .slice(2)}`
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
          <div className="text-white/50 text-sm">{restaurant ? restaurant.name : '—'}</div>
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

      {/* Gerçek sistem hataları */}
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-100 px-4 py-3">
          {error}
        </div>
      ) : null}

      {/* Restaurant yoksa bilgilendirme (kırmızı değil) */}
      {!restaurant && !loading ? (
        <div className="rounded-2xl bg-white/10 text-white/70 px-4 py-4">
          Panel token ile restoran eşleşmedi. <br />
          <span className="text-white/60 text-sm">
            (Supabase → <b>restaurants</b> tablosunda <b>panel_token</b> dolu olmalı)
          </span>
        </div>
      ) : null}

      {/* Liste */}
      <div className="rounded-3xl bg-white/10 border border-white/10 overflow-hidden">
        {loading ? (
          <div className="px-4 py-6 text-white/70">Yükleniyor...</div>
        ) : (
          <div>
            {numbers.map((n) => {
              const t = tableByNumber.get(n)

              return (
                <div
                  key={n}
                  className="flex items-center justify-between gap-3 px-4 py-4 border-b border-white/10"
                >
                  <div className="flex flex-col">
                    <div className="text-white font-semibold text-lg">Masa {n}</div>
                    <div className="text-white/50 text-sm">
                      {t ? 'Oluşturuldu' : 'Henüz oluşturulmadı'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {t ? (
                      <button
                        onClick={() => openQrModal(n, t.table_token)}
                        className="px-3 py-2 rounded-xl bg-white/15 text-white font-semibold hover:bg-white/20"
                      >
                        QR Görüntüle
                      </button>
                    ) : (
                      <button
                        onClick={() => createTable(n)}
                        disabled={!canUse || working}
                        className={`px-3 py-2 rounded-xl font-semibold transition
                          ${
                            !canUse || working
                              ? 'bg-white/10 text-white/40'
                              : 'bg-white/15 text-white hover:bg-white/20'
                          }`}
                      >
                        Oluştur
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#0b1220] border border-white/10 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-bold text-lg">{qrTitle}</div>
              <button
                className="text-white/70 hover:text-white px-2"
                onClick={() => setQrOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-white p-3 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImg} alt="QR" className="w-full h-auto" />
            </div>

            <div className="mt-3 text-white/70 text-xs break-all">{qrLink}</div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={downloadQr}
                className="flex-1 px-3 py-3 rounded-2xl bg-white/15 text-white font-semibold hover:bg-white/20"
              >
                QR İndir
              </button>

              <button
                onClick={() => window.open(qrLink, '_blank')}
                className="flex-1 px-3 py-3 rounded-2xl bg-white/15 text-white font-semibold hover:bg-white/20"
              >
                Link Aç
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}