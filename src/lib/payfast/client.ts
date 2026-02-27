import crypto from 'crypto'

export const PAYFAST_URL =
  process.env.PAYFAST_SANDBOX === 'true'
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process'

/**
 * Builds the PayFast form parameters including the MD5 signature.
 * All values are URL-encoded with + for spaces (PayFast requirement).
 */
export function buildPayFastParams(data: {
  returnUrl: string
  cancelUrl: string
  notifyUrl: string
  nameFirst: string
  emailAddress: string
  mPaymentId: string
  amount: number
  itemName: string
  itemDescription?: string
}): Record<string, string> {
  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY
  const passphrase = process.env.PAYFAST_PASSPHRASE

  if (!merchantId || !merchantKey) {
    throw new Error('PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY must be set')
  }

  const params: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: data.returnUrl,
    cancel_url: data.cancelUrl,
    notify_url: data.notifyUrl,
    name_first: data.nameFirst,
    email_address: data.emailAddress,
    m_payment_id: data.mPaymentId,
    amount: data.amount.toFixed(2),
    item_name: data.itemName,
  }

  if (data.itemDescription) {
    params.item_description = data.itemDescription
  }

  params.signature = generateSignature(params, passphrase)
  return params
}

/**
 * Generates the MD5 signature for a set of PayFast parameters.
 */
export function generateSignature(
  params: Record<string, string>,
  passphrase?: string
): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&')

  const sigString = passphrase
    ? `${parts}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : parts

  return crypto.createHash('md5').update(sigString).digest('hex')
}

/**
 * Verifies the signature on an incoming ITN request from PayFast.
 */
export function verifyITNSignature(
  body: Record<string, string>,
  passphrase?: string
): boolean {
  const { signature, ...rest } = body
  if (!signature) return false
  const expected = generateSignature(rest, passphrase)
  return expected === signature
}
