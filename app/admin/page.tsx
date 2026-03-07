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

    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })

    setRows((data || []) as RestaurantRow[])
    setLoading(false)
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
    const panelToken = createUuid()

    const { data: restaurant } = await supabase
      .from('restaurants')
      .insert({
        name,
        instagram_url: instagramUrl || null,
        panel_token: panelToken,
        is_active: true,
      })
      .select()
      .single()

    const restaurantId = restaurant.id

    const tables = Array.from({ length: Number(tableCount) }, (_, i) => ({
      restaurant_id: restaurantId,
      table_number: i + 1,
      table_token: createUuid(),
      is_active: true,
    }))

    await supabase.from('restaurant_tables').insert(tables)

    const categories = [
      'Başlangıçlar',
      'Çorbalar',
      'Hamur İşleri',
      'Ana Yemekler',
      'Kiloluk Ürünler',
      'Salatalar',
      'İçecekler',
      'Tatlılar',
    ]

    const cats = categories.map((c, i) => ({
      restaurant_id: restaurantId,
      name: c,
      sort_order: i + 1,
      is_active: true,
    }))

    await supabase.from('menu_categories').insert(cats)

    setName('')
    setInstagramUrl('')
    setTableCount('34')

    loadData()
  }

  function openPanel(token?: string | null) {
    if (!token) return
    window.open(`/panel/${token}/requests`, '_blank')
  }

  async function toggleActive(row: RestaurantRow) {
    await supabase
      .from('restaurants')
      .update({ is_active: !row.is_active })
      .eq('id', row.id)

    loadData()
  }

  async function deleteRestaurant(id: string) {
    const ok = confirm('Restoranı silmek istediğine emin misin?')

    if (!ok) return

    await supabase.from('restaurants').delete().eq('id', id)

    loadData()
  }

  async function regenerateToken(id: string) {
    const newToken = createUuid()

    await supabase
      .from('restaurants')
      .update({ panel_token: newToken })
      .eq('id', id)

    alert('Panel token değişti')

    loadData()
  }

  function openEdit(row: RestaurantRow) {
    setEditingId(row.id)
    setEditName(row.name)
    setEditInstagram(row.instagram_url || '')
  }

  function closeEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    await supabase
      .from('restaurants')
      .update({
        name: editName,
        instagram_url: editInstagram || null,
      })
      .eq('id', id)

    setEditingId(null)

    loadData()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>Admin Panel</h1>

      <div style={{ marginTop: 20 }}>
        <input
          placeholder="Restoran adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Instagram"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
        />

        <input
          placeholder="Masa sayısı"
          value={tableCount}
          onChange={(e) => setTableCount(e.target.value)}
        />

        <button onClick={createRestaurant}>Restoran Oluştur</button>
      </div>

      <div style={{ marginTop: 40 }}>
        {loading ? (
          <div>Yükleniyor</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} style={{ marginBottom: 20 }}>
              {editingId === row.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />

                  <input
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                  />

                  <button onClick={() => saveEdit(row.id)}>Kaydet</button>
                  <button onClick={closeEdit}>Vazgeç</button>
                </>
              ) : (
                <>
                  <h3>{row.name}</h3>

                  <button onClick={() => openPanel(row.panel_token)}>
                    Panel
                  </button>

                  <button onClick={() => openEdit(row)}>Düzenle</button>

                  <button onClick={() => toggleActive(row)}>
                    {row.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                  </button>

                  <button onClick={() => regenerateToken(row.id)}>
                    Panel Şifresi Değiş
                  </button>

                  <button onClick={() => deleteRestaurant(row.id)}>
                    Sil
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}