'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Request = {
  id: string
  table_number: number
  request_type: string
  created_at: string
}

export default function Panel() {

  const [requests,setRequests] = useState<Request[]>([])

  async function load(){
    const {data} = await supabase
      .from('requests')
      .select('*')
      .eq('status','waiting')
      .order('created_at',{ascending:false})

    if(data) setRequests(data)
  }

  useEffect(()=>{

    load()

    const channel = supabase
      .channel('requests')
      .on(
        'postgres_changes',
        {event:'INSERT',schema:'public',table:'requests'},
        () => {
          load()
          new Audio('/alert.mp3').play()
        }
      )
      .subscribe()

    return () => {supabase.removeChannel(channel)}

  },[])

  async function complete(id:string){
    await supabase
      .from('requests')
      .update({status:'completed'})
      .eq('id',id)

    load()
  }

  return (

    <div style={{padding:40,fontFamily:'sans-serif'}}>

      <h1>Garson Paneli</h1>

      <div style={{marginTop:30,display:'grid',gap:15}}>

        {requests.map(r=>(
          <div
            key={r.id}
            style={{
              border:'1px solid #ddd',
              padding:20,
              borderRadius:10,
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center'
            }}
          >

            <div>

              <b>Masa {r.table_number}</b>

              <div style={{fontSize:13}}>

                {r.request_type === 'waiter'
                  ? 'Garson Çağır'
                  : 'Hesap İste'}

              </div>

            </div>

            <button
              onClick={()=>complete(r.id)}
              style={{padding:'10px 15px'}}
            >
              Tamamlandı
            </button>

          </div>
        ))}

      </div>

    </div>

  )
}