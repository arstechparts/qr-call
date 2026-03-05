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
  created_at?: string
}

export default function TablesClient({ panelToken }: { panelToken: string }) {
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [working, setWorking] = useState<boolean>(false)

  const tokenSafe = panelToken?.trim() || ''

  // ✅ Token’ı sakla (menü token’sız sayfaya düşerse geri yönlendirmek için)
  useEffect(() => {
    if (tokenSafe) localStorage.setItem('last_panel_token', tokenSafe)
  }, [tokenSafe])

  // 1..34 sabit liste
  const allNumbers = useMemo(() => Array.from({ length: 34 }, (_, i) => i + 1), [])

  const tableByNumber = useMemo(() => {
    const m = new Map<number, TableRow>()
    for (const t of tables) m.set(t.table_number, t)
    return m
  }, [tables])

  async function loadAll() {
    setLoading(true)
    setError('')

    try {
      if (!tokenSafe) {
        setRestaurant(null)
        setTables([])
        setError('Panel token gelmedi (URL yanlış olabilir).')
        return
      }

      // Restaurant bul
      const r = await supabase
        .from('restaurants')
        .select('id,name,panel_token')
        .eq('panel_token', tokenSafe)
        .maybeSingle()

      if (r.error) throw r.error

      if (!r.data) {
        setRestaurant(null)
        setTables([])
        setError('Restaurant bulunamadı (panel token yanlış olabilir).')
        return
      }

      setRestaurant(r.data as RestaurantRow)

      // Masaları çek
      const t = await supabase
        .from('restaurant_tables')
        .select('id,restaurant_id,table_number,table_token,is_active,created_at')
        .eq('restaurant_id', r.data.id)
        .order('table_number', { ascending: true })

      if (t.error) throw t.error

      setTables((t.data ?? []) as TableRow[])
    } catch (e: any) {
      setError(e?.message || 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenSafe])

  // Tek masa oluştur
  async function createTable(tableNumber: number) {
    if (!restaurant) return

    setWorking(true)
    setError('')

    try {
      if (tableByNumber.get(tableNumber)) return

      const { error } = await supabase.from('restaurant_tables').insert({
        restaurant_id: restaurant.id,
        table_number: tableNumber,
        is_active: true,
      })

      if (error) throw error

      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Masa oluşturulamadı')
    } finally {
      setWorking(false)
    }
  }

  // Eksik 1..34 oluştur
  async function ensureAllTables() {
    if (!restaurant) return

    setWorking(true)
    setError('')

    try {
      const missing = allNumbers.filter((n) => !tableByNumber.get(n))

      for (const n of missing) {
        // eslint-disable-next-line no-await-in-loop
        await createTable(n)
      }
    } finally {
      setWorking(false)
    }
  }

  function openQr(tableToken: string) {
    const url = `${window.location.origin}/t/${tableToken}`
    window.open(url, '_blank')
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-6">
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-4xl font-bold text-white">Masalar</div>
            <div className="mt-1 text-sm text-white/50">
              {loading ? 'Yükleniyor…' : restaurant ? restaurant.name : '—'}
            </div>
          </div>

          <button
            onClick={ensureAllTables}
            disabled={!restaurant || working || loading}
            className="rounded-2xl bg-white/10 px-5 py-3 text-white ring-1 ring-white/10 disabled:opacity-40"
          >
            Masa Ekle (1-34)
          </button>
        </div>

        {/* HATA */}
        {!!error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
            {error}
          </div>
        )}

        {/* MASA LİSTESİ */}
        <div className="mt-5 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          {allNumbers.map((n) => {
            const row = tableByNumber.get(n)

            return (
              <div
                key={n}
                className="flex items-center justify-between border-b border-white/10 px-5 py-4"
              >
                <div>
                  <div className="text-xl font-bold text-white">Masa {n}</div>
                  <div className="text-sm text-white/60">
                    {row ? 'Oluşturuldu' : 'Henüz oluşturulmadı'}
                  </div>
                </div>

                {row ? (
                  <button
                    onClick={() => openQr(row.table_token)}
                    className="rounded-xl bg-white/10 px-4 py-2 text-white"
                  >
                    QR Görüntüle
                  </button>
                ) : (
                  <button
                    onClick={() => createTable(n)}
                    disabled={!restaurant || working || loading}
                    className="rounded-xl bg-white/10 px-4 py-2 text-white disabled:opacity-40"
                  >
                    Oluştur
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={loadAll}
          className="mt-5 w-full rounded-2xl bg-white/10 px-5 py-4 text-white"
        >
          Yenile
        </button>
      </div>
    </div>
  )
}