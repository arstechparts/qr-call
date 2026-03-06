import PanelClient from '@/app/panel/panel-client'

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  return (
    <PanelClient token="">
      {children}
    </PanelClient>
  )
}