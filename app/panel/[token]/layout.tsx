import type { ReactNode } from 'react'

export default async function PanelTokenLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <a href={`/panel/${token}`} style={{ fontWeight: 700 }}>
          Panel
        </a>
        <a href={`/panel/${token}/requests`}>İstekler</a>
        <a href={`/panel/${token}/tables`}>Masalar</a>
      </div>
      {children}
    </div>
  )
}