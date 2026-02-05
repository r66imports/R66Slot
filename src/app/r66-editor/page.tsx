import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'

export const metadata = {
  title: 'R66 Editor'
}

export default async function Page() {
  // Hide the editor unless the feature flag is explicitly enabled
  if (String(process.env.NEXT_PUBLIC_ENABLE_R66_EDITOR || '').trim() !== '1') {
    notFound()
  }

  // Server-side admin session check (uses same cookie as admin auth)
  const cookieStore = await cookies()
  const session = cookieStore.get('admin-session')

  if (!session) {
    // Redirect unauthenticated users to admin login (preserve return path)
    redirect('/admin/login?redirect=/r66-editor')
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <iframe src="/r66-editor/r66-editor.html" title="R66 Editor" style={{ flex: 1, border: 0 }} />
    </div>
  )
}
