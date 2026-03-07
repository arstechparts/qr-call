import RequestsClient from './requests-client'

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <RequestsClient panelToken={token} />
}