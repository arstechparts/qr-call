'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'react-qr-code'
import QR from 'qrcode'

export default function Page({ params }: { params: { id: string } }) {

  const [table,setTable] = useState<any>(null)

  useEffect(() => {

    async function load(){

      const {data} = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('id',params.id)
      .single()

      setTable(data)

    }

    load()

  },[])

  if(!table){
    return <div style={{padding:40}}>Yükleniyor...</div>
  }

  const url = `https://qr-call.vercel.app/t/${table.table_token}`

  async function download(){

    const png = await QR.toDataURL(url)

    const a = document.createElement('a')
    a.href = png
    a.download = `masa-${table.table_number}.png`
    a.click()

  }

  return (

    <div style={{padding:40}}>

      <h1>Masa {table.table_number}</h1>

      <div style={{background:'#fff',padding:20,width:320}}>
        <QRCode value={url} size={280}/>
      </div>

      <br/>

      <button onClick={download}>
        QR indir
      </button>

      <br/><br/>

      <a href={url} target="_blank">
        müşteri sayfası
      </a>

    </div>

  )
}