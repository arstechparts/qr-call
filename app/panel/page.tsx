import PanelClient from '@/app/panel-client'

export default function PanelTokenPage({ params }: { params: { token: string } }) {
  return <PanelClient token={params.token} />
}