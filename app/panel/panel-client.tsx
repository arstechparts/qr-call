'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function PanelClient({ token }: { token: string }) {
  const pathname = usePathname()

  const items = [
    { label: 'Panel', href: `/panel/${token}` },
    { label: 'İstekler', href: `/panel/${token}/requests` },
    { label: 'Masalar', href: `/panel/${token}/tables` },
  ]

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
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
    </div>
  )
}