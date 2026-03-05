import { redirect } from 'next/navigation'

export default function PanelTokenIndex({
  params,
}: {
  params: { token: string }
}) {
  const { token } = params

  redirect(`/panel/${token}/requests`)
}