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
  created_at?: string
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const appUrl =
    (process.env.NEXT_PUBLIC_APP_URL || 'https://qr-call.vercel.app').replace(/\/$/, '')

  const token = (panelToken || '').trim()

  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0))
  }, [tables])

  async function loadAll() {
    setLoading(true)
    setError(null)

    // Restaurant'ı panel_token ile bul
    const { data: r, error: rErr } = await supabase
      .from('restaurants')
      .select('id,name,panel_token')
      .eq('panel_token', token)
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
      setError('Restaurant bulunamadı (panel token yanlış olabilir).')
      setLoading(false)
      return
    }

    setRestaurant(r)

    const { data: t, error: tErr } = await supabase
      .from('restaurant_tables')
      .select('id,restaurant_id,table_number,table_token,is_active,created_at')
      .eq('restaurant_id', r.id)
      .order('table_number', { ascending: true })

    if (tErr) {
      setTables([])
      setError(tErr.message)
      setLoading(false)
      return
    }

    setTables((t ?? []) as TableRow[])
    setLoading(false)
  }

  async function addNextTable() {
    if (adding) return
    setAdding(true)
    setError(null)

    // ÖNEMLİ: param adı p_panel_token olmalı
    const { data, error: rpcErr } = await supabase.rpc('add_next_table_by_panel', {
      p_panel_token: token,
    })

    if (rpcErr) {
      setError(rpcErr.message)
      setAdding(false)
      return
    }

    const inserted = Array.isArray(data) ? data[0] : data
    if (inserted?.id) {
      setTables((prev) => [
        ...prev,
        {
          id: inserted.id,
          restaurant_id: inserted.restaurant_id,
          table_number: Number(inserted.table_number),
          table_token: String(inserted.table_token),
          is_active: inserted.is_active ?? true,
          created_at: inserted.created_at,
        },
      ])
    } else {
      await loadAll()
    }

    setAdding(false)
  }

  function qrLink(tableToken: string) {
    return `${appUrl}/t/${tableToken}`
  }

  function qrImgUrl(tableToken: string) {
    const link = encodeURIComponent(qrLink(tableToken))
    return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${link}`
  }

  async function downloadQr(tableToken: string, tableNumber: number) {
    try {
      const url = qrImgUrl(tableToken)
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `masa-${tableNumber}-qr.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch (e: any) {
      setError(e?.message || 'QR indirilemedi.')
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="rounded-3xl bg-[#0b1220]/95 p-6 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Masalar</h1>
            <div className="mt-1 text-sm text-white/60">
              {loading ? 'Yükleniyor…' : restaurant ? restaurant.name : '—'}
            </div>
          </div>

          <button
            onClick={addNextTable}
            disabled={loading || adding || !restaurant}
            className="rounded-2xl bg-white/10 px-5 py-4 text-base font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {adding ? 'Ekleniyor…' : 'Masa Ekle (+1)'}
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-white/5 p-6 text-white/70">Yükleniyor…</div>
          ) : sortedTables.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-6 text-white/70">Henüz masa yok.</div>
          ) : (
            <div className="space-y-3">
              {sortedTables.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-white">
                    <div className="text-lg font-semibold">Masa {t.table_number}</div>
                    <div className="mt-1 break-all text-xs text-white/50">{t.table_token}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={qrLink(t.table_token)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
                    >
                      Müşteri Linki
                    </a>

                    <a
                      href={qrImgUrl(t.table_token)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
                    >
                      QR Görüntüle
                    </a>

                    <button
                      onClick={() => downloadQr(t.table_token, t.table_number)}
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
                    >
                      QR İndir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={loadAll}
          className="mt-6 w-full rounded-2xl bg-white/10 px-5 py-4 text-base font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
        >
          Yenile
        </button>
      </div>
    </div>
  )
}