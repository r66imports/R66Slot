import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * Upload a file to Cloudflare R2.
 * Returns the full public URL of the uploaded file.
 */
export async function r2Upload(
  key: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
    Body: data,
    ContentType: contentType,
  }))
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
}

/**
 * Delete a file from Cloudflare R2 by its key (filename).
 */
export async function r2Delete(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
  }))
}
