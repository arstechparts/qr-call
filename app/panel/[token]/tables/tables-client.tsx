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
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])

  const [qrOpen, setQrOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [qrTitle, setQrTitle] = useState('')

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://qr-call.vercel.app'

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => a.table_number - b.table_number)
  }, [tables])

  async function loadAll() {
    setLoading(true)
    setError(null)

    // 1) Restaurant'ı panel_token ile bul
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
      setError('Restaurant bulunamadı (panel token yanlış olabilir).')
      setLoading(false)
      return
    }

    setRestaurant(r as RestaurantRow)

    // 2) Masaları restaurant_id ile çek
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

    setTables((t || []) as TableRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelToken])

  async function addNextTable() {
    setAdding(true)
    setError(null)

    // RPC: Supabase SQL’de oluşturduğumuz fonksiyon
    const { data, error: rpcErr } = await supabase.rpc('add_next_table_by_panel', {
      p_panel_token: panelToken,
    })

    if (rpcErr) {
      setError(rpcErr.message)
      setAdding(false)
      return
    }

    // data: yeni eklenen satır
    const row = data as TableRow
    setTables((prev) => {
      const next = [row, ...prev]
      next.sort((a, b) => a.table_number - b.table_number)
      return next
    })

    setAdding(false)
  }

  function openQrForTable(t: TableRow) {
    const url = `${baseUrl}/t/${t.table_token}`
    setQrUrl(url)
    setQrTitle(`Masa ${t.table_number}`)
    setQrOpen(true)
  }

  function downloadQrPng() {
    // Dış servisle QR PNG (paket kurmadan)
    const pngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(
      qrUrl
    )}`

    const a = document.createElement('a')
    a.href = pngUrl
    a.download = `${qrTitle.replace(/\s+/g, '_')}_qr.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="rounded-3xl p-6 bg-[rgba(15,23,42,0.55)] border border-white/10 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-3xl font-bold text-white">Masalar</div>
            {restaurant ? (
              <div className="text-white/70 mt-1">{restaurant.name}</div>
            ) : (
              <div className="text-white/50 mt-1">{loading ? 'Yükleniyor…' : '—'}</div>
            )}
          </div>

          <button
            onClick={addNextTable}
            disabled={adding}
            className={`px-5 py-3 rounded-2xl font-semibold text-white transition
              ${adding ? 'bg-white/10 opacity-60' : 'bg-white/10 hover:bg-white/15'}
            `}
          >
            {adding ? 'Ekleniyor…' : 'Masa Ekle (+1)'}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-100 p-4">
            {error}
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-4 text-white/70">Yükleniyor…</div>
          ) : sortedTables.length === 0 ? (
            <div className="p-4 text-white/70">Henüz masa yok.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {sortedTables.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="text-white font-semibold">Masa {t.table_number}</div>

                  <button
                    onClick={() => openQrForTable(t)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
                  >
                    QR Görüntüle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR MODAL */}
      {qrOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-slate-950 border border-white/10 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white text-xl font-bold">{qrTitle}</div>
                <div className="text-white/60 text-sm break-all mt-1">{qrUrl}</div>
              </div>
              <button
                onClick={() => setQrOpen(false)}
                className="text-white/70 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-3">
              <img
                alt="QR"
                className="w-full h-auto"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
                  qrUrl
                )}`}
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={downloadQrPng}
                className="flex-1 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                QR İndir
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(qrUrl)}
                className="flex-1 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Link Kopyala
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}