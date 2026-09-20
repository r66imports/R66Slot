#!/usr/bin/env node
/**
 * Project-invariant checker.
 *
 * TypeScript proves the code type-checks; this proves the code still agrees
 * with itself. It catches the class of bug where a change lands in one place
 * and the older copy of the same decision survives somewhere else:
 *
 *   1. admin pages that exist but were never registered for staff permissions
 *   2. files meant to be verbatim mirrors of the sister site that have drifted
 *
 * Exit code 1 on any violation, so it can gate a push.
 */

const fs = require('fs')
const path = require('path')
const Module = require('module')
const { MIRRORED_FILES, PERMISSION_EXEMPT, SISTER_REPO } = require('./rules')

/**
 * Load a TypeScript module and return its real exports.
 *
 * The permission check runs the app's OWN canAccessPath rather than a copy of
 * it. A copy would be one more place for the same decision to live, which is
 * the exact failure this script exists to catch — an early version of this
 * check reimplemented the logic, dropped its `p !== '/admin'` guard, and
 * passed all 77 pages while being wrong.
 *
 * The file this loads is deliberately dependency-free. If it ever gains an
 * import, this throws and the check reports it, rather than quietly passing.
 */
function loadTsModule(absPath) {
  const ts = require('typescript')
  const source = fs.readFileSync(absPath, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: absPath,
  })
  const mod = new Module(absPath, null)
  mod.filename = absPath
  mod.paths = Module._nodeModulePaths(path.dirname(absPath))
  mod._compile(outputText, absPath)
  return mod.exports
}

const ROOT = path.resolve(__dirname, '..', '..')
const findings = []
const notes = []

function report(check, detail, fix) {
  findings.push({ check, detail, fix })
}

/** Every page.tsx under a directory, as a route path. */
function findPages(dir, baseUrl) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...findPages(full, `${baseUrl}/${entry.name}`))
    } else if (entry.name === 'page.tsx') {
      out.push(baseUrl)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// 1. Admin permission registry coverage
// ---------------------------------------------------------------------------
function checkAdminPermissions() {
  const permFile = path.join(ROOT, 'src/lib/admin-permissions.ts')
  if (!fs.existsSync(permFile)) {
    report('admin-permissions', 'src/lib/admin-permissions.ts not found', 'Has the file moved? Update this check.')
    return
  }
  let perms
  try {
    perms = loadTsModule(permFile)
  } catch (err) {
    report(
      'admin-permissions',
      `could not load admin-permissions.ts — ${err.message}`,
      'This check runs the real canAccessPath. If that file gained an import, or typescript is not installed, fix that first — until then the check is NOT running.'
    )
    return
  }

  const { ALL_PERMISSIONS, ADMIN_ONLY, canAccessPath } = perms
  if (!Array.isArray(ALL_PERMISSIONS) || typeof canAccessPath !== 'function') {
    report(
      'admin-permissions',
      'admin-permissions.ts no longer exports both ALL_PERMISSIONS and canAccessPath',
      'The check depends on both. Update it to match the new shape.'
    )
    return
  }

  const registered = ALL_PERMISSIONS.map((p) => p.href)
  const adminOnly = ADMIN_ONLY || []
  const adminDir = path.join(ROOT, 'src/app/(admin)/admin')
  const pages = findPages(adminDir, '/admin').sort()

  for (const route of pages) {
    // Ask the app itself: with every registered permission granted, could a
    // staff member open this page? If not, nothing grants access to it.
    if (canAccessPath('staff', registered, route)) continue
    // ADMIN_ONLY pages are supposed to refuse staff, so refusal is correct.
    if (adminOnly.some((p) => route === p || route.startsWith(p + '/'))) continue
    if (PERMISSION_EXEMPT.includes(route)) continue
    report(
      'admin-permissions',
      `${route} — no entry in ALL_PERMISSIONS`,
      'Staff cannot see or open it. Register it, or add it to PERMISSION_EXEMPT with a reason.'
    )
  }

  // The reverse: a permission pointing at a page that no longer exists leaves a
  // dead item in the staff nav.
  for (const href of registered) {
    if (!href.startsWith('/admin')) continue
    const dir = path.join(adminDir, href.replace(/^\/admin\/?/, ''))
    if (!fs.existsSync(path.join(dir, 'page.tsx'))) {
      report(
        'admin-permissions',
        `${href} — registered, but no page.tsx exists`,
        'Dead nav entry. Remove the permission, or restore the page.'
      )
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Mirrored-file drift against the sister site
// ---------------------------------------------------------------------------
function checkMirrors() {
  const sister = path.resolve(ROOT, SISTER_REPO)
  if (!fs.existsSync(sister)) {
    notes.push(`sister repo not present at ${SISTER_REPO} — mirror check skipped`)
    return
  }

  // Line endings differ by checkout, not by intent.
  const normalise = (s) => s.replace(/\r\n/g, '\n').replace(/\s+$/, '')

  for (const entry of MIRRORED_FILES) {
    const rel = typeof entry === 'string' ? entry : entry.file
    const allow = (typeof entry === 'string' ? [] : entry.allow) || []
    const mine = path.join(ROOT, rel)
    const theirs = path.join(sister, rel)

    if (!fs.existsSync(mine)) {
      report('mirrors', `${rel} — missing in this repo`, 'Declared as mirrored but not here. Restore it, or drop it from MIRRORED_FILES.')
      continue
    }
    if (!fs.existsSync(theirs)) {
      report('mirrors', `${rel} — missing in the sister repo`, 'Not yet ported. Report the gap; do not port unprompted.')
      continue
    }

    // A declared per-site line is blanked on both sides: the line must still
    // exist in the same place, but its value is allowed to differ.
    const blankAllowed = (text) =>
      text
        .split('\n')
        .map((line) => (allow.some((re) => re.test(line)) ? '<per-site>' : line))
        .join('\n')

    const a = blankAllowed(normalise(fs.readFileSync(mine, 'utf8')))
    const b = blankAllowed(normalise(fs.readFileSync(theirs, 'utf8')))
    if (a === b) continue

    const aLines = a.split('\n')
    const bLines = b.split('\n')
    let firstDiff = 0
    while (firstDiff < aLines.length && aLines[firstDiff] === bLines[firstDiff]) firstDiff++

    report(
      'mirrors',
      `${rel} — drifted (first difference at line ${firstDiff + 1}, ${aLines.length} vs ${bLines.length} lines)`,
      'These must be identical. Fix the master, report the gap, and wait before porting.'
    )
  }
}

// ---------------------------------------------------------------------------

checkAdminPermissions()
checkMirrors()

const LABELS = {
  'admin-permissions': 'Admin permission registry',
  mirrors: 'Sister-site mirrored files',
}

console.log('\nConsistency check — R66Slot\n')
for (const note of notes) console.log(`  note: ${note}`)
if (notes.length) console.log('')

if (!findings.length) {
  console.log('  No inconsistencies found.\n')
  process.exit(0)
}

for (const check of Object.keys(LABELS)) {
  const group = findings.filter((f) => f.check === check)
  if (!group.length) continue
  console.log(`${LABELS[check]} (${group.length})`)
  for (const f of group) {
    console.log(`  - ${f.detail}`)
    console.log(`    ${f.fix}`)
  }
  console.log('')
}

console.log(`${findings.length} inconsistenc${findings.length === 1 ? 'y' : 'ies'}.\n`)
process.exit(1)
