/**
 * Address autocomplete backed by Photon (OpenStreetMap) — server side only.
 *
 * Photon is a free, keyless geocoder built specifically for type-ahead search.
 * No API key, no billing account, no usage contract. The public instance asks
 * for fair use, so requests are debounced and gated to signed-in customers.
 *
 * PHOTON_URL can point at a self-hosted instance if the public one ever starts
 * rate-limiting us; it defaults to the public endpoint.
 *
 * Unlike Google, Photon returns the full parsed address with the suggestion
 * itself, so there is no second "details" call — one request per lookup.
 *
 * Docs: https://photon.komoot.io  Attribution: © OpenStreetMap contributors
 */

export const PHOTON_URL = process.env.PHOTON_URL || 'https://photon.komoot.io'

/** Countries the address form offers, mapped to ISO-3166 codes for filtering. */
export const COUNTRY_TO_ISO: Record<string, string> = {
  'South Africa': 'ZA',
  'Zimbabwe': 'ZW',
  'Namibia': 'NA',
  'Botswana': 'BW',
  'Mozambique': 'MZ',
  'Zambia': 'ZM',
  'Lesotho': 'LS',
  'Eswatini': 'SZ',
  'United Kingdom': 'GB',
  'United States': 'US',
  'Australia': 'AU',
  'Canada': 'CA',
  'Germany': 'DE',
  'France': 'FR',
  'Netherlands': 'NL',
}

/** Reverse lookup so a result's country code maps back onto our <select>. */
export const ISO_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_TO_ISO).map(([name, iso]) => [iso, name])
)

/**
 * Country bounding boxes as "minLon,minLat,maxLon,maxLat".
 *
 * Photon has no country parameter. A lat/lon bias is far too weak to help — a
 * search for "12 Long Street" biased to the middle of South Africa still comes
 * back entirely British, American and Australian. `bbox` genuinely restricts the
 * search area, so that is what keeps results inside the country the customer
 * picked in the form.
 */
export const COUNTRY_BBOX: Record<string, string> = {
  ZA: '16.45,-34.85,32.95,-22.12',
  ZW: '25.24,-22.42,33.07,-15.61',
  NA: '11.72,-28.97,25.26,-16.95',
  BW: '19.99,-26.91,29.37,-17.78',
  MZ: '30.21,-26.87,40.85,-10.47',
  ZM: '21.99,-18.08,33.71,-8.22',
  LS: '27.01,-30.67,29.46,-28.57',
  SZ: '30.79,-27.32,32.14,-25.72',
  GB: '-8.65,49.86,1.77,60.86',
  US: '-171.8,18.9,-66.9,71.4',   // includes Alaska and Hawaii
  AU: '112.92,-43.74,153.64,-10.06',
  CA: '-141.0,41.68,-52.62,83.11',
  DE: '5.87,47.27,15.04,55.06',
  FR: '-5.14,41.33,9.56,51.09',   // metropolitan France
  NL: '3.36,50.75,7.23,53.56',
}

export interface ParsedAddress {
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  country: string
  formatted: string
}

export interface AddressSuggestion {
  id: string
  /** Bold first line — "12 Long Street". */
  mainText: string
  /** Grey second line — "Gardens, Cape Town, Western Cape". */
  secondaryText: string
  /** Every form field, already parsed — no second request needed on pick. */
  address: ParsedAddress
}

interface PhotonFeature {
  properties?: {
    osm_id?: number | string
    osm_type?: string
    osm_key?: string
    osm_value?: string
    type?: string
    name?: string
    housenumber?: string
    street?: string
    district?: string
    city?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
    countrycode?: string
  }
}

/**
 * OSM tags South African suburbs with the electoral ward that contains them, so
 * `district` comes back as "Johannesburg Ward 124" or "Sol Plaatje Ward 23" as
 * often as it comes back as a real suburb like "Gardens" or "City Centre".
 * A ward number is not part of anyone's postal address, so it is dropped.
 */
function isAdminNoise(value: string): boolean {
  return /\bward\s*\d+/i.test(value) || /\bmunicipality\b/i.test(value)
}

/**
 * `city` is sometimes the municipality rather than the town — "Theewaterskloof
 * Local Municipality". Trimming the suffix leaves a name a courier can read.
 */
function cleanPlaceName(value: string): string {
  return value.replace(/\s+(Local|Metropolitan|District)\s+Municipality$/i, '').trim()
}

/**
 * Turn one Photon feature into our form fields.
 *
 * Photon returns a flat properties bag — each part of the address is its own
 * named key, so this is a rename-and-join rather than any kind of text parsing:
 *
 *   housenumber + street  → "12" + "Long Street"   → Address Line 1
 *   district              → "Gardens" (SA suburb)  → appended to Line 1
 *   city / county         → "Cape Town"            → City
 *   state                 → "Western Cape"         → Province / State
 *   postcode              → "8001"                 → Postal Code
 *   countrycode           → "ZA" → "South Africa"  → Country
 *
 * Three shape-level details are handled here:
 *  - A street-level result (no house number) has the street in `name` rather
 *    than `street`, so `name` is the fallback for Line 1.
 *  - South African results put the suburb in `district` and the town in `city`;
 *    the form's Line 1 asks for "street, complex, suburb", so the suburb is
 *    appended to Line 1 rather than overwriting City — but only once the ward
 *    names OSM also files under `district` have been stripped out.
 *  - Smaller towns come back with no `city` at all — City falls back through
 *    district then county so the field is not left blank.
 *
 * Country is resolved from `countrycode`, not the country name, so localised
 * spellings still snap onto our <select> options.
 */
export function parseFeature(feature: PhotonFeature): AddressSuggestion | null {
  const p = feature.properties
  if (!p) return null

  const street = p.street || p.name || ''
  if (!street) return null   // nothing address-shaped to show

  // Ward names and municipality wrappers are administrative, not postal.
  const district = p.district && !isAdminNoise(p.district) ? p.district : ''
  const city = cleanPlaceName(p.city || district || p.county || '')

  const line1 = [[p.housenumber, street].filter(Boolean).join(' ')]
  if (district && district !== city) line1.push(district)

  const address1 = line1.filter(Boolean).join(', ')
  const iso = (p.countrycode || '').toUpperCase()

  const address: ParsedAddress = {
    address1,
    address2: '',   // Photon carries no unit/floor detail — the user fills this in
    city,
    state: p.state || '',
    zip: p.postcode || '',
    country: ISO_TO_COUNTRY[iso] || p.country || '',
    formatted: [address1, city, p.state, p.postcode, p.country].filter(Boolean).join(', '),
  }

  return {
    id: `${p.osm_type || ''}${p.osm_id || ''}-${address1}`,
    mainText: [p.housenumber, street].filter(Boolean).join(' '),
    secondaryText: [district, city, p.state, p.country]
      .filter((v, i, arr) => v && arr.indexOf(v) === i)   // drop repeats: "Cape Town, Cape Town"
      .join(', '),
    address,
  }
}
