'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RestaurantRow = {
  id: string
  name: string
  instagram_url: string | null
  panel_token: string | null
  is_active: boolean | null
  created_at: string
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<RestaurantRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tableCount, setTableCount] = useState('34')

  const [editName, setEditName] = useState('')
  const [editInstagram, setEditInstagram] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, instagram_url, panel_token, is_active, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRows((data || []) as RestaurantRow[])
    } catch (e: any) {
      setError(e?.message || 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function createUuid() {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async function createRestaurant() {
    if (!name.trim()) {
      alert('Restoran adı zorunlu')
      return
    }

    const count = Number(tableCount)

    if (!Number.isInteger(count) || count < 1) {
      alert('Masa sayısı en az 1 olmalı')
      return
    }

    setSaving(true)
    setError('')

    try {
      const panelToken = createUuid()

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: name.trim(),
          instagram_url: instagramUrl.trim() || null,
          panel_token: panelToken,
          is_active: true,
        })
        .select('id, name, instagram_url, panel_token, is_active, created_at')
        .single()

      if (restaurantError) throw restaurantError

      const restaurantId = restaurant.id

      const tablesToInsert = Array.from({ length: count }, (_, i) => ({
        restaurant_id: restaurantId,
        table_number: i + 1,
        table_token: createUuid(),
        is_active: true,
      }))

      const { error: tablesError } = await supabase
        .from('restaurant_tables')
        .insert(tablesToInsert)

      if (tablesError) throw tablesError

      const defaultCategories = [
        'Başlangıçlar',
        'Çorbalar',
        'Hamur İşleri',
        'Ana Yemekler',
        'Kiloluk Ürünler',
        'Salatalar',
        'İçecekler',
        'Tatlılar',
      ]

      const categoriesToInsert = defaultCategories.map((categoryName, index) => ({
        restaurant_id: restaurantId,
        name: categoryName,
        sort_order: index + 1,
        is_active: true,
      }))

      const { error: categoriesError } = await supabase
        .from('menu_categories')
        .insert(categoriesToInsert)

      if (categoriesError) throw categoriesError

      alert('Restoran oluşturuldu ✅')

      setName('')
      setInstagramUrl('')
      setTableCount('34')

      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Restoran oluşturulamadı')
    } finally {
      setSaving(false)
    }
  }

  function openPanel(panelToken?: string | null) {
    if (!panelToken) return
    window.open(`/panel/${panelToken}/requests`, '_blank')
  }

  function openEdit(row: RestaurantRow) {
    setEditingId(row.id)
    setEditName(row.name || '')
    setEditInstagram(row.instagram_url || '')
  }

  function closeEdit() {
    setEditingId(null)
    setEditName('')
    setEditInstagram('')
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) {
      alert('Restoran adı zorunlu')
      return
    }

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: editName.trim(),
          instagram_url: editInstagram.trim() || null,
        })
        .eq('id', id)

      if (error) throw error

      closeEdit()
      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Restoran güncellenemedi')
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
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
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 36, fontWeight: 800 }}>Admin Panel</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            Restoran yönetimi
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

        <div
          style={{
            borderRadius: 20,
            padding: 16,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            display: 'grid',
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800 }}>Yeni Restoran Ekle</div>

          <input
            placeholder="Restoran adı"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

          <input
            placeholder="Instagram linki"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
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

          <input
            placeholder="Başlangıç masa sayısı"
            value={tableCount}
            onChange={(e) => setTableCount(e.target.value)}
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

          <div>
            <button
              onClick={createRestaurant}
              disabled={saving}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                background: '#22c55e',
                color: '#fff',
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Oluşturuluyor...' : 'Restoran Oluştur'}
            </button>
          </div>
        </div>

        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          {loading ? (
            <div style={{ padding: 16, color: 'rgba(255,255,255,0.7)' }}>Yükleniyor…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 16, color: 'rgba(255,255,255,0.7)' }}>
              Henüz restoran yok
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                style={{
                  padding: '14px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                {editingId === row.id ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <input
                      placeholder="Restoran adı"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
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

                    <input
                      placeholder="Instagram linki"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
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

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => saveEdit(row.id)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: 'none',
                          background: '#22c55e',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Kaydet
                      </button>

                      <button
                        onClick={closeEdit}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                        {row.name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                        {row.is_active ? 'Aktif' : 'Pasif'}
                      </div>
                      {row.instagram_url ? (
                        <div style={{ color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                          {row.instagram_url}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openEdit(row)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Düzenle
                      </button>

                      <button
                        onClick={() => openPanel(row.panel_token)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Paneli Aç
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}