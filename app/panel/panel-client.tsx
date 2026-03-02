'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

type RequestRow = {
  id: string
  table_number: number | null
  table_token: string | null
  request_type: string | null
  status: string | null
  created_at: string
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 20 } },
  })
}

export default function PanelClient({ token }: { token: string }) {
  const supabase = useMemo(() => getSupabase(), [])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [soundEnabled, setSoundEnabled] = useState(false)
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [rtStatus, setRtStatus] = useState<string>('connecting')

  useEffect(() => {
    const audio = new Audio('/sounds/notify.mp3') // ✅ public/sounds/notify.mp3
    audio.preload = 'auto'
    audio.volume = 1
    audioRef.current = audio
  }, [])

  const enableSound = async () => {
    try {
      if (!audioRef.current) return
      await audioRef.current.play()
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setSoundEnabled(true)
    } catch (err) {
      alert('Tarayıcı sesi engelledi. Tekrar tıkla.')
      setSoundEnabled(false)
    }
  }

  const playSound = async () => {
    if (!soundEnabled) return
    try {
      if (!audioRef.current) return
      audioRef.current.currentTime = 0
      await audioRef.current.play()
    } catch {
      setSoundEnabled(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setRequests(data as any)
    }
    load()
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`panel-${token}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        (payload) => {
          const row = payload.new as any as RequestRow
          setRequests((prev) => [row, ...prev].slice(0, 50))
          playSound()
        }
      )
      .subscribe((status) => setRtStatus(String(status)))

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, token, soundEnabled])

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-xl font-bold">Panel</div>
          <div className="text-sm opacity-70">Token: {token}</div>
          <div className="text-xs opacity-50">Realtime: {rtStatus}</div>
        </div>

        {!soundEnabled ? (
          <button
            onClick={enableSound}
            className="px-4 py-2 bg-black text-white rounded-lg"
          >
            Sesi Aktif Et
          </button>
        ) : (
          <div className="px-3 py-2 bg-green-100 rounded-lg text-sm">
            Ses Açık ✅
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {requests.length === 0 ? (
          <div className="opacity-70">Henüz istek yok</div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="border rounded-xl p-3">
              <div className="flex justify-between">
                <div className="font-semibold">
                  {r.request_type ?? '-'} • Masa {r.table_number ?? '-'}
                </div>
                <div className="text-xs opacity-60">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm opacity-70 mt-1">
                status: {r.status ?? '-'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}