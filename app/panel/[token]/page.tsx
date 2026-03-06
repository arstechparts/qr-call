import TablesClient from './tables-client'

export default function Page({ params }: { params: { token: string } }) {
  return <TablesClient panelToken={params.token} />
}