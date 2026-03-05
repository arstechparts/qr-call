import { redirect } from 'next/navigation'

export default function RequestsPage({ params }: { params: { token: string } }) {
  // Şimdilik requests ekranı ana panelin içinde çalışıyor gibi düşün:
  // 404 olmasın diye ana panele yönlendiriyoruz.
  redirect(`/panel/${params.token}`)
}