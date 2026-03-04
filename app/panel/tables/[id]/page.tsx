'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'react-qr-code'

type Row = {
  table_number: number
  table_token: string
}

export default function Page() {

  const params = useParams()
  const id = params?.id as string

  const [row,setRow] = useState<Row | null>(null)

  useEffect(()=>{

    async function load(){

      const {data} = await supabase
        .from('restaurant_tables')
        .select('table_number,table_token')
        .eq('id',id)
        .single()

      setRow(data)

    }

    load()

  },[id])

  if(!row){
    return <div>yükleniyor...</div>
  }

  const url = `https://qr-call.vercel.app/t/${row.table_token}`

  return (

    <div style={{padding:40}}>

      <h1>Masa {row.table_number}</h1>

      <div style={{background:'#fff',padding:20,width:260}}>
        <QRCode value={url} size={220}/>
      </div>

      <p style={{marginTop:20}}>
        {url}
      </p>

      <button
        onClick={()=>window.print()}
        style={{
          padding:'10px 20px',
          marginTop:20
        }}
      >
        QR Yazdır
      </button>

    </div>

  )

}