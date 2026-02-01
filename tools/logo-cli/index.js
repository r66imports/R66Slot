#!/usr/bin/env node
const { program } = require('commander')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

function makeSvg({ text, width = 800, height = 200, fontSize = 72, color = '#000', bg = 'transparent' }) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n  <rect width="100%" height="100%" fill="${bg}"/>\n  <text x="50%" y="50%" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="${color}" dominant-baseline="middle" text-anchor="middle">${escaped}</text>\n</svg>`
}

async function createLogo(opts) {
  const { text, out, width, height, fontSize, color, bg, format } = opts
  if (!text) throw new Error('--text is required')
  const svg = makeSvg({ text, width, height, fontSize, color, bg })
  const buf = Buffer.from(svg)
  const outPath = out || `logo.${format || 'png'}`
  await sharp(buf).toFile(outPath)
  console.log('Wrote', outPath)
}

async function overlay({ base, logo, out, gravity = 'southeast', dx = 10, dy = 10 }) {
  if (!base || !logo) throw new Error('base and logo required')
  const outPath = out || `composite-${path.basename(base)}`
  const baseImg = sharp(base)
  const metadata = await baseImg.metadata()
  const logoBuf = fs.readFileSync(logo)
  await baseImg
    .composite([
      { input: logoBuf, gravity, left: dx === 0 ? undefined : parseInt(dx, 10), top: dy === 0 ? undefined : parseInt(dy, 10) }
    ])
    .toFile(outPath)
  console.log('Wrote', outPath)
}

program
  .command('create-logo')
  .description('Create a simple logo from text (SVG -> PNG/JPEG)')
  .requiredOption('-t, --text <text>', 'Text for the logo')
  .option('-o, --out <file>', 'Output file (defaults to logo.png)')
  .option('--width <n>', 'Width', parseInt)
  .option('--height <n>', 'Height', parseInt)
  .option('--font-size <n>', 'Font size', parseInt)
  .option('--color <hex>', 'Text color', '#000')
  .option('--bg <color>', 'Background color (or transparent)', 'transparent')
  .option('--format <fmt>', 'Output format png|jpg', 'png')
  .action(async (opts) => {
    try {
      await createLogo(opts)
    } catch (err) {
      console.error(err.message)
      process.exit(1)
    }
  })

program
  .command('overlay')
  .description('Overlay a logo onto a base image')
  .requiredOption('-b, --base <file>', 'Base image path')
  .requiredOption('-l, --logo <file>', 'Logo image path (png preferred)')
  .option('-o, --out <file>', 'Output file')
  .option('--gravity <g>', 'Gravity (north, south, east, west, center, northeast, southeast, etc.)', 'southeast')
  .option('--dx <n>', 'Horizontal offset (pixels)', '10')
  .option('--dy <n>', 'Vertical offset (pixels)', '10')
  .action(async (opts) => {
    try {
      await overlay(opts)
    } catch (err) {
      console.error(err.message)
      process.exit(1)
    }
  })

program
  .command('resize')
  .description('Resize an image')
  .requiredOption('-i, --in <file>', 'Input file')
  .requiredOption('-o, --out <file>', 'Output file')
  .option('--width <n>', 'Width', parseInt)
  .option('--height <n>', 'Height', parseInt)
  .action(async (opts) => {
    try {
      const img = sharp(opts.in)
      const width = opts.width || null
      const height = opts.height || null
      await img.resize(width, height).toFile(opts.out)
      console.log('Wrote', opts.out)
    } catch (err) {
      console.error(err.message)
      process.exit(1)
    }
  })

program.parse(process.argv)
