/**
 * Turn a display name into a URL slug.
 *
 * A category's slug becomes its public address (`/products/<slug>`), so this
 * must produce a single clean path segment. Any run of characters that cannot
 * appear in a URL segment collapses to one hyphen, and leading/trailing
 * hyphens are trimmed:
 *
 *   "1:32 Scale"     -> "1-32-scale"
 *   "Parts & Spares" -> "parts-spares"
 *   "GT/IUMSA"       -> "gt-iumsa"
 *
 * Shared deliberately. This used to be written out three times — twice in the
 * categories admin page and once in the API — and the copies had already
 * drifted: one dropped illegal characters instead of replacing them, so
 * "GT/IUMSA" produced "gt/iumsa" and pointed at a URL that does not exist.
 * Import it; do not re-derive a slug by hand.
 */
export function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
