'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ReqType = 'waiter' | 'bill'

export default function TablePage() {
  const params = useParams()
  const token = (params?.table as string) || ''

  const [loading, setLoading] = useState<ReqType | null>(null)
  const [locked, setLocked] = useState(false)
  const [msg, setMsg] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token
    )

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = (text: string, ms = 1700) => {
    setMsg(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setMsg(''), ms)
  }

  const lockForSeconds = (sec: number) => {
    setLocked(true)
    setTimeout(() => setLocked(false), sec * 1000)
  }

  const send = async (type: ReqType) => {
    if (!isUuid) {
      showToast('Geçersiz masa linki (token).')
      return
    }
    if (locked || loading) return

    lockForSeconds(3)
    setLoading(type)

    const { error } = await supabase.rpc('create_request', {
      // DİKKAT: fonksiyon argümanı bu isimde olmalı:
      p_table_token: token, // uuid string
      p_request_type: type,
    })

    setLoading(null)

    if (error) {
      console.error('create_request error:', error)
      showToast('Bir sorun oldu. Tekrar deneyin.')
      return
    }

    showToast(type === 'waiter' ? 'Garson çağrıldı ✅' : 'Hesap istendi ✅')
  }

  return (
    <main style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>QR Call</h1>

      <div style={{ marginBottom: 12, opacity: 0.8 }}>
        Masa linki: <code style={{ fontSize: 12 }}>{token || '(yok)'}</code>
      </div>

      {!isUuid && (
        <div
          style={{
            padding: 12,
            border: '1px solid #f5c2c7',
            background: '#fff5f5',
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          Bu link geçerli bir UUID token değil. Doğru format:
          <br />
          <code>/t/7cbe72df-3cc2-404e-a45a-640315b51d86</code>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        <button
          onClick={() => send('waiter')}
          disabled={!isUuid || !!loading || locked}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #ddd',
            cursor: !isUuid || loading || locked ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {loading === 'waiter' ? 'Gönderiliyor...' : '🧑‍🍳 Garson Çağır'}
        </button>

        <button
          onClick={() => send('bill')}
          disabled={!isUuid || !!loading || locked}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #ddd',
            cursor: !isUuid || loading || locked ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {loading === 'bill' ? 'Gönderiliyor...' : '🧾 Hesap İste'}
        </button>
      </div>

      {msg && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: '#111',
            color: '#fff',
            fontSize: 14,
          }}
        >
          {msg}
        </div>
      )}
    </main>
  )
}