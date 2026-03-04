'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Req = {
  id: string
  table_number: number
  status: string
  created_at: string
  request_type: string | null
}

type TableRow = {
  id: string
  table_number: number
  table_token: string
  is_active: boolean
  created_at: string
}

export default function PanelPage() {
  const [rows, setRows] = useState<Req[]>([])
  const [tables, setTables] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://qr-call.vercel.app'

  const fetchAll = async () => {
    setLoading(true)

    const a = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })

    if (a.error) console.error(a.error)
    setRows((a.data ?? []) as Req[])

    const b = await supabase
      .from('restaurant_tables')
      .select('id, table_number, table_token, is_active, created_at')
      .eq('is_active', true)
      .order('table_number', { ascending: true })

    if (b.error) console.error(b.error)
    setTables((b.data ?? []) as TableRow[])

    setLoading(false)
  }

  const markDone = async (id: string) => {
    const { error } = await supabase.from('requests').update({ status: 'completed' }).eq('id', id)
    if (error) {
      console.error(error)
      alert('Update hatası, console’a bak')
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Kopyalandı ✅')
    } catch {
      alert('Kopyalanamadı.')
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const tableLinks = useMemo(() => {
    return tables.map((t) => ({
      ...t,
      url: `${baseUrl}/t/${t.table_token}`,
    }))
  }, [tables, baseUrl])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 6 }}>📣 Canlı Çağrı Paneli</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>Bekleyen çağrılar + masa linkleri</div>

      <button onClick={fetchAll} style={{ marginBottom: 16 }}>
        Yenile
      </button>

      {loading && <p>Yükleniyor...</p>}

      {!loading && (
        <>
          <h2 style={{ marginTop: 18 }}>🧾 Masa Linkleri</h2>
          {tableLinks.length === 0 ? (
            <p style={{ opacity: 0.7 }}>Aktif masa yok.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {tableLinks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>Masa {t.table_number}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, wordBreak: 'break-all' }}>
                      {t.url}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => window.open(t.url, '_blank')}>Aç</button>
                    <button onClick={() => copy(t.url)}>Kopyala</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: 22 }}>⏳ Bekleyen Çağrılar</h2>
          {rows.length === 0 && <p>Şu an bekleyen yok ✅</p>}

          <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Masa {r.table_number}</div>
                  <div style={{ opacity: 0.8 }}>
                    Tip: {r.request_type ?? '-'} • {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>

                <button onClick={() => markDone(r.id)}>Completed</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
