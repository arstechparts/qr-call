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
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        {items.map((it) => {
          const active = pathname === it.href || pathname?.startsWith(it.href + '/')
          return (
            <Link
              key={it.href}
              href={it.href}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                color: '#111',
                fontWeight: 600,
              }}
            >
              {it.label}
            </Link>
          )
        })}
      </div>

      {/* Sayfanın kendi içeriği (children) */}
      {/* Eğer senin projende PanelClient başka bir component render ediyorsa, burayı bozma:
          Bu dosyada zaten başka bir return yapısı vardıysa söyle, ben ona göre tek dosyada düzeltirim.
      */}
    </div>
  )
}