import { redirect } from 'next/navigation'

export default function Page({ params }: { params: { token: string } }) {
  redirect(`/panel/${params.token}`)
}