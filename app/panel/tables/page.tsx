'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  id:string
  table_number:number
  table_token:string
}

export default function Page(){

  const [rows,setRows] = useState<Row[]>([])
  const [tableNumber,setTableNumber] = useState('')

  async function load(){

    const {data} = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('table_number')

    setRows(data || [])

  }

  useEffect(()=>{
    load()
  },[])

  async function addTable(){

    if(!tableNumber) return

    await supabase
      .from('restaurant_tables')
      .insert({
        table_number:Number(tableNumber)
      })

    setTableNumber('')
    load()

  }

  return(

    <div style={{padding:40}}>

      <h1>Masalar</h1>

      <div style={{marginBottom:20}}>

        <input
          placeholder="Masa numarası"
          value={tableNumber}
          onChange={e=>setTableNumber(e.target.value)}
          style={{padding:10,marginRight:10}}
        />

        <button
          onClick={addTable}
          style={{padding:10}}
        >
          Masa Ekle
        </button>

      </div>

      {rows.map(r=>(

        <div
          key={r.id}
          style={{
            border:'1px solid #ddd',
            padding:10,
            marginBottom:10,
            display:'flex',
            justifyContent:'space-between'
          }}
        >

          <div>
            Masa {r.table_number}
          </div>

          <div>

            <a
              href={`/panel/tables/${r.id}`}
              style={{marginRight:10}}
            >
              QR Gör
            </a>

            <a
              href={`/t/${r.table_token}`}
              target="_blank"
            >
              QR Link
            </a>

          </div>

        </div>

      ))}

    </div>

  )

}