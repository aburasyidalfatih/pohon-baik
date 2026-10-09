import type { Access, PayloadRequest, Where } from 'payload'

// Peran staf (koleksi `users`). Orang tua ada di koleksi `parents`.
export const STAFF_ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Tim konten', value: 'konten' },
  { label: 'Peninjau (ustadz/psikolog)', value: 'peninjau' },
  { label: 'Dukungan pengguna', value: 'dukungan' },
] as const
export type StaffRole = (typeof STAFF_ROLES)[number]['value']

type Req = Pick<PayloadRequest, 'user'>
export const isStaff = (req: Req) => req.user?.collection === 'users'
export const isParent = (req: Req) => req.user?.collection === 'parents'
export const staffHas = (req: Req, ...roles: StaffRole[]) =>
  req.user?.collection === 'users' && roles.some((r) => (req.user as { roles?: string[] }).roles?.includes(r))

export const authenticated: Access = ({ req }) => !!req.user
export const adminOnly: Access = ({ req }) => staffHas(req, 'admin')
export const contentEditors: Access = ({ req }) => staffHas(req, 'admin', 'konten')
export const contentReviewers: Access = ({ req }) => staffHas(req, 'admin', 'konten', 'peninjau')
/** Data keluarga & anak (data pribadi, UU PDP): hanya admin dan dukungan di sisi staf. */
export const familyDataStaff = (req: Req) => staffHas(req, 'admin', 'dukungan')

/** Daftar id keluarga tempat orang tua yang login menjadi anggota. */
export async function familyIdsOf(req: PayloadRequest): Promise<(string | number)[]> {
  if (!isParent(req) || !req.user) return []
  const res = await req.payload.find({
    collection: 'families',
    where: { 'members.parent': { equals: req.user.id } },
    depth: 0,
    limit: 50,
    pagination: false,
    overrideAccess: true,
    req,
    select: {},
  })
  return res.docs.map((d) => d.id)
}

export const familyMemberWhere = async (req: PayloadRequest, field: string): Promise<boolean | Where> => {
  if (familyDataStaff(req)) return true
  const ids = await familyIdsOf(req)
  return ids.length ? { [field]: { in: ids } } : false
}
