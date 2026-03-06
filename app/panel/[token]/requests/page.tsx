import RequestsClient from './requests-client'

export default function Page({ params }: { params: { token: string } }) {
  return <RequestsClient panelToken={params.token} />
}