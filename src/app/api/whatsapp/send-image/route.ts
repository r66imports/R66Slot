import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, caption, to } = await request.json()

    if (!imageUrl || !to) {
      return NextResponse.json(
        { error: 'Image URL and recipient number are required' },
        { status: 400 }
      )
    }

    // WhatsApp Business API credentials
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL
    const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!WHATSAPP_API_URL || !WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { error: 'WhatsApp Business API is not configured. Please set up your environment variables.' },
        { status: 500 }
      )
    }

    // Send image via WhatsApp Business API
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption || '',
          },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', data)
      return NextResponse.json(
        { error: 'Failed to send WhatsApp image', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: data.messages?.[0]?.id,
      data,
    })
  } catch (error) {
    console.error('Error sending WhatsApp image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
