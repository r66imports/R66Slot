export const metadata = {
  title: 'R66 Studio — Editor'
}

export default function Page() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <iframe src="/wix-studio/wix-studio.html" title="R66 Studio Editor" style={{ flex: 1, border: 0 }} />
    </div>
  )
}
