'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  table_number: number
  restaurant_id: string
}

function CardButton({
  title,
  subtitle,
  img,
  onClick,
  href
}: {
  title: string
  subtitle: string
  img?: string
  onClick?: () => void
  href?: string
}) {
  const common: React.CSSProperties = {
    borderRadius: 22,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    overflow: 'hidden'
  }

  const inner = (
    <div style={{ padding: 18 }}>
      {img ? (
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 16,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={img}
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            fontWeight: 900
          }}
        >
          Menü
        </div>
      )}

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>{title}</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>{subtitle}</div>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} style={{ ...common, display: 'block', color: 'white', textDecoration: 'none' }}>
        {inner}
      </a>
    )
  }

  return (
    <button
      onClick={onClick}
      style={{
        ...common,
        display: 'block',
        width: '100%',
        padding: 0,
        color: 'white',
        textAlign: 'left',
        cursor: 'pointer'
      }}
    >
      {inner}
    </button>
  )
}

export default function Page() {
  const params = useParams()
  const incoming = (params?.table as string) || ''

  const [table, setTable] = useState<TableRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)

      const a = await supabase
        .from('restaurant_tables')
        .select('table_number, restaurant_id')
        .eq('token', incoming)
        .eq('is_active', true)
        .maybeSingle()

      if (a.data) {
        setTable(a.data as TableRow)
        setLoading(false)
        return
      }

      const b = await supabase
        .from('restaurant_tables')
        .select('table_number, restaurant_id')
        .eq('table_token', incoming)
        .eq('is_active', true)
        .maybeSingle()

      if (b.data) setTable(b.data as TableRow)
      else setTable(null)

      setLoading(false)
    })()
  }, [incoming])

  async function send(type: 'waiter' | 'bill') {
    if (!table) return

    const { error } = await supabase.from('requests').insert({
      restaurant_id: table.restaurant_id,
      table_number: table.table_number,
      request_type: type,
      status: 'waiting'
    })

    if (error) alert(error.message)
    else alert('İstek gönderildi ✅')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#070A12', color: 'white', padding: 18 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 18 }}>
          <div style={{ borderRadius: 22, padding: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Premium</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>Yükleniyor…</div>
          </div>
        </div>
      </div>
    )
  }

  if (!table) {
    return (
      <div style={{ minHeight: '100vh', background: '#070A12', color: 'white', padding: 18 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 18 }}>
          <div style={{ borderRadius: 22, padding: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Premium</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>QR geçersiz</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>Bu QR kapalı ya da bulunamadı.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070A12', color: 'white', padding: 18 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 18 }}>
        <div style={{ borderRadius: 22, padding: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontSize: 14, opacity: 0.85 }}>Premium</div>
          <div style={{ fontSize: 44, fontWeight: 900, marginTop: 8 }}>Masa {table.table_number}</div>
        </div>

        <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
          <CardButton
            title="Garson Çağır"
            subtitle="Lütfen butona tıklayınız"
            img="/waiter-v2.png"
            onClick={() => send('waiter')}
          />

          <CardButton
            title="Hesap İste"
            subtitle="Lütfen butona tıklayınız"
            img="/bill.png"
            onClick={() => send('bill')}
          />

          <CardButton
            title="Menüyü Gör"
            subtitle="Menü ve fiyatlar"
            href={`/t/${incoming}/menu`}
          />
        </div>
      </div>
    </div>
  )
}