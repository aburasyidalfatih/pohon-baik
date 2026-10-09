import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { id } from '@payloadcms/translations/languages/id'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { contentCollections } from './collections/content'
import { Children, Families, Parents } from './collections/family'
import { Kurikulum } from './globals/Kurikulum'
import { trackingCollections } from './collections/tracking'
import { Orders } from './collections/billing'
import { migrations } from './migrations'

// Push skema otomatis hanya untuk database lokal saat pengembangan. Database server selalu lewat migrasi,
// termasuk saat seed dijalankan dari laptop melalui tunnel SSH.
const DB_URL = process.env.DATABASE_URL || ''
const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(DB_URL) && process.env.DB_TUNNEL !== 'true'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.SERVER_URL || '',
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' · Pohon Baik Admin' },
    importMap: { baseDir: path.resolve(dirname) },
    suppressHydrationWarning: true,
  },
  i18n: { supportedLanguages: { id, en }, fallbackLanguage: 'id' },
  collections: [...contentCollections, Media, Users, Parents, Families, Children, ...trackingCollections, Orders],
  globals: [Kurikulum],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    idType: 'uuid',
    pool: { connectionString: DB_URL },
    push: isLocalDb && process.env.NODE_ENV !== 'production',
    migrationDir: path.resolve(dirname, 'migrations'),
    // Production: skema dikelola lewat migrasi (dev memakai push otomatis).
    prodMigrations: migrations,
  }),
  sharp,
  plugins: [],
})
