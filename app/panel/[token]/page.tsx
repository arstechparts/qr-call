import { redirect } from 'next/navigation'

export default async function PanelTokenIndex({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`/panel/${token}/requests`)
}