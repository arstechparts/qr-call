'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TableClient({ incoming }: { incoming: string }) {
  const [row, setRow] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('table_token', incoming)
        .single()

      if (error) {
        console.log(error)
      }

      setRow(data)
      setLoading(false)
    }

    load()
  }, [incoming])

  async function callWaiter() {

    if (!row) return

    await supabase
      .from('requests')
      .insert({
        restaurant_id: row.restaurant_id,
        table_number: row.table_number,
        table_token: row.table_token,
        request_type: 'waiter',
        status: 'waiting'
      })

    alert('Garson çağrıldı')
  }

  async function callBill() {

    if (!row) return

    await supabase
      .from('requests')
      .insert({
        restaurant_id: row.restaurant_id,
        table_number: row.table_number,
        table_token: row.table_token,
        request_type: 'bill',
        status: 'waiting'
      })

    alert('Hesap istendi')
  }

  if (loading) return <div>Loading...</div>

  if (!row) return <div>QR geçersiz</div>

  return (
    <div style={{padding:40}}>

      <h1>Masa {row.table_number}</h1>

      <button onClick={callWaiter}>
        Garson Çağır
      </button>

      <br/><br/>

      <button onClick={callBill}>
        Hesap İste
      </button>

    </div>
  )
}