'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Page() {

  const params = useParams()
  const token = params?.table as string

  const [table,setTable] = useState<any>(null)
  const [loading,setLoading] = useState(true)

  useEffect(()=>{

    async function load(){

      let {data} = await supabase
        .from('restaurant_tables')
        .select('table_number,restaurant_id')
        .eq('token',token)
        .single()

      if(!data){

        let res = await supabase
          .from('restaurant_tables')
          .select('table_number,restaurant_id')
          .eq('table_token',token)
          .single()

        data = res.data
      }

      if(data) setTable(data)

      setLoading(false)
    }

    load()

  },[token])

  async function send(type:string){

    if(!table) return

    await supabase.from('requests').insert({
      restaurant_id:table.restaurant_id,
      table_number:table.table_number,
      request_type:type
    })

    alert('İstek gönderildi')
  }

  if(loading) return <div style={{padding:40}}>Yükleniyor...</div>

  if(!table) return <div style={{padding:40}}>QR geçersiz</div>

  return(

    <div style={{padding:40,fontFamily:'sans-serif'}}>

      <h1>Masa {table.table_number}</h1>

      <div style={{display:'grid',gap:20,marginTop:40}}>

        <button
          onClick={()=>send('waiter')}
          style={{padding:20,fontSize:18}}
        >
          Garson Çağır
        </button>

        <button
          onClick={()=>send('bill')}
          style={{padding:20,fontSize:18}}
        >
          Hesap İste
        </button>

      </div>

    </div>

  )
}