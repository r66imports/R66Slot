import { NextRequest, NextResponse } from 'next/server'

// Orders → Actions → Send to WhatsApp. Sends the document PDF straight to the
// client's phone number from the business WhatsApp number (WhatsApp Cloud API).
// Nothing opens on the admin's device.
//
// Env: WHATSAPP_API_URL, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
// Optional WHATSAPP_ORDER_TEMPLATE (+ WHATSAPP_TEMPLATE_LANG, default en):
// an approved Meta template with a DOCUMENT header and body {{1}} = first name,
// {{2}} = "Invoice INV0026". Without a template Meta only delivers to clients
// who messaged the business in the last 24 hours.

function waNumber(phone: string): string {
  let n = (phone || '').replace(/[^0-9]/g, '')
  if (n.startsWith('00')) n = n.slice(2)
  if (n.startsWith('0')) n = '27' + n.slice(1)
  return n
}

export async function POST(request: NextRequest) {
  const API = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0'
  const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
  const TEMPLATE = process.env.WHATSAPP_ORDER_TEMPLATE
  const LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en'

  if (!TOKEN || !PHONE_ID || TOKEN.startsWith('your-') || PHONE_ID.startsWith('your-')) {
    return NextResponse.json({ success: false, notConfigured: true, error: 'WhatsApp Business API is not configured on the server (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).' }, { status: 500 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    const to = waNumber(String(form.get('to') || ''))
    const message = String(form.get('message') || '')
    const firstName = String(form.get('firstName') || 'there')
    const docRef = String(form.get('docRef') || '')
    const fileName = String(form.get('fileName') || 'document.pdf')

    if (!file) return NextResponse.json({ success: false, error: 'No PDF supplied' }, { status: 400 })
    if (to.length < 10) return NextResponse.json({ success: false, error: 'Client has no valid phone number on this document' }, { status: 400 })

    // 1. Upload the PDF to WhatsApp media
    const up = new FormData()
    up.append('messaging_product', 'whatsapp')
    up.append('type', 'application/pdf')
    up.append('file', new Blob([await file.arrayBuffer()], { type: 'application/pdf' }), fileName)
    const upRes = await fetch(`${API}/${PHONE_ID}/media`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: up })
    const upData = await upRes.json()
    if (!upRes.ok || !upData.id) {
      console.error('WhatsApp media upload failed:', upData)
      return NextResponse.json({ success: false, error: upData?.error?.message || 'PDF upload to WhatsApp failed' }, { status: 502 })
    }

    // 2. Send it
    const body = TEMPLATE
      ? {
          messaging_product: 'whatsapp', to, type: 'template',
          template: {
            name: TEMPLATE, language: { code: LANG },
            components: [
              { type: 'header', parameters: [{ type: 'document', document: { id: upData.id, filename: fileName } }] },
              { type: 'body', parameters: [{ type: 'text', text: firstName }, { type: 'text', text: docRef }] },
            ],
          },
        }
      : { messaging_product: 'whatsapp', to, type: 'document', document: { id: upData.id, filename: fileName, caption: message } }

    const res = await fetch(`${API}/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('WhatsApp send failed:', data)
      const code = data?.error?.code
      const hint = code === 131047 || code === 131026 ? ' (client has not messaged us in 24h — an approved template is required)' : ''
      return NextResponse.json({ success: false, error: (data?.error?.message || 'WhatsApp send failed') + hint }, { status: 502 })
    }
    return NextResponse.json({ success: true, to, messageId: data.messages?.[0]?.id })
  } catch (e: any) {
    console.error('WhatsApp send error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}
