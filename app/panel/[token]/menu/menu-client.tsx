'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RestaurantRow = {
  id: string
  name: string
  panel_token: string | null
  instagram_url?: string | null
  is_active?: boolean
}

type CategoryRow = {
  id: string
  restaurant_id: string
  name: string
  sort_order: number
  is_active: boolean
}

type MenuItemRow = {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  sort_order: number
  is_active: boolean
  image_url?: string | null
}

type ItemForm = {
  name: string
  description: string
  price: string
  file: File | null
}

export default function MenuClient({ panelToken }: { panelToken: string }) {
  const DEMO_RESTAURANT_ID = '2d0e88c2-7835-4a1b-86fe-e28e44f0b87d'
  const DEMO_RESTAURANT_NAME = 'Casita Nişantaşı'
  const BUCKET = 'menu-images'

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [items, setItems] = useState<MenuItemRow[]>([])
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingCategorySort, setEditingCategorySort] = useState('')

  const [form, setForm] = useState<ItemForm>({
    name: '',
    description: '',
    price: '',
    file: null,
  })

  const [editForm, setEditForm] = useState<ItemForm>({
    name: '',
    description: '',
    price: '',
    file: null,
  })

  async function resolveRestaurant() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, panel_token, instagram_url, is_active')
      .eq('panel_token', panelToken)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (data) {
      return data as RestaurantRow
    }

    return {
      id: DEMO_RESTAURANT_ID,
      name: DEMO_RESTAURANT_NAME,
      panel_token: panelToken || null,
      instagram_url: null,
      is_active: true,
    } as RestaurantRow
  }

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const resolvedRestaurant = await resolveRestaurant()
      setRestaurant(resolvedRestaurant)

      const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .select('id, restaurant_id, name, sort_order, is_active')
        .eq('restaurant_id', resolvedRestaurant.id)
        .order('sort_order', { ascending: true })

      if (catError) throw catError

      const { data: itemData, error: itemError } = await supabase
        .from('menu_items')
        .select(
          'id, restaurant_id, category_id, name, description, price, sort_order, is_active, image_url'
        )
        .eq('restaurant_id', resolvedRestaurant.id)
        .order('sort_order', { ascending: true })

      if (itemError) throw itemError

      setCategories((catData || []) as CategoryRow[])
      setItems((itemData || []) as MenuItemRow[])
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
      file: null,
    })
  }

  function closeForm() {
    setOpenCategoryId(null)
    setForm({
      name: '',
      description: '',
      price: '',
      file: null,
    })
  }

  function openEdit(item: MenuItemRow) {
    setEditingItemId(item.id)
    setEditForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      file: null,
    })
  }

  function closeEdit() {
    setEditingItemId(null)
    setEditForm({
      name: '',
      description: '',
      price: '',
      file: null,
    })
  }

  function openCategoryEdit(category: CategoryRow) {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
    setEditingCategorySort(String(category.sort_order))
  }

  function closeCategoryEdit() {
    setEditingCategoryId(null)
    setEditingCategoryName('')
    setEditingCategorySort('')
  }

  async function uploadImage(file: File) {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `products/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return data.publicUrl
  }

  async function addCategory() {
    if (!restaurant) return

    if (!newCategoryName.trim()) {
      alert('Kategori adı zorunlu')
      return
    }

    setSaving('new-category')
    setError('')

    try {
      const lastSort =
        categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order || 0)) : 0

      const { error } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurant.id,
        name: newCategoryName.trim(),
        sort_order: lastSort + 1,
        is_active: true,
      })

      if (error) throw error

      setNewCategoryName('')
      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Kategori eklenemedi')
    } finally {
      setSaving(null)
    }
  }

  async function updateCategory(categoryId: string) {
    if (!editingCategoryName.trim()) {
      alert('Kategori adı zorunlu')
      return
    }

    if (!editingCategorySort.trim()) {
      alert('Sıra zorunlu')
      return
    }

    const numericSort = Number(editingCategorySort)

    if (!Number.isInteger(numericSort) || numericSort < 1) {
      alert('Sıra en az 1 olan tam sayı olmalı')
      return
    }

    setSaving(categoryId)
    setError('')

    try {
      const { error } = await supabase
        .from('menu_categories')
        .update({
          name: editingCategoryName.trim(),
          sort_order: numericSort,
        })
        .eq('id', categoryId)

      if (error) throw error

      closeCategoryEdit()
      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Kategori güncellenemedi')
    } finally {
      setSaving(null)
    }
  }

  async function deleteCategory(category: CategoryRow) {
    const categoryItems = items.filter((item) => item.category_id === category.id)

    if (categoryItems.length > 0) {
      alert('Önce bu kategorideki ürünleri silmelisin')
      return
    }

    const ok = confirm(`"${category.name}" kategorisini silmek istiyor musun?`)
    if (!ok) return

    setSaving(category.id)
    setError('')

    try {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      if (openCategoryId === category.id) {
        closeForm()
      }

      if (editingCategoryId === category.id) {
        closeCategoryEdit()
      }

      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Kategori silinemedi')
    } finally {
      setSaving(null)
    }
  }

  async function addItem(categoryId: string) {
    if (!restaurant) return

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
        .eq('restaurant_id', restaurant.id)
        .eq('category_id', categoryId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextSort = (lastItem?.sort_order || 0) + 1

      let imageUrl: string | null = null
      if (form.file) {
        imageUrl = await uploadImage(form.file)
      }

      const { error } = await supabase.from('menu_items').insert({
        restaurant_id: restaurant.id,
        category_id: categoryId,
        name: form.name.trim(),
        description: form.description.trim(),
        price: numericPrice,
        sort_order: nextSort,
        is_active: true,
        image_url: imageUrl,
      })

      if (error) throw error

      alert('Ürün eklendi ✅')
      closeForm()
      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Ürün eklenemedi')
    } finally {
      setSaving(null)
    }
  }

  async function updateItem(item: MenuItemRow) {
    if (!editForm.name.trim()) {
      alert('Ürün adı zorunlu')
      return
    }

    if (!editForm.price.trim()) {
      alert('Fiyat zorunlu')
      return
    }

    const numericPrice = Number(String(editForm.price).replace(',', '.'))

    if (Number.isNaN(numericPrice)) {
      alert('Fiyat sayı olmalı')
      return
    }

    setSaving(item.id)
    setError('')

    try {
      let imageUrl = item.image_url || null

      if (editForm.file) {
        imageUrl = await uploadImage(editForm.file)
      }

      const { error } = await supabase
        .from('menu_items')
        .update({
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          price: numericPrice,
          image_url: imageUrl,
        })
        .eq('id', item.id)

      if (error) throw error

      alert('Ürün güncellendi ✅')
      closeEdit()
      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Ürün güncellenemedi')
    } finally {
      setSaving(null)
    }
  }

  async function deleteItem(itemId: string) {
    const ok = confirm('Bu ürünü silmek istediğine emin misin?')
    if (!ok) return

    setSaving(itemId)
    setError('')

    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
      if (error) throw error

      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Ürün silinemedi')
    } finally {
      setSaving(null)
    }
  }

  async function toggleItem(item: MenuItemRow) {
    setSaving(item.id)
    setError('')

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)

      if (error) throw error

      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Durum değiştirilemedi')
    } finally {
      setSaving(null)
    }
  }

  function itemsOf(categoryId: string) {
    return items.filter((item) => item.category_id === categoryId)
  }

  function formatPrice(price: number) {
    return `${Number(price).toFixed(2)} ₺`
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
            {loading ? 'Yükleniyor…' : restaurant ? restaurant.name : '—'}
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
          <div style={{ fontSize: 22, fontWeight: 800 }}>Kategori Ekle</div>

          <input
            placeholder="Yeni kategori adı"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
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
              onClick={addCategory}
              disabled={saving === 'new-category'}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: '#22c55e',
                color: '#fff',
                fontWeight: 800,
                cursor: saving === 'new-category' ? 'not-allowed' : 'pointer',
                opacity: saving === 'new-category' ? 0.7 : 1,
              }}
            >
              {saving === 'new-category' ? 'Ekleniyor...' : 'Kategori Ekle'}
            </button>
          </div>
        </div>

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
            {categories.map((cat) => {
              const categoryItems = itemsOf(cat.id)

              return (
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
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 220 }}>
                      {editingCategoryId === cat.id ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <input
                            placeholder="Kategori adı"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
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
                            placeholder="Sıra"
                            value={editingCategorySort}
                            onChange={(e) => setEditingCategorySort(e.target.value)}
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
                              onClick={() => updateCategory(cat.id)}
                              disabled={saving === cat.id}
                              style={{
                                padding: '10px 14px',
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
                              onClick={closeCategoryEdit}
                              style={{
                                padding: '10px 14px',
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
                      ) : (
                        <>
                          <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                            {cat.name}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                            Sıra: {cat.sort_order} • {cat.is_active ? 'Aktif' : 'Pasif'} • Ürün:{' '}
                            {categoryItems.length}
                          </div>
                        </>
                      )}
                    </div>

                    {editingCategoryId !== cat.id ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => openCategoryEdit(cat)}
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
                          Kategori Düzenle
                        </button>

                        <button
                          onClick={() => deleteCategory(cat)}
                          disabled={saving === cat.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 12,
                            border: 'none',
                            background: '#ef4444',
                            color: '#fff',
                            fontWeight: 800,
                            cursor: saving === cat.id ? 'not-allowed' : 'pointer',
                            opacity: saving === cat.id ? 0.7 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Kategori Sil
                        </button>

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
                    ) : null}
                  </div>

                  {openCategoryId === cat.id ? (
                    <div style={{ padding: '0 16px 16px 16px' }}>
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

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              file: e.target.files?.[0] || null,
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px 0',
                            color: '#fff',
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

                  {categoryItems.length > 0 ? (
                    <div style={{ padding: '0 16px 16px 16px', display: 'grid', gap: 10 }}>
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            borderRadius: 14,
                            padding: 14,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            display: 'grid',
                            gap: 12,
                          }}
                        >
                          {editingItemId === item.id ? (
                            <div style={{ display: 'grid', gap: 10 }}>
                              <input
                                placeholder="Ürün adı"
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
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
                                value={editForm.description}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                  }))
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
                                value={editForm.price}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    price: e.target.value,
                                  }))
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

                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    file: e.target.files?.[0] || null,
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  padding: '10px 0',
                                  color: '#fff',
                                }}
                              />

                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => updateItem(item)}
                                  disabled={saving === item.id}
                                  style={{
                                    padding: '10px 16px',
                                    borderRadius: 12,
                                    border: 'none',
                                    background: '#22c55e',
                                    color: '#fff',
                                    fontWeight: 800,
                                    cursor: saving === item.id ? 'not-allowed' : 'pointer',
                                    opacity: saving === item.id ? 0.7 : 1,
                                  }}
                                >
                                  {saving === item.id ? 'Kaydediliyor...' : 'Güncelle'}
                                </button>

                                <button
                                  onClick={closeEdit}
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
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: 16,
                              }}
                            >
                              <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    style={{
                                      width: 76,
                                      height: 76,
                                      objectFit: 'cover',
                                      borderRadius: 12,
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : null}

                                <div>
                                  <div
                                    style={{
                                      color: '#fff',
                                      fontWeight: 800,
                                      fontSize: 18,
                                    }}
                                  >
                                    {item.name}
                                  </div>

                                  {item.description ? (
                                    <div
                                      style={{
                                        color: 'rgba(255,255,255,0.72)',
                                        marginTop: 6,
                                        fontSize: 14,
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {item.description}
                                    </div>
                                  ) : null}

                                  <div
                                    style={{
                                      color: 'rgba(255,255,255,0.5)',
                                      marginTop: 8,
                                      fontSize: 13,
                                    }}
                                  >
                                    Sıra: {item.sort_order} • {item.is_active ? 'Aktif' : 'Pasif'}
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{
                                  color: '#fff',
                                  fontWeight: 900,
                                  fontSize: 18,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatPrice(item.price)}
                              </div>
                            </div>
                          )}

                          {editingItemId !== item.id ? (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => openEdit(item)}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 12,
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  background: 'rgba(255,255,255,0.08)',
                                  color: '#fff',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Düzenle
                              </button>

                              <button
                                onClick={() => toggleItem(item)}
                                disabled={saving === item.id}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 12,
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  background: item.is_active
                                    ? 'rgba(234,179,8,0.18)'
                                    : 'rgba(34,197,94,0.18)',
                                  color: '#fff',
                                  fontWeight: 800,
                                  cursor: saving === item.id ? 'not-allowed' : 'pointer',
                                  opacity: saving === item.id ? 0.7 : 1,
                                }}
                              >
                                {item.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                              </button>

                              <button
                                onClick={() => deleteItem(item.id)}
                                disabled={saving === item.id}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 12,
                                  border: 'none',
                                  background: '#ef4444',
                                  color: '#fff',
                                  fontWeight: 800,
                                  cursor: saving === item.id ? 'not-allowed' : 'pointer',
                                  opacity: saving === item.id ? 0.7 : 1,
                                }}
                              >
                                Sil
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '0 16px 16px 16px',
                        color: 'rgba(255,255,255,0.45)',
                      }}
                    >
                      Henüz ürün yok
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}