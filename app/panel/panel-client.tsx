'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export default function PanelClient({
  token,
  children,
}: {
  token: string
  children?: ReactNode
}) {
  const pathname = usePathname()

  const items = [
    { label: 'Panel', href: `/panel/${token}` },
    { label: 'İstekler', href: `/panel/${token}/requests` },
    { label: 'Masalar', href: `/panel/${token}/tables` },
    { label: 'Menü', href: `/panel/${token}/menu` },
  ]

  return (
    <div style={{ minHeight: '100vh', padding: 16, background: '#fff', color: '#111' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {items.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: 'none',
                color: '#111',
                fontWeight: active ? 800 : 500,
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {children}
    </div>
  )
}