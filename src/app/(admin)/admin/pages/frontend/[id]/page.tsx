import { redirect } from 'next/navigation'

export default async function FrontendPageRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/admin/pages/editor/frontend-${id}`)
}
