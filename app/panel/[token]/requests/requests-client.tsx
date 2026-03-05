'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RequestRow = {
  id: string
  table_number: number
  request_type: string
  status: string
  created_at: string
}

function formatTR(iso?: string | null) {
  if (!iso) return ''

  const utc = new Date(iso).getTime()
  const tr = new Date(utc + 3 * 60 * 60 * 1000)

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${pad(tr.getDate())}.${pad(tr.getMonth()+1)}.${tr.getFullYear()} ${pad(tr.getHours())}:${pad(tr.getMinutes())}:${pad(tr.getSeconds())}`
}

export default function RequestsClient({ panelToken }: { panelToken: string }) {

  const [waiting,setWaiting] = useState<RequestRow[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function load(){

    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('status','waiting')
      .order('created_at',{ascending:false})

    setWaiting(data || [])
  }

  function ding(){
    if(!audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(()=>{})
  }

  useEffect(()=>{

    load()

    const channel = supabase
      .channel('requests-live')
      .on(
        'postgres_changes',
        { event:'INSERT', schema:'public', table:'requests' },
        payload => {
          load()
          ding()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  },[])

  async function complete(id:string){

    await supabase
      .from('requests')
      .update({status:'completed'})
      .eq('id',id)

    load()
  }

  return (

    <div style={{
      minHeight:'100vh',
      padding:20,
      background:'linear-gradient(#0b1220,#0a0f1a)',
      color:'#fff'
    }}>

      <audio ref={audioRef} src="/ding.wav"/>

      <div style={{
        maxWidth:700,
        margin:'0 auto'
      }}>

        <div style={{
          fontSize:26,
          fontWeight:800,
          marginBottom:20
        }}>
          Bekleyen İstekler ({waiting.length})
        </div>

        {waiting.length === 0 && (
          <div style={{opacity:.7}}>
            Bekleyen çağrı yok
          </div>
        )}

        {waiting.map(r => (

          <div key={r.id} style={{
            background:'rgba(255,255,255,0.06)',
            padding:18,
            borderRadius:14,
            marginBottom:12,
            display:'flex',
            justifyContent:'space-between',
            alignItems:'center'
          }}>

            <div>

              <div style={{
                fontSize:20,
                fontWeight:700
              }}>
                Masa {r.table_number} • Garson Çağır
              </div>

              <div style={{
                marginTop:6,
                opacity:.7,
                fontSize:14
              }}>
                {formatTR(r.created_at)}
              </div>

            </div>

            <button
              onClick={()=>complete(r.id)}
              style={{
                padding:'10px 16px',
                borderRadius:10,
                border:'none',
                background:'#22c55e',
                color:'#fff',
                fontWeight:700
              }}
            >
              Tamamlandı
            </button>

          </div>

        ))}

      </div>

    </div>

  )
}