'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RestaurantRow = {
  id: string
  name: string
  panel_token: string
}

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  table_token: string
  is_active: boolean
  created_at: string
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])

  const [qrOpen, setQrOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState<string>('')

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://qr-call.vercel.app'

  const loadAll = async () => {
    setLoading(true)
    setErrorMsg(null)

    // 1) Restaurant bul (panel_token ile)
    const r = await supabase
      .from('restaurants')
      .select('id,name,panel_token')
      .eq('panel_token', panelToken)
      .maybeSingle()

    if (r.error) {
      setRestaurant(null)
      setTables([])
      setErrorMsg(r.error.message)
      setLoading(false)
      return
    }

    if (!r.data) {
      setRestaurant(null)
      setTables([])
      setErrorMsg('Restaurant bulunamadı (panel token yanlış olabilir).')
      setLoading(false)
      return
    }

    setRestaurant(r.data)

    // 2) Masaları çek
    const t = await supabase
      .from('restaurant_tables')
      .select('id,restaurant_id,table_number,table_token,is_active,created_at')
      .eq('restaurant_id', r.data.id)
      .order('table_number', { ascending: true })

    if (t.error) {
      setTables([])
      setErrorMsg(t.error.message)
      setLoading(false)
      return
    }

    setTables((t.data ?? []) as any)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  const openQr = (tableToken: string) => {
    const url = `${appUrl}/t/${tableToken}`
    setQrUrl(url)
    setQrOpen(true)
  }

  const downloadQr = async (tableToken: string, tableNumber: number) => {
    const url = `${appUrl}/t/${tableToken}`
    const imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
      url
    )}`

    const res = await fetch(imgSrc)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `masa-${tableNumber}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
  }

  const addNextTable = async () => {
    if (!panelToken) return
    setAdding(true)
    setErrorMsg(null)

    // RPC param adı SQL’deki ile aynı olmalı: p_panel_token
    const { data, error } = await supabase.rpc('add_next_table_by_panel', {
      p_panel_token: panelToken,
    })

    if (error) {
      setErrorMsg(error.message)
      setAdding(false)
      return
    }

    // insert başarılı -> yeniden yükle
    await loadAll()
    setAdding(false)

    // otomatik yeni ekleneni QR açmak istersen:
    // if (Array.isArray(data) && data[0]?.table_token) openQr(data[0].table_token)
  }

  const title = useMemo(() => {
    if (loading) return 'Yükleniyor...'
    if (!restaurant) return 'Masalar'
    return `Masalar`
  }, [loading, restaurant])

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-3xl bg-[#0b1220] p-6 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-3xl font-semibold">{title}</div>
              {restaurant ? (
                <div className="mt-1 text-white/70 text-sm">
                  {restaurant.name}
                </div>
              ) : null}
            </div>

            <button
              onClick={addNextTable}
              disabled={adding || loading || !restaurant}
              className="rounded-2xl px-5 py-3 font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-40"
            >
              {adding ? 'Ekleniyor...' : 'Masa Ekle (+1)'}
            </button>
          </div>

          {errorMsg ? (
            <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-100">
              {errorMsg}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {tables.length === 0 ? (
              <div className="rounded-2xl bg-white/5 p-4 text-white/70">
                Henüz masa yok.
              </div>
            ) : (
              tables.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-4"
                >
                  <div>
                    <div className="text-lg font-semibold">Masa {t.table_number}</div>
                    <div className="text-xs text-white/60 break-all">
                      {t.table_token}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openQr(t.table_token)}
                      className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15"
                    >
                      QR Görüntüle
                    </button>

                    <button
                      onClick={() => downloadQr(t.table_token, t.table_number)}
                      className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15"
                    >
                      QR İndir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QR Modal */}
        {qrOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">QR</div>
                <button
                  onClick={() => setQrOpen(false)}
                  className="rounded-lg px-3 py-1 bg-black/5"
                >
                  Kapat
                </button>
              </div>

              <div className="mt-3 rounded-xl bg-black/5 p-3">
                <img
                  alt="QR"
                  className="w-full rounded-lg"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
                    qrUrl
                  )}`}
                />
              </div>

              <div className="mt-3 text-xs break-all text-black/70">{qrUrl}</div>

              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(qrUrl)
                }}
                className="mt-3 w-full rounded-xl px-4 py-2 bg-black text-white"
              >
                Linki Kopyala
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}