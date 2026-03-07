import TablesClient from './tables-client'

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <TablesClient panelToken={token} />
}