import type { ReactNode } from 'react'
import PanelClient from '@/app/panel/panel-client'

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return <PanelClient token={token}>{children}</PanelClient>
}