'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TablePage() {
  const params = useParams<{ table: string }>()
  const token = params.table

  const [loading, setLoading] = useState<'waiter' | 'bill' | null>(null)
  const [msg, setMsg] = useState('')
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)

  const lockTimer = useRef<any>(null)
  const toastTimer = useRef<any>(null)

  useEffect(() => {
    const loadTable = async () => {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('table_number')
        .eq('token', token)
        .single()

      if (data) setTableNumber(data.table_number)
    }

    if (token) loadTable()

    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [token])

  const lockForSeconds = (sec: number) => {
    setLocked(true)
    if (lockTimer.current) clearTimeout(lockTimer.current)
    lockTimer.current = setTimeout(() => setLocked(false), sec * 1000)
  }

  const showToast = (text: string, ms = 1700) => {
    setMsg(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setMsg(''), ms)
  }

  const send = async (type: 'waiter' | 'bill') => {
    if (locked || loading) return

    lockForSeconds(3)
    setLoading(type)

    const { error } = await supabase.rpc('create_request', {
      p_token: token,
      p_request_type: type,
    })

    setLoading(null)

    if (error) {
      showToast('Bir sorun oldu. Tekrar deneyin.')
      return
    }

    showToast(type === 'waiter' ? 'Garson çağrıldı ✅' : 'Hesap istendi ✅')
  }

  const Card = ({
    img,
    title,
    type,
  }: {
    img: string
    title: string
    type: 'waiter' | 'bill'
  }) => {
    const busy = loading === type
    const disabled = locked || loading !== null

    return (
      <button
        onClick={() => send(type)}
        disabled={disabled}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'transform 120ms ease',
        }}
        onMouseDown={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'
        }}
        onMouseUp={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        }}
      >
        {/* ✅ İç çerçeve / padding / background kaldırıldı */}
        <div
          style={{
            width: '100%',
            height: 'clamp(150px, 22vh, 210px)',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          <img
            src={img}
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 900, color: 'white' }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.8, color: 'white', marginTop: 4 }}>
            {busy ? 'Gönderiliyor...' : 'Lütfen Butona Tıklayınız'}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 18,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #111827 100%)',
        color: 'white',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            borderRadius: 22,
            padding: 16,
            marginTop: 10,
            marginBottom: 16,
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7 }}>Masa</div>
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 6 }}>
            {tableNumber ?? '...'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card img="/waiter-v2.png?v=7" title="Garson Çağır" type="waiter" />
          <Card img="/bill.png?v=7" title="Hesap İste" type="bill" />
        </div>

        {locked ? (
          <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.7, marginTop: 10 }}>
            Lütfen birkaç saniye bekleyin…
          </div>
        ) : null}
      </div>

      {msg ? (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 22,
            transform: 'translateX(-50%)',
            background: '#111827',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 14,
            fontSize: 14,
            boxShadow: '0 10px 35px rgba(0,0,0,0.4)',
            maxWidth: '92vw',
          }}
        >
          {msg}
        </div>
      ) : null}
    </div>
  )
}