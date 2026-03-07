'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type CategoryRow = {
  id: string
  restaurant_id: string
  name: string
  sort_order: number
  is_active: boolean
}

export default function MenuClient({ panelToken }: { panelToken: string }) {
  const DEMO_RESTAURANT_ID = '2d0e88c2-7835-4a1b-86fe-e28e44f0b87d'
  const DEMO_RESTAURANT_NAME = 'Casita Nişantaşı'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<CategoryRow[]>([])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('id, restaurant_id, name, sort_order, is_active')
        .eq('restaurant_id', DEMO_RESTAURANT_ID)
        .order('sort_order', { ascending: true })

      if (error) throw error

      setCategories((data || []) as CategoryRow[])
    } catch (e: any) {
      setError(e?.message || 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [panelToken])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 20 }}>
      <div
        style={{
          borderRadius: 28,
          padding: 20,
          background:
            'radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(180deg, #0b1220 0%, #060a12 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: '#fff',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 36, fontWeight: 800 }}>Menü Yönetimi</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            {DEMO_RESTAURANT_NAME}
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 16,
              padding: 14,
              border: '1px solid rgba(255,100,100,0.35)',
              background: 'rgba(255,100,100,0.12)',
              color: '#ffd5d5',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>Yükleniyor…</div>
        ) : (
          <div
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.06)',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                    {cat.name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                    Sıra: {cat.sort_order} • {cat.is_active ? 'Aktif' : 'Pasif'}
                  </div>
                </div>

                <div
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontWeight: 600,
                  }}
                >
                  Hazır
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}