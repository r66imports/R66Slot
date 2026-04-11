import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/media/sync
// Body: { oldUrl: string, newUrl: string }
// Updates all references to oldUrl across products and pages tables
export async function POST(request: Request) {
  try {
    const { oldUrl, newUrl } = await request.json()
    if (!oldUrl || !newUrl) {
      return NextResponse.json({ error: 'oldUrl and newUrl are required' }, { status: 400 })
    }

    let productsUpdated = 0
    let pagesUpdated = 0

    // --- Products: update image_url column ---
    const imageUrlResult = await db.query(
      `UPDATE products SET image_url = $2 WHERE image_url = $1`,
      [oldUrl, newUrl]
    )
    productsUpdated += imageUrlResult.rowCount ?? 0

    // --- Products: update images JSONB array (array of URL strings) ---
    // Replace any element in the images array that matches oldUrl
    const imagesResult = await db.query(
      `UPDATE products
       SET images = (
         SELECT jsonb_agg(
           CASE WHEN elem::text = $1::jsonb::text THEN $2::jsonb ELSE elem END
         )
         FROM jsonb_array_elements(COALESCE(images, '[]'::jsonb)) AS elem
       )
       WHERE images @> $1::jsonb`,
      [JSON.stringify([oldUrl]), JSON.stringify(newUrl)]
    )
    productsUpdated += imagesResult.rowCount ?? 0

    // --- Pages: update components JSONB ---
    // Replace all occurrences of the URL string within the components JSON blob
    const pagesResult = await db.query(
      `UPDATE pages
       SET components = CAST(
         replace(components::text, $1, $2)
         AS jsonb
       )
       WHERE components::text LIKE $3`,
      [oldUrl, newUrl, `%${oldUrl}%`]
    )
    pagesUpdated += pagesResult.rowCount ?? 0

    // --- Media library: update the media_files record itself ---
    await db.query(
      `UPDATE media_files SET url = $2 WHERE url = $1`,
      [oldUrl, newUrl]
    )

    return NextResponse.json({
      success: true,
      products: productsUpdated,
      pages: pagesUpdated,
    })
  } catch (error: any) {
    console.error('Media sync error:', error)
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}
