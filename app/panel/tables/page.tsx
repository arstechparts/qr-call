'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'

export default function Tables(){

  const [table,setTable] = useState('')
  const [qr,setQr] = useState('')

  function create(){

    const token = crypto.randomUUID()

    setQr(token)
  }

  return (

    <div style={{padding:40,fontFamily:'sans-serif'}}>

      <h1>QR Oluştur</h1>

      <div style={{marginTop:30}}>

        <input
          placeholder="Masa numarası"
          value={table}
          onChange={e=>setTable(e.target.value)}
          style={{padding:10,fontSize:16}}
        />

        <button
          onClick={create}
          style={{marginLeft:10,padding:10}}
        >
          QR oluştur
        </button>

      </div>

      {qr && (

        <div style={{marginTop:40}}>

          <QRCode value={`https://qr-call.vercel.app/t/${qr}`} />

          <div style={{marginTop:20}}>

            https://qr-call.vercel.app/t/{qr}

          </div>

        </div>

      )}

    </div>

  )
}