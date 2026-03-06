import { redirect } from 'next/navigation'

export default function PanelTokenIndex({
  params,
}: {
  params: { token: string }
}) {
  redirect(`/panel/${params.token}/requests`)
}