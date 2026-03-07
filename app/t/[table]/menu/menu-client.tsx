'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  table_number: number
  restaurant_id: string
  table_token: string
  is_active: boolean
}

type RestaurantRow = {
  id: string
  name: string
  instagram_url: string | null
  is_active?: boolean | null
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

export default function MenuPageClient({ tableToken }: { tableToken: string }) {
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [tableRow, setTableRow] = useState<TableRow | null>(null)
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [items, setItems] = useState<MenuItemRow[]>([])

  const bgStyle = useMemo<React.CSSProperties>(
    () => ({
      minHeight: '100svh',
      padding: 12,
      background:
        'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
        'linear-gradient(180deg, #0b1220 0%, #09101c 55%, #060a12 100%)',
      display: 'flex',
      justifyContent: 'center',
      overflowX: 'hidden',
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }),
    []
  )

  const shellStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 760,
    display: 'grid',
    gap: 14,
    alignContent: 'start',
  }

  const glassStyle: React.CSSProperties = {
    borderRadius: 28,
    color: '#fff',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(8px)',
  }

  const serifStyle: React.CSSProperties = {
    fontFamily: 'Georgia, "Times New Roman", serif',
    textShadow: '0 2px 10px rgba(0,0,0,0.25)',
  }

  useEffect(() => {
    let alive = true

    ;(async () => {
      setLoading(true)
      setInvalid(false)

      const { data: tData, error: tError } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, restaurant_id, table_token, is_active')
        .eq('table_token', tableToken)
        .limit(1)
        .maybeSingle()

      if (!alive) return

      if (tError || !tData || tData.is_active === false) {
        setInvalid(true)
        setTableRow(null)
        setRestaurant(null)
        setCategories([])
        setItems([])
        setLoading(false)
        return
      }

      setTableRow(tData as TableRow)

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('id, name, instagram_url, is_active')
        .eq('id', tData.restaurant_id)
        .limit(1)
        .maybeSingle()

      if (!alive) return

      if (restaurantData) {
        setRestaurant(restaurantData as RestaurantRow)
      } else {
        setRestaurant({
          id: tData.restaurant_id,
          name: 'Casita',
          instagram_url:
            'https://www.instagram.com/casitarestaurants?igsh=ZHc2emt2bjRnd2F4',
          is_active: true,
        })
      }

      const { data: cData, error: cError } = await supabase
        .from('menu_categories')
        .select('id, restaurant_id, name, sort_order, is_active')
        .eq('restaurant_id', tData.restaurant_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      const { data: iData, error: iError } = await supabase
        .from('menu_items')
        .select(
          'id, restaurant_id, category_id, name, description, price, sort_order, is_active, image_url'
        )
        .eq('restaurant_id', tData.restaurant_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (!alive) return

      if (cError || iError) {
        setInvalid(true)
        setLoading(false)
        return
      }

      setCategories((cData || []) as CategoryRow[])
      setItems((iData || []) as MenuItemRow[])
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [tableToken])

  function itemsOf(categoryId: string) {
    return items.filter((item) => item.category_id === categoryId)
  }

  function formatPrice(price: number) {
    const n = Number(price)
    return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2)} ₺`
  }

  const visibleCategories = categories.filter((category) => itemsOf(category.id).length > 0)
  const restaurantName = restaurant?.name || 'Restoran'

  if (loading) {
    return (
      <div style={bgStyle}>
        <div style={shellStyle}>
          <div style={{ ...glassStyle, padding: '22px 18px' }}>
            <div style={{ fontSize: 20, textAlign: 'center', opacity: 0.9, ...serifStyle }}>
              {restaurantName}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1,
                textAlign: 'center',
                ...serifStyle,
              }}
            >
              Menü
            </div>
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: 0.55,
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.16)' }} />
              <div style={{ fontSize: 15 }}>Yükleniyor...</div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.16)' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (invalid || !tableRow) {
    return (
      <div style={bgStyle}>
        <div style={shellStyle}>
          <div style={{ ...glassStyle, padding: 22 }}>
            <div style={{ fontSize: 20, textAlign: 'center', opacity: 0.9, ...serifStyle }}>
              {restaurantName}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 40,
                fontWeight: 700,
                textAlign: 'center',
                ...serifStyle,
              }}
            >
              Menü bulunamadı
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 18,
                opacity: 0.85,
                textAlign: 'center',
              }}
            >
              Bu masa için menü verisi alınamadı.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={bgStyle}>
      <div style={shellStyle}>
        <div
          style={{
            ...glassStyle,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '26px 18px 20px 18px',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            }}
          >
            <div
              style={{
                fontSize: 22,
                opacity: 0.98,
                textAlign: 'center',
                ...serifStyle,
              }}
            >
              {restaurantName}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 50,
                fontWeight: 700,
                lineHeight: 1,
                textAlign: 'center',
                letterSpacing: 0.3,
                ...serifStyle,
              }}
            >
              Menü
            </div>

            <div
              style={{
                marginTop: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: 0.6,
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.16)' }} />
              <div style={{ fontSize: 15, whiteSpace: 'nowrap' }}>Masa {tableRow.table_number}</div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.16)' }} />
            </div>
          </div>
        </div>

        {visibleCategories.length === 0 ? (
          <div
            style={{
              ...glassStyle,
              padding: 20,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            Henüz menü eklenmemiş
          </div>
        ) : (
          visibleCategories.map((category) => {
            const categoryItems = itemsOf(category.id)

            return (
              <div
                key={category.id}
                style={{
                  ...glassStyle,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.14)' }} />
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      ...serifStyle,
                    }}
                  >
                    {category.name}
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.14)' }} />
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 20,
                        padding: 10,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: item.image_url ? '92px 1fr auto' : '1fr auto',
                          gap: 12,
                          alignItems: 'start',
                        }}
                      >
                        {item.image_url ? (
                          <div
                            style={{
                              width: 92,
                              height: 92,
                              borderRadius: 16,
                              overflow: 'hidden',
                              background: 'rgba(255,255,255,0.04)',
                              flexShrink: 0,
                              boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                            }}
                          >
                            <img
                              src={item.image_url}
                              alt={item.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          </div>
                        ) : null}

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: 22,
                              lineHeight: 1.15,
                              ...serifStyle,
                            }}
                          >
                            {item.name}
                          </div>

                          {item.description ? (
                            <div
                              style={{
                                color: 'rgba(255,255,255,0.76)',
                                marginTop: 6,
                                fontSize: 14,
                                lineHeight: 1.45,
                              }}
                            >
                              {item.description}
                            </div>
                          ) : null}
                        </div>

                        <div
                          style={{
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 24,
                            whiteSpace: 'nowrap',
                            lineHeight: 1.1,
                            ...serifStyle,
                          }}
                        >
                          {formatPrice(item.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}

        <a
          href={`/t/${tableRow.table_token}`}
          style={{
            ...glassStyle,
            padding: '14px 16px',
            textAlign: 'center',
            textDecoration: 'none',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          Geri Dön
        </a>
      </div>
    </div>
  )
}