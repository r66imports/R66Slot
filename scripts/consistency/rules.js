/**
 * Declared project invariants — the things TypeScript and ESLint cannot know.
 *
 * This file is the rule list. When a new invariant is agreed (a new mirrored
 * file, a new deliberate exception), it is added HERE, in the repo, so the
 * check survives beyond the conversation that produced it.
 */

/**
 * Files that must stay byte-for-byte identical between R66Slot and R66Emporium.
 * Paths are relative to each repo's root.
 *
 * Only add a file here when the two sites are meant to share it verbatim. Most
 * files are intentionally different — this is an allow-list, never a sweep.
 *
 * An entry may be a plain path, or { file, allow: [/regex/] } where a line
 * matching one of the patterns is permitted to differ per site. Every other
 * line must still match, so an exception stays as narrow as it was declared.
 */
const MIRRORED_FILES = [
  // Account Skins — R66Slot is master (Rules 64 / 69)
  {
    file: 'src/lib/account-skins.ts',
    // The localStorage key is namespaced per site, so a customer's skin choice
    // on one site never leaks into the other.
    allow: [/^export const SKIN_STORAGE_KEY = /],
  },
  'src/styles/account-skins.css',
  'src/components/account/AccountSkinProvider.tsx',
  'src/components/account/SkinPicker.tsx',

  // Events + Event Checklists — R66Slot is master for both sites.
  // The payment-split lib is deliberately NOT mirrored; it differs per site.
  'src/app/(admin)/admin/events/page.tsx',
  'src/app/(admin)/admin/event-checklists/page.tsx',
  'src/app/api/admin/events/route.ts',
  'src/app/api/admin/events/[id]/route.ts',
  'src/app/api/admin/event-checklists/route.ts',
]

/**
 * Admin pages deliberately absent from ALL_PERMISSIONS in
 * src/lib/admin-permissions.ts.
 *
 * An unregistered page is invisible to staff and ungated — so each entry here
 * is a decision, not a backlog. Add a page only once it has been confirmed as
 * admin-only-by-design or genuinely dead, and say which in the comment.
 */
const PERMISSION_EXEMPT = [
  // --- Kept and registered by the user on 20 Sept 2026, so the parent
  // /admin/catalogue permission now covers these by prefix. Left here only as
  // a record: catalogue/categories can still rewrite a category slug (and so
  // its public URL) on rename, which /admin/categories never does.

  // --- One-off Revo SKU migration tool (RS-XXX -> RSXXX). Admin-only by
  // design; staff have no reason to reach a migration runner.
  '/admin/migrate',

  // --- Unlinked, still undecided. Each has no inbound href anywhere, so it is
  // reachable only by typing the URL. Exempted to keep the check at zero, NOT
  // because they have been cleared. Resolve each, then delete or register.
  '/admin/costing', //            748 lines; the live costing UI is the modal in admin/layout.tsx
  '/admin/shipments-register', // 552 lines; /admin/shipments "Packing List" is the registered one
]

/** Sister repo, relative to this repo's root. Absent on Railway; skipped there. */
const SISTER_REPO = '../r66emporium'

module.exports = { MIRRORED_FILES, PERMISSION_EXEMPT, SISTER_REPO }
