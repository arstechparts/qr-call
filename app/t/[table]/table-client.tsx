'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TableRow = {
  id: string
  table_number: number
  restaurant_id: string
  table_token: string | null // uuid string (bazı kayıtlarda null olabilir)
  is_active: boolean
}

function isUuidLike(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export default function TableClient({ incoming }: { incoming: string }) {
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] =