'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Page() {
  const params = useParams()
  const token = params?.table as string

  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('table_number, restaurant_id')
        .eq('table_token', token)
        .single()

      if (data) {
        setTableNumber(data.table_number)
        setRestaurantId(data.restaurant_id)
      }
    }

    load()
  }, [token])

  async function send(type: string) {
    if (!restaurantId || !tableNumber) return

    await supabase.from('requests').insert({
      restaurant_id: restaurantId,
      table_number: tableNumber,
      request_type: type
    })

    alert('İstek gönderildi')
  }

  return (
    <div style={{padding:40,fontFamily:'sans-serif'}}>

      <h1>Masa {tableNumber}</h1>

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

        <button
          onClick={()=>window.location.href=`/t/${token}/menu`}
          style={{padding:20,fontSize:18}}
        >
          Menüyü Gör
        </button>

      </div>

    </div>
  )
}