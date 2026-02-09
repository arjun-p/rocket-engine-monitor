'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [components, setComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    async function fetchComponents() {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/components`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setComponents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch components');
        console.error('Error fetching components:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchComponents();
  }, [API_URL]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                🚀 Rocket Engine Monitor
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Powered by Prometheux Platform
              </p>
            </div>
            <a
              href={`${API_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              API Docs
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
            <p className="mt-4 text-slate-400">Loading components...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-red-400">Error</h3>
                <p className="mt-1 text-sm text-red-300">{error}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Make sure the backend API is running at: {API_URL}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    Total Components
                  </p>
                  <p className="mt-1 text-3xl font-bold">{components.length}</p>
                </div>
                <div className="rounded-full bg-green-500/10 p-4">
                  <div className="h-8 w-8 text-2xl">✓</div>
                </div>
              </div>
            </div>

            {/* Components Grid */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Components</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {components.map((componentId, index) => (
                  <div
                    key={index}
                    className="group rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all hover:border-blue-500/50 hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 rounded-full bg-slate-700 p-2 text-sm">
                        🔧
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {componentId}
                        </p>
                        <p className="text-xs text-slate-500">
                          Component #{index + 1}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Info */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
              <p className="text-sm text-slate-400">
                Data fetched from:{' '}
                <a
                  href={API_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {API_URL}
                </a>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}