// Simple smoke test for editor access
// Usage: node scripts/smoke-editor.js <baseUrl>
// Example: node scripts/smoke-editor.js https://r66slot.co.za

const base = process.argv[2] || 'https://r66slot.co.za'

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { res, body }
}

async function main() {
  console.log('Checking /api/editor/access')
  let { res, body } = await jsonFetch(`${base}/api/editor/access`)
  console.log('access:', body)
  if (!res.ok) {
    console.error('Failed to fetch /api/editor/access')
    process.exit(2)
  }

  // Try to seed admin (idempotent)
  console.log('Seeding admin (idempotent)')
  let seed = await jsonFetch(`${base}/api/admin/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  console.log('seed:', seed.body)

  // Try to login
  console.log('Logging in as Admin')
  const loginRes = await fetch(`${base}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Admin', password: 'admin123' }),
    redirect: 'manual'
  })

  const setCookie = loginRes.headers.get('set-cookie')
  console.log('login status:', loginRes.status)
  if (loginRes.status !== 200) {
    console.error('Login failed; check server logs.');
    process.exit(3)
  }

  // Use cookie to check /api/editor/access authenticated
  const cookieHeader = setCookie ? setCookie.split(';')[0] : ''
  const authCheck = await jsonFetch(`${base}/api/editor/access`, { headers: { Cookie: cookieHeader } })
  console.log('authenticated access:', authCheck.body)
  if (!authCheck.body.enabled) {
    console.error('ENABLE_WIX_EDITOR not active on the server')
    process.exit(4)
  }
  if (!authCheck.body.authenticated) {
    console.error('Authenticated check failed; admin cookie not recognized')
    process.exit(5)
  }

  console.log('Smoke test passed: editor enabled and admin authenticated')
}

main().catch(err => {
  console.error('Error in smoke test:', err)
  process.exit(1)
})
