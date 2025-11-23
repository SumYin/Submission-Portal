"use client"

import { useEffect, useState } from "react"
import { getBackendStatus } from "@/lib/api"
import DebugFileInfo from "@/components/DebugFileInfo"

export default function DebugPage() {
    const [status, setStatus] = useState<any>(null)
    const [loading, setLoading] = useState(true)
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

                <DebugFileInfo />
            </div>
        </div>
    )
}

