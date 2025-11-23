/**
 * API contract for the Submission Portal front-end.
 *
 * By default this uses a local in-memory/localStorage mock so you can build UI now.
 * Later, swap to a real Python backend by setting NEXT_PUBLIC_API_BASE_URL and
 * implementing the fetch calls below.
 */
import { Form, FormId, FormSpec, Paginated, Profile, Submission, User, UserId } from "./types"
import * as mock from "./mockApi"
import { fireAuthChanged } from "./auth-events"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
const AUTH_MODE = (process.env.NEXT_PUBLIC_AUTH_MODE || "token").toLowerCase() as "token" | "cookie"

// Basic token storage (header X-Auth-Token provided by backend on sign-in/up)
const TOKEN_KEY = "sp.token"
function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
function setToken(token: string | null) {
  if (typeof window === "undefined") return
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error("API base URL not configured")
  const headers = new Headers(init?.headers)
  // Only set default Content-Type if not already set and not sending FormData
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  const token = getToken()
  if (AUTH_MODE === "token" && token) headers.set("Authorization", `Bearer ${token}`)
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: AUTH_MODE === "cookie" ? "include" : "omit" })
  // Capture new token if provided
  const newToken = res.headers.get("X-Auth-Token")
  if (newToken) setToken(newToken)
  if (res.status === 204) return undefined as unknown as T
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized")
    const msg = await res.text()
    throw new Error(msg || `Request failed: ${res.status}`)
  }
  const ct = res.headers.get("Content-Type") || ""
  if (ct.includes("application/json")) return (await res.json()) as T
  return (await res.text()) as unknown as T
}

function shouldUseMock() {
  return !API_BASE
}

// Debug
export async function getBackendStatus(): Promise<any> {
  if (shouldUseMock()) return { status: "mock", message: "Using local mock API" }
  try {
    return await request<any>("/api/debug", { method: "GET" })
  } catch (err) {
    return { status: "error", message: String(err) }
  }
}

// Auth
export async function signUp(params: { username: string; password: string; email?: string }): Promise<User> {
  if (shouldUseMock()) {
    const u = await mock.signUp(params)
    fireAuthChanged()
    return u
  }
  const user = await request<User>(`/auth/signup`, {
    method: "POST",
    body: JSON.stringify(params),
  })
  fireAuthChanged()
  return user
}

export async function signIn(params: { username: string; password: string }): Promise<User> {
  if (shouldUseMock()) {
    const u = await mock.signIn(params)
    fireAuthChanged()
    return u
  }
  const user = await request<User>(`/auth/signin`, {
    method: "POST",
    body: JSON.stringify(params),
  })
  fireAuthChanged()
  return user
}

export async function getCurrentUser(): Promise<User | null> {
  if (shouldUseMock()) return mock.getCurrentUser()
  try {
    const user = await request<User>(`/me`, { method: "GET" })
    return user
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes("unauthorized")) return null
    throw err
  }
}

export async function signOut(): Promise<void> {
  if (shouldUseMock()) {
    await mock.signOut()
    fireAuthChanged()
    return
  }
  await request<void>(`/auth/signout`, { method: "POST" })
  if (AUTH_MODE === "token") setToken(null)
  fireAuthChanged()
}

// Profile
export async function getProfile(): Promise<Profile> {
  if (shouldUseMock()) return mock.getProfile()
  return request<Profile>(`/me/profile`, { method: "GET" })
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  if (shouldUseMock()) return mock.updateProfile(patch)
  return request<Profile>(`/me/profile`, { method: "PATCH", body: JSON.stringify(patch) })
}

// Public user lookup
export async function getUser(userId: UserId): Promise<User | null> {
  if (shouldUseMock()) return mock.getUser(userId)
  try {
    return await request<User>(`/users/${userId}`, { method: "GET" })
  } catch {
    return null
  }
}

export async function getUserProfile(userId: UserId): Promise<Profile> {
  if (shouldUseMock()) return mock.getUserProfile(userId)
  return request<Profile>(`/users/${userId}/profile`, { method: "GET" })
}

// Forms (Creator)
export async function createForm(input: Omit<FormSpec, "code" | "createdAt" | "createdBy"> & { code?: string }): Promise<Form> {
  if (shouldUseMock()) return mock.createForm(input)
  return request<Form>(`/forms`, { method: "POST", body: JSON.stringify(input) })
}

export async function listMyForms(): Promise<Form[]> {
  if (shouldUseMock()) return mock.listMyForms()
  return request<Form[]>(`/forms/mine`, { method: "GET" })
}

export async function getForm(id: FormId): Promise<Form | null> {
  if (shouldUseMock()) return mock.getForm(id)
  try {
    return await request<Form>(`/forms/${id}`, { method: "GET" })
  } catch {
    return null
  }
}

export async function getFormByCode(code: string): Promise<Form | null> {
  if (shouldUseMock()) return mock.getFormByCode(code)
  try {
    return await request<Form>(`/forms/code/${encodeURIComponent(code)}`, { method: "GET" })
  } catch {
    return null
  }
}

export async function updateForm(id: FormId, patch: Partial<FormSpec>): Promise<Form> {
  if (shouldUseMock()) return mock.updateForm(id, patch)
  return request<Form>(`/forms/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export async function getFormSubmissions(id: FormId): Promise<Paginated<Submission>> {
  if (shouldUseMock()) return mock.getFormSubmissions(id)
  return request<Paginated<Submission>>(`/forms/${id}/submissions`, { method: "GET" })
}

// Submissions (Submitter)
export async function validateFormCode(code: string): Promise<{ ok: boolean; form: Form | null; reason?: string }> {
  if (shouldUseMock()) return mock.validateFormCode(code)
  return request<{ ok: boolean; form: Form | null; reason?: string }>(
    `/submit/${encodeURIComponent(code)}/validate`,
    { method: "GET" }
  )
}

export async function uploadSubmission(params: {
  code: string
  file: File
  onProgress?: (percent: number) => void
}): Promise<{ ok: boolean; submission?: Submission; errors?: string[] }> {
  if (shouldUseMock()) return mock.uploadSubmission(params)

  const formData = new FormData()
  formData.append("file", params.file)

  // Note: fetch doesn't support progress natively easily without XHR or streams
  // For now we just await the result.

  try {
    const res = await request<{ ok: boolean; submission?: Submission; errors?: string[] }>(
      `/submit/${encodeURIComponent(params.code)}`,
      {
        method: "POST",
        body: formData,
      }
    )
    if (params.onProgress) params.onProgress(100)
    return res
  } catch (err) {
    return { ok: false, errors: [String(err)] }
  }
}

export async function listMySubmissions(): Promise<Submission[]> {
  if (shouldUseMock()) return mock.listMySubmissions()
  return request<Submission[]>(`/me/submissions`, { method: "GET" })
}

export async function deleteSubmission(id: string): Promise<void> {
  if (shouldUseMock()) return mock.deleteSubmission(id)
  return request<void>(`/submissions/${id}`, { method: "DELETE" })
}

export async function deleteForm(id: string): Promise<void> {
  if (shouldUseMock()) return mock.deleteForm(id as FormId)
  return request<void>(`/forms/${id}`, { method: "DELETE" })
}

// File Downloads
export async function downloadSubmissionFile(submissionId: string, filename: string): Promise<void> {
  if (shouldUseMock()) {
    // Mock mode: create placeholder
    const content = `This is a placeholder file for ${filename}.\nBackend download will be wired later.`
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename || "file.txt"
    a.click()
    URL.revokeObjectURL(url)
    return
  }

  // Real mode: download from backend
  if (!API_BASE) throw new Error("API base URL not configured")
  const url = `${API_BASE}/submissions/${submissionId}/download`

  const headers = new Headers()
  const token = getToken()
  if (AUTH_MODE === "token" && token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: AUTH_MODE === "cookie" ? "include" : "omit"
  })

  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`)
  }

  const blob = await res.blob()
  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = downloadUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(downloadUrl)
}

// Debug Endpoints
export async function uploadFileForDebugInfo(file: File): Promise<any> {
  if (shouldUseMock()) {
    return {
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      tools: ["mock"],
      message: "Mock mode - no real extraction available"
    }
  }

  const formData = new FormData()
  formData.append("file", file)

  return request<any>(`/debug/file-info`, {
    method: "POST",
    body: formData,
  })
}

