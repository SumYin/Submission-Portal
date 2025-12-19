"use client"

import { useEffect, useState } from "react"
import { getBackendStatus, resetSystem } from "@/lib/api"
import DebugFileInfo from "@/components/DebugFileInfo"
import { Button } from "@/components/ui/button"

export default function DebugPage() {
    const [status, setStatus] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [resetting, setResetting] = useState(false)
    const [resetResult, setResetResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
    const [env, setEnv] = useState<any>({})

    useEffect(() => {
        setEnv({
            API_BASE: process.env.NEXT_PUBLIC_API_BASE_URL,
            AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE,
        })

        getBackendStatus()
            .then(setStatus)
            .finally(() => setLoading(false))
    }, [])

    const handleReset = async () => {
        if (!confirm("⚠️ WARNING: This will delete ALL uploads and clear the entire database. This action cannot be undone. Are you sure?")) {
            return
        }

        setResetting(true)
        setResetResult(null)
        try {
            const result = await resetSystem()
            setResetResult(result)
            
            // Refresh backend status after reset
            if (result.success) {
                setTimeout(() => {
                    getBackendStatus().then(setStatus)
                }, 500)
            }
        } finally {
            setResetting(false)
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">System Debug</h1>

            <div className="space-y-6">
                <section className="p-4 border rounded bg-gray-50 dark:bg-gray-900">
                    <h2 className="font-semibold mb-2">Frontend Environment</h2>
                    <pre className="text-sm overflow-auto p-2 bg-white dark:bg-black rounded border">
                        {JSON.stringify(env, null, 2)}
                    </pre>
                </section>

                <section className="p-4 border rounded bg-gray-50 dark:bg-gray-900">
                    <h2 className="font-semibold mb-2">Backend Connection</h2>
                    {loading ? (
                        <div className="text-gray-500">Checking connection...</div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                Status:
                                <span className={`px-2 py-0.5 rounded text-sm font-medium ${status?.status === 'online' ? 'bg-green-100 text-green-800' :
                                    status?.status === 'mock' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {status?.status || 'Unknown'}
                                </span>
                            </div>
                            <pre className="text-sm overflow-auto p-2 bg-white dark:bg-black rounded border">
                                {JSON.stringify(status, null, 2)}
                            </pre>
                        </div>
                    )}
                </section>

                <section className="p-4 border rounded bg-red-50 dark:bg-red-950/20">
                    <h2 className="font-semibold mb-3 text-red-800 dark:text-red-300">Danger Zone</h2>
                    <div className="space-y-3">
                        <p className="text-sm text-red-700 dark:text-red-400">
                            Reset will delete all uploads and clear the database. This action cannot be undone.
                        </p>
                        <Button 
                            onClick={handleReset} 
                            disabled={resetting || status?.status !== 'online'}
                            variant="destructive"
                        >
                            {resetting ? 'Resetting...' : 'Reset System'}
                        </Button>
                        {resetResult && (
                            <div className={`p-3 rounded border text-sm ${
                                resetResult.success 
                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                                    : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                            }`}>
                                {resetResult.success ? '✓ ' : '✗ '}
                                {resetResult.message || resetResult.error}
                            </div>
                        )}
                    </div>
                </section>

                <DebugFileInfo />
            </div>
        </div>
    )
}

