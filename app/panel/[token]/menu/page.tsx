import MenuClient from './menu-client'

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <MenuClient panelToken={token} />
}