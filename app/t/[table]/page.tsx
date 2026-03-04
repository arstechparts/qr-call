'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TablePage() {
  const params = useParams()
  const token = params.table as string

  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('table_number')
        .eq('table_token', token)
        .single()

      if (data) setTableNumber(data.table_number)
    }

    load()
  }, [token])

  const send = async (type: 'waiter' | 'bill') => {
    const { error } = await supabase.from('requests').insert({
      table_token: token,
      request_type: type,
      status: 'waiting'
    })

    if (!error) {
      setMsg(type === 'waiter' ? 'Garson çağrıldı ✅' : 'Hesap istendi ✅')
      setTimeout(() => setMsg(''), 4000)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c1322] flex items-center justify-center text-white">
      <div className="w-[380px] bg-[#141c2f] p-6 rounded-xl shadow-xl">

        <div className="text-sm text-gray-400 mb-2">
          Casita Nişantaşı
        </div>

        <h1 className="text-3xl font-bold mb-4">
          Masa {tableNumber ?? ''}
        </h1>

        <div className="text-sm bg-[#1c263c] p-3 rounded mb-5 text-gray-300">
          Tek dokunuşla çağrı gönderin. Garson ekranına düşer.
        </div>

        <button
          onClick={() => send('waiter')}
          className="w-full mb-3 bg-gray-700 hover:bg-gray-600 p-4 rounded text-lg"
        >
          Garson Çağır
        </button>

        <button
          onClick={() => send('bill')}
          className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded text-lg"
        >
          Hesap İste
        </button>

        {msg && (
          <div className="mt-4 bg-green-700 p-3 rounded text-center">
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}
