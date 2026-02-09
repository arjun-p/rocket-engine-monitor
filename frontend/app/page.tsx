'use client';

import DependencyGraph from './components/DependencyGraph';

export default function Home() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-white">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  🚀 Rocket Engine Monitor
                </h1>
                <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400 border border-yellow-500/30">
                  DEMO MODE
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Component Dependency Visualization (Mock Data)
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

      {/* Graph Container - fills remaining height */}
      <main className="flex-1 overflow-hidden">
        <DependencyGraph apiUrl={API_URL} />
      </main>
    </div>
  );
}