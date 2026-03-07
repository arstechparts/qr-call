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
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [items, setItems] = useState<MenuItemRow[]>([])

  const bgStyle = useMemo<React.CSSProperties>(
    () => ({
      minHeight: '100svh',
      padding: 12,
      background:
        'radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0)),' +
        'linear-gradient(180deg, #0b1220 0%, #0a0f1a 100%)',
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
    gap: 12,
    alignContent: 'start',
  }

  const glassStyle: React.CSSProperties = {
    borderRadius: 28,
    color: '#fff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(6px)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: 0.2,
    lineHeight: 1.05,
    textAlign: 'center',
    fontFamily: 'Georgia, "Times New Roman", serif',
    textShadow: '0 2px 10px rgba(0,0,0,0.25)',
  }

  const categoryTitleStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 0.1,
    lineHeight: 1.05,
    fontFamily: 'Georgia, "Times New Roman", serif',
    textAlign: 'center',
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
        setLoading(false)
        return
      }

      setTableRow(tData as TableRow)

      const restaurantId = tData.restaurant_id

      const { data: cData, error: cError } = await supabase
        .from('menu_categories')
        .select('id, restaurant_id, name, sort_order, is_active')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      const { data: iData, error: iError } = await supabase
        .from('menu_items')
        .select(
          'id, restaurant_id, category_id, name, description, price, sort_order, is_active, image_url'
        )
        .eq('restaurant_id', restaurantId)
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
    return `${Number(price).toFixed(2)} ₺`
  }

  if (loading) {
    return (
      <div style={bgStyle}>
        <div style={{ width: '100%', maxWidth: 760, color: '#fff', opacity: 0.92 }}>
          <div
            style={{
              fontSize: 16,
              opacity: 0.8,
              marginBottom: 8,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            Casita
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>Menü yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (invalid || !tableRow) {
    return (
      <div style={bgStyle}>
        <div style={{ width: '100%', maxWidth: 760 }}>
          <div
            style={{
              ...glassStyle,
              padding: 22,
            }}
          >
            <div
              style={{
                fontSize: 16,
                opacity: 0.8,
                marginBottom: 8,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
            >
              Casita
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>Menü bulunamadı</div>
            <div style={{ marginTop: 10, fontSize: 18, opacity: 0.85 }}>
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
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              fontSize: 18,
              opacity: 0.85,
              textAlign: 'center',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            Casita
          </div>

          <div style={{ marginTop: 8, ...titleStyle }}>Menü</div>

          <div
            style={{
              marginTop: 8,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.72)',
              fontSize: 15,
            }}
          >
            Masa {tableRow.table_number}
          </div>
        </div>

        {categories.length === 0 ? (
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
          categories.map((category) => {
            const categoryItems = itemsOf(category.id)

            if (categoryItems.length === 0) return null

            return (
              <div
                key={category.id}
                style={{
                  ...glassStyle,
                  padding: 16,
                }}
              >
                <div style={categoryTitleStyle}>{category.name}</div>

                <div
                  style={{
                    marginTop: 14,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 18,
                        padding: 14,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 19,
                            lineHeight: 1.2,
                          }}
                        >
                          {item.name}
                        </div>

                        {item.description ? (
                          <div
                            style={{
                              color: 'rgba(255,255,255,0.74)',
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
                          fontWeight: 900,
                          fontSize: 18,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatPrice(item.price)}
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