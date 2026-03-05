useEffect(() => {
  let alive = true
  ;(async () => {
    setLoading(true)
    setInvalid(false)

    const isUuid = UUID_RE.test(incoming)

    const builder = supabase
      .from('restaurant_tables')
      .select('id, table_number, restaurant_id, is_active')

    const { data, error } = isUuid
      ? await builder.eq('table_token', incoming).limit(1).maybeSingle()
      : await builder.eq('token', incoming).limit(1).maybeSingle()

    if (!alive) return

    if (error || !data || data.is_active === false) {
      setInvalid(true)
      setRow(null)
    } else {
      setRow(data as TableRow)
    }

    setLoading(false)
  })()

  return () => {
    alive = false
  }
}, [incoming])