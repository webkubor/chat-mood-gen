import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const lightMark = join(publicDir, 'logo.svg')
const darkMark = join(publicDir, 'logo-dark.svg')

for (const size of [192, 512]) {
  await sharp(darkMark)
    .resize(size, size)
    .flatten({ background: '#2C3639' })
    .png()
    .toFile(join(publicDir, `pwa-${size}x${size}.png`))
}

const faviconSize = 32
const png = await sharp(lightMark).resize(faviconSize, faviconSize).png().toBuffer()

// A single 32-bit ICO entry using PNG image data.
const header = Buffer.alloc(22)
header.writeUInt16LE(1, 2) // Icon file
header.writeUInt16LE(1, 4) // One image
header[6] = header[7] = faviconSize
header.writeUInt16LE(1, 10)
header.writeUInt16LE(32, 12)
header.writeUInt32LE(png.length, 14)
header.writeUInt32LE(header.length, 18)
await writeFile(join(publicDir, 'favicon.ico'), Buffer.concat([header, png]))
