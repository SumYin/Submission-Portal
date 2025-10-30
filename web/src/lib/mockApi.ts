/* Simple local mock of the backend using localStorage.
 * This lets the UI function before wiring up the Python backend.
 */
import { Form, FormId, FormSpec, Paginated, Profile, Submission, SubmissionId, User, UserId } from "./types"

const LS_KEY = {
  users: "sp.users",
  session: "sp.session",
  profile: "sp.profile",
  forms: "sp.forms",
  submissions: "sp.submissions",
} as const

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export async function signUp(params: { username: string; password: string; email?: string }): Promise<User> {
  const users = load<Record<string, { user: User; password: string }>>(LS_KEY.users, {})
  const exists = Object.values(users).find((u) => u.user.username === params.username)
  if (exists) throw new Error("Username already exists")
  const id = uid("usr")
  const user: User = { id, username: params.username, email: params.email }
  users[id] = { user, password: params.password }
  save(LS_KEY.users, users)
  save(LS_KEY.session, { userId: id })
  // bootstrap empty profile
  save(LS_KEY.profile, { [id]: {} as Profile })
  return user
}

export async function signIn(params: { username: string; password: string }): Promise<User> {
  const users = load<Record<string, { user: User; password: string }>>(LS_KEY.users, {})
  const pair = Object.values(users).find((u) => u.user.username === params.username)
  if (!pair || pair.password !== params.password) throw new Error("Invalid credentials")
  save(LS_KEY.session, { userId: pair.user.id })
  return pair.user
}

export async function getCurrentUser(): Promise<User | null> {
  const session = load<{ userId: string } | null>(LS_KEY.session, null)
  if (!session) return null
  const users = load<Record<string, { user: User; password: string }>>(LS_KEY.users, {})
  return users[session.userId]?.user ?? null
}

export async function signOut(): Promise<void> {
  save(LS_KEY.session, null as any)
}

export async function getProfile(): Promise<Profile> {
  const user = await getCurrentUser()
  if (!user) return {}
  const all = load<Record<UserId, Profile>>(LS_KEY.profile, {})
  return all[user.id] ?? {}
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
  const all = load<Record<UserId, Profile>>(LS_KEY.profile, {})
  const updated: Profile = { ...(all[user.id] ?? {}), ...patch }
  all[user.id] = updated
  save(LS_KEY.profile, all)
  return updated
}

export async function createForm(input: Omit<FormSpec, "code" | "createdAt" | "createdBy"> & { code?: string }): Promise<Form> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
  const code = (input.code ?? Math.random().toString().slice(2, 8)).slice(0, 6)
  const form: Form = {
    id: uid("frm"),
    title: input.title,
    description: input.description,
    code,
    constraints: input.constraints,
    allowMultipleSubmissionsPerUser: input.allowMultipleSubmissionsPerUser,
    maxSubmissionsPerUser: input.maxSubmissionsPerUser,
    opensAt: input.opensAt,
    closesAt: input.closesAt,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
  }
  const forms = load<Record<FormId, Form>>(LS_KEY.forms, {})
  forms[form.id] = form
  save(LS_KEY.forms, forms)
  return form
}

export async function listMyForms(): Promise<Form[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const forms = load<Record<FormId, Form>>(LS_KEY.forms, {})
  return Object.values(forms).filter((f) => f.createdBy === user.id)
}

export async function getForm(id: FormId): Promise<Form | null> {
  const forms = load<Record<FormId, Form>>(LS_KEY.forms, {})
  return forms[id] ?? null
}

export async function getFormByCode(code: string): Promise<Form | null> {
  const forms = load<Record<FormId, Form>>(LS_KEY.forms, {})
  return Object.values(forms).find((f) => f.code === code) ?? null
}

export async function updateForm(id: FormId, patch: Partial<FormSpec>): Promise<Form> {
  const forms = load<Record<FormId, Form>>(LS_KEY.forms, {})
  const current = forms[id]
  if (!current) throw new Error("Form not found")
  const updated: Form = { ...current, ...patch }
  forms[id] = updated
  save(LS_KEY.forms, forms)
  return updated
}

export async function getFormSubmissions(id: FormId): Promise<Paginated<Submission>> {
  const all = load<Record<SubmissionId, Submission>>(LS_KEY.submissions, {})
  const items = Object.values(all).filter((s) => s.formId === id)
  return { items, total: items.length, page: 1, pageSize: items.length || 1 }
}

export async function validateFormCode(code: string): Promise<{ ok: boolean; form: Form | null; reason?: string }> {
  const form = await getFormByCode(code)
  if (!form) return { ok: false, form: null, reason: "Code not found" }
  const now = Date.now()
  if (form.opensAt && now < Date.parse(form.opensAt)) return { ok: false, form, reason: "Submissions not open yet" }
  if (form.closesAt && now > Date.parse(form.closesAt)) return { ok: false, form, reason: "Submissions closed" }
  return { ok: true, form }
}

export async function uploadSubmission(params: {
  code: string
  file: File
  onProgress?: (percent: number) => void
}): Promise<{ ok: boolean; submission?: Submission; errors?: string[] }> {
  const form = await getFormByCode(params.code)
  if (!form) return { ok: false, errors: ["Invalid code"] }
  // Simple client-side validation for size/type; backend will be source of truth later
  const errors: string[] = []
  const { constraints } = form
  if (constraints.minSizeBytes && params.file.size < constraints.minSizeBytes)
    errors.push(`File smaller than minimum ${constraints.minSizeBytes} bytes`)
  if (constraints.maxSizeBytes && params.file.size > constraints.maxSizeBytes)
    errors.push(`File larger than maximum ${constraints.maxSizeBytes} bytes`)
  if (constraints.allowedTypes && constraints.allowedTypes.length > 0) {
    const ok = constraints.allowedTypes.includes(params.file.type)
    if (!ok) errors.push(`File type ${params.file.type || "unknown"} not allowed`)
  }
  if (errors.length) return { ok: false, errors }

  // Fake upload progress
  if (params.onProgress) {
    for (let p = 0; p <= 100; p += 20) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 120))
      params.onProgress(p)
    }
  } else {
    await new Promise((r) => setTimeout(r, 500))
  }

  const user = await getCurrentUser()
  const submission: Submission = {
    id: uid("sub"),
    formId: form.id,
    submittedBy: user?.id ?? null,
    status: "accepted",
    filename: params.file.name,
    sizeBytes: params.file.size,
    mimeType: params.file.type || "",
    createdAt: new Date().toISOString(),
  }
  const all = load<Record<SubmissionId, Submission>>(LS_KEY.submissions, {})
  all[submission.id] = submission
  save(LS_KEY.submissions, all)
  return { ok: true, submission }
}

export async function listMySubmissions(): Promise<Submission[]> {
  const user = await getCurrentUser()
  const all = load<Record<SubmissionId, Submission>>(LS_KEY.submissions, {})
  const items = Object.values(all).filter((s) => (user ? s.submittedBy === user.id : true))
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
