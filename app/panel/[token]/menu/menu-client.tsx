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

type ItemForm = {
  name: string
  description: string
  price: string
}

export default function MenuClient({ panelToken }: { panelToken: string }) {
  const DEMO_RESTAURANT_ID = '2d0e88c2-7835-4a1b-86fe-e28e44f0b87d'
  const DEMO_RESTAURANT_NAME = 'Casita Nişantaşı'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)

  const [form, setForm] = useState<ItemForm>({
    name: '',
    description: '',
    price: '',
  })

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

  function openForm(categoryId: string) {
    setOpenCategoryId(categoryId)
    setForm({
      name: '',
      description: '',
      price: '',
    })
  }

  function closeForm() {
    setOpenCategoryId(null)
    setForm({
      name: '',
      description: '',
      price: '',
    })
  }

  async function addItem(categoryId: string) {
    if (!form.name.trim()) {
      alert('Ürün adı zorunlu')
      return
    }

    if (!form.price.trim()) {
      alert('Fiyat zorunlu')
      return
    }

    const numericPrice = Number(String(form.price).replace(',', '.'))

    if (Number.isNaN(numericPrice)) {
      alert('Fiyat sayı olmalı')
      return
    }

    setSaving(categoryId)
    setError('')

    try {
      const { data: lastItem } = await supabase
        .from('menu_items')
        .select('sort_order')
        .eq('restaurant_id', DEMO_RESTAURANT_ID)
        .eq('category_id', categoryId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextSort = (lastItem?.sort_order || 0) + 1

      const { error } = await supabase.from('menu_items').insert({
        restaurant_id: DEMO_RESTAURANT_ID,
        category_id: categoryId,
        name: form.name.trim(),
        description: form.description.trim(),
        price: numericPrice,
        sort_order: nextSort,
        is_active: true,
      })

      if (error) throw error

      alert('Ürün eklendi ✅')
      closeForm()
    } catch (e: any) {
      setError(e?.message || 'Ürün eklenemedi')
    } finally {
      setSaving(null)
    }
  }

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
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
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

                  <button
                    onClick={() =>
                      openCategoryId === cat.id ? closeForm() : openForm(cat.id)
                    }
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {openCategoryId === cat.id ? 'Kapat' : 'Ürün Ekle'}
                  </button>
                </div>

                {openCategoryId === cat.id ? (
                  <div
                    style={{
                      padding: '0 16px 16px 16px',
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 16,
                        padding: 14,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      <input
                        placeholder="Ürün adı"
                        value={form.name}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          outline: 'none',
                        }}
                      />

                      <textarea
                        placeholder="Açıklama"
                        value={form.description}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />

                      <input
                        placeholder="Fiyat"
                        value={form.price}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, price: e.target.value }))
                        }
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          outline: 'none',
                        }}
                      />

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => addItem(cat.id)}
                          disabled={saving === cat.id}
                          style={{
                            padding: '10px 16px',
                            borderRadius: 12,
                            border: 'none',
                            background: '#22c55e',
                            color: '#fff',
                            fontWeight: 800,
                            cursor: saving === cat.id ? 'not-allowed' : 'pointer',
                            opacity: saving === cat.id ? 0.7 : 1,
                          }}
                        >
                          {saving === cat.id ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>

                        <button
                          onClick={closeForm}
                          style={{
                            padding: '10px 16px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}