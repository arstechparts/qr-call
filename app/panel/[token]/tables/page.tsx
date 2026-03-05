'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TablesPage({ params }: { params: { token: string } }) {

  const [restaurant,setRestaurant] = useState<any>(null)
  const [tables,setTables] = useState<any[]>([])
  const [error,setError] = useState('')

  useEffect(()=>{

    async function load(){

      const {data:rest} = await supabase
      .from('restaurants')
      .select('*')
      .eq('panel_token',params.token)
      .single()

      if(!rest){
        setError('Restaurant bulunamadı (panel token yanlış olabilir).')
        return
      }

      setRestaurant(rest)

      const {data:tablesData} = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('restaurant_id',rest.id)
      .order('table_number')

      setTables(tablesData || [])

    }

    load()

  },[])

  async function addTable(){

    const next = tables.length + 1

    const {data,error} = await supabase
    .from('restaurant_tables')
    .insert({
      restaurant_id:restaurant.id,
      table_number:next
    })
    .select()
    .single()

    if(!error){
      setTables([...tables,data])
    }

  }

  if(error){
    return (
      <div style={{padding:30,color:'white'}}>
        {error}
      </div>
    )
  }

  return (

    <div style={{padding:20,color:'white'}}>

      <h2>Masalar</h2>

      <button onClick={addTable}>
        Masa Ekle (+1)
      </button>

      <br/><br/>

      {tables.length===0 && (
        <div>Henüz masa yok.</div>
      )}

      {tables.map(t=>(
        <div key={t.id} style={{marginBottom:10}}>

          Masa {t.table_number}

          <br/>

          <a href={`/panel/tables/${t.id}`}>
            QR Gör
          </a>

        </div>
      ))}

    </div>

  )

}