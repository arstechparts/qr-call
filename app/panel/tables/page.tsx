'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  id: string
  table_number: number
  token: string
  created_at: string
}

export default function Page() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    ;(async () => {
      const restaurantId = 'RESTAURANT_UUID_BURAYA' // şimdilik sabit
      const { data, error } = await supabase
        .from('tables')
        .select('id, table_number, token, created_at')
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true })

      if (error) alert(error.message)
      else setRows((data ?? []) as Row[])
    })()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1>Masalar</h1>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  )
}