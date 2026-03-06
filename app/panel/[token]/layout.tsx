import type { ReactNode } from 'react'
import PanelClient from '@/app/panel/panel-client'

export default function PanelTokenLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { token: string }
}) {
  return <PanelClient token={params.token}>{children}</PanelClient>
}