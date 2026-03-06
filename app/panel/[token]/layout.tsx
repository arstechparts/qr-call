import PanelClient from '@/app/panel/panel-client'

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return <PanelClient token={token}>{children}</PanelClient>
}