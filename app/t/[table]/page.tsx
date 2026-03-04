'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  table_number: number
  restaurant_id: string
}

function Card({
  title,
  subtitle,
  img,
  onClick,
  href
}: {
  title: string
  subtitle?: string
  img?: string
  onClick?: () => void
  href?: string
}) {
  const body = (
    <div
      style={{
        borderRadius: 18,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '21 / 9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {img ? (
          <img
            src={img}
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain', // ✅ hepsi aynı
              objectPosition: 'center'
            }}
          />
        ) : (
          <div style={{ fontSize: 34, fontWeight: 900 }}>Menü</div>
        )}
      </div>

      <div style={{ padding: '10px 0 14px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>{title}</div>
        {subtitle ? (
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        style={{
          display: 'block',
          textDecoration: 'none',
          color: 'white'
        }}
      >
        {body}
      </a>
    )
  }

  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        background: 'none',
        padding: 0,
        width: '100%',
        cursor: 'pointer'
      }}
    >
      {body}
    </button>
  )
}

export default function Page() {
  const params = useParams()
  const token = (params?.table as string) || ''

  const [table, setTable] = useState<TableRow | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('table_number, restaurant_id')
        .eq('table_token', token)
        .eq('is_active', true)
        .maybeSingle()

      if (data) setTable(data as TableRow)
    })()
  }, [token])

  async function send(type: 'waiter' | 'bill') {
    if (!table) return

    await supabase.from('requests').insert({
      restaurant_id: table.restaurant_id,
      table_number: table.table_number,
      request_type: type,
      status: 'waiting'
    })

    alert('İstek gönderildi ✅')
  }

  if (!table) {
    return (
      <div style={{ color: 'white', padding: 20 }}>QR geçersiz</div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070A12',
        padding: 14,
        color: 'white'
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            borderRadius: 18,
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)'
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.8 }}>Premium</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            Masa {table.table_number}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <Card
            title="Garson Çağır"
            subtitle="Lütfen butona tıklayınız"
            img="/waiter-v2.png"
            onClick={() => send('waiter')}
          />

          <Card
            title="Hesap İste"
            subtitle="Lütfen butona tıklayınız"
            img="/bill.png"
            onClick={() => send('bill')}
          />

          <Card title="Menü" href={`/t/${token}/menu`} />
        </div>
      </div>
    </div>
  )
}