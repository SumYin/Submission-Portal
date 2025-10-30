"use client"

export function downloadBlob(filename: string, mimeType: string, data: string | Blob | ArrayBuffer) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function toCSV(rows: any[], headers?: { key: string; label?: string }[]): string {
  if (!rows || rows.length === 0) return ""
  const keys = headers?.map((h) => h.key) ?? Object.keys(rows[0])
  const labels = headers?.map((h) => h.label || h.key) ?? keys
  const esc = (v: any) => {
    if (v == null) return ""
    const s = String(v)
    if (s.includes("\n") || s.includes(",") || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [labels.join(","), ...rows.map((r) => keys.map((k) => esc((r as any)[k])).join(","))]
  return lines.join("\n")
}

export function exportToCSV(filename: string, rows: any[], headers?: { key: string; label?: string }[]) {
  const csv = toCSV(rows, headers)
  downloadBlob(filename, "text/csv;charset=utf-8", csv)
}

export function exportToJSON(filename: string, rows: any[]) {
  const json = JSON.stringify(rows, null, 2)
  downloadBlob(filename, "application/json", json)
}

// Placeholders for file and bulk downloads until backend endpoints are ready.
export async function downloadFakeFile(filename: string, info: Record<string, any>) {
  const content = `This is a placeholder file for ${filename}.\nDetails: ${JSON.stringify(info, null, 2)}\n\nBackend download will be wired later.`
  downloadBlob(filename || "file.txt", "text/plain", content)
}

export async function downloadZipPlaceholder(zipName: string, items: Array<{ filename: string; id?: string }>) {
  const name = zipName.endsWith(".zip") ? zipName : `${zipName}.zip`
  const manifest = {
    info: "Placeholder ZIP manifest. Backend will generate real ZIP.",
    count: items.length,
    files: items.map((x) => x.filename),
  }
  const content = `ZIP placeholder: ${JSON.stringify(manifest, null, 2)}`
  downloadBlob(name.replace(/\s+/g, "-").toLowerCase(), "text/plain", content)
}
