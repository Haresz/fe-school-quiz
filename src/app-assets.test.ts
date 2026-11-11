import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type ManifestIcon = {
  src: string
  sizes: string
  type: string
  purpose?: string
}

type WebManifest = {
  name: string
  short_name: string
  lang: string
  start_url: string
  display: string
  theme_color: string
  background_color: string
  icons: ManifestIcon[]
}

const root = process.cwd()
const pngMagic = '89504e470d0a1a0a'

function readText(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function readManifest(): WebManifest {
  return JSON.parse(readText('public/manifest.webmanifest')) as WebManifest
}

function publicPath(src: string): string {
  return join(root, 'public', src.replace(/^\//, ''))
}

describe('aset ikon dan manifest', () => {
  it('mendeklarasikan manifest yang bisa dipasang', () => {
    const manifest = readManifest()

    expect(manifest).toMatchObject({
      name: 'Quiz Maker',
      short_name: 'Quiz Maker',
      lang: 'id',
      start_url: '/',
      display: 'standalone',
      theme_color: '#2750d8',
      background_color: '#f7f9ff',
    })
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
      ]),
    )
  })

  it('menyediakan semua berkas ikon yang dirujuk manifest', () => {
    for (const icon of readManifest().icons) {
      const path = publicPath(icon.src)
      expect(existsSync(path), `${icon.src} tidak ada`).toBe(true)

      const contents = readFileSync(path)

      if (icon.type === 'image/png') {
        expect(contents.subarray(0, 8).toString('hex')).toBe(pngMagic)
      } else {
        expect(contents.toString('utf8').trimStart().startsWith('<svg')).toBe(
          true,
        )
      }
    }
  })

  it('menautkan ikon dan manifest dari index.html', () => {
    const html = readText('index.html')

    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="icon" href="/icon.svg"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toMatch(/favicon-32\.png/)
    expect(html).toMatch(/favicon-16\.png/)
  })
})
