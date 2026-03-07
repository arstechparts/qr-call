import MenuClient from './menu-client'

export default function Page({ params }: { params: { token: string } }) {
  return <MenuClient panelToken={params.token} />
}