#!/usr/bin/env node

/**
 * Test script for R66 Freeform Positioning System
 *
 * Validates:
 * 1. Master canvas has position: relative
 * 2. Freeform images use position: absolute
 * 3. Z-index layering is correct (1000+)
 * 4. Percentage-based positioning works correctly
 */

const fs = require('fs');
const path = require('path');

const TESTS = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  TESTS.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ─── Test 1: Master Canvas CSS ───
test('Master canvas has position: relative', () => {
  const cssPath = path.join(__dirname, '../src/styles/responsive-canvas.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert(css.includes('.r66-master-canvas'), 'Missing .r66-master-canvas class');
  assert(css.includes('position: relative'), 'Master canvas must have position: relative');
});

// ─── Test 2: Freeform Image Z-Index ───
test('Freeform images have high z-index (1000+)', () => {
  const cssPath = path.join(__dirname, '../src/styles/responsive-canvas.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert(css.includes('.r66-freeform-image'), 'Missing .r66-freeform-image class');
  assert(css.includes('z-index: 1000'), 'Freeform images must have z-index: 1000+');
});

// ─── Test 3: Freeform Element Component ───
test('FreeformElement uses absolute positioning', () => {
  const componentPath = path.join(__dirname, '../src/components/page-editor/freeform-element.tsx');
  const code = fs.readFileSync(componentPath, 'utf-8');

  assert(code.includes("position: 'absolute'"), 'FreeformElement must use absolute positioning');
  assert(code.includes('r66-freeform-image'), 'FreeformElement must apply r66-freeform-image class for images');
});

// ─── Test 4: R66Editor uses master canvas ───
test('R66Editor applies r66-master-canvas class', () => {
  const editorPath = path.join(__dirname, '../src/components/page-editor/r66-editor.tsx');
  const code = fs.readFileSync(editorPath, 'utf-8');

  assert(code.includes('r66-master-canvas'), 'R66Editor canvas must have r66-master-canvas class');
  assert(code.includes('data-canvas="true"'), 'Canvas must have data-canvas attribute');
});

// ─── Test 5: Percentage-based positioning utilities exist ───
test('Responsive positioning utilities exist', () => {
  const utilsPath = path.join(__dirname, '../src/lib/editor/responsive-positioning.ts');
  assert(fs.existsSync(utilsPath), 'Missing responsive-positioning.ts');

  const code = fs.readFileSync(utilsPath, 'utf-8');
  assert(code.includes('xPercent'), 'Must support percentage-based x coordinate');
  assert(code.includes('yPercent'), 'Must support percentage-based y coordinate');
  assert(code.includes('widthPercent'), 'Must support percentage-based width');
  assert(code.includes('heightPercent'), 'Must support percentage-based height');
});

// ─── Test 6: Position migration utilities exist ───
test('Position migration utilities exist', () => {
  const migrationPath = path.join(__dirname, '../src/lib/editor/position-migration.ts');
  assert(fs.existsSync(migrationPath), 'Missing position-migration.ts');

  const code = fs.readFileSync(migrationPath, 'utf-8');
  assert(code.includes('migrateComponentPosition'), 'Must have migration function');
  assert(code.includes('hasNormalizedPosition'), 'Must have position check function');
});

// ─── Run Tests ───
console.log('\n🧪 R66 Freeform Positioning Tests\n');
console.log('═'.repeat(50));

for (const { name, fn } of TESTS) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

console.log('═'.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}

console.log('✨ All freeform positioning tests passed!\n');
