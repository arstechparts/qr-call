import type { ReactNode } from 'react'

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ token: string }>
}) {
  // token şimdilik kullanılmıyor ama burada hazır dursun
  await params
  return <>{children}</>
}