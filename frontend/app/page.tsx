'use client';

import { useState } from 'react';
import DependencyGraph from './components/DependencyGraph';
import TableView from './components/TableView';
import FailureAnalysisView from './components/FailureAnalysisView';

type ViewMode = 'graph' | 'table' | 'failure-analysis';

// Move API_URL outside component to create stable reference and prevent infinite re-renders
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('failure-analysis');

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-white">
      {/* Header - Full Width */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="px-8 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-200">
            🚀 Rocket Engine Monitor
          </h1>
          <p className="mt-1 text-xs text-slate-500 pl-[2.5em]">
            Failure Detection & Alert System
          </p>
        </div>
      </header>

      {/* Main Content Area - Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="flex w-44 flex-col border-r border-slate-800 bg-slate-900">
          {/* Navigation Buttons */}
          <nav className="flex flex-col gap-2 p-4">
            <button
              onClick={() => setViewMode('failure-analysis')}
              className={`
                group relative flex h-12 items-center justify-start px-4 rounded-lg transition-all
                ${viewMode === 'failure-analysis'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent'
                }
              `}
            >
              <span className="text-sm font-medium">Failure Analysis</span>
            </button>

            <button
              onClick={() => setViewMode('graph')}
              className={`
                group relative flex h-12 items-center justify-start px-4 rounded-lg transition-all whitespace-nowrap
                ${viewMode === 'graph'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent'
                }
              `}
            >
              <span className="text-sm font-medium">Network View</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`
                group relative flex h-12 items-center justify-start px-4 rounded-lg transition-all
                ${viewMode === 'table'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent'
                }
              `}
            >
              <span className="text-sm font-medium">Table View</span>
            </button>
          </nav>
        </aside>

        {/* View Container */}
        <main className="flex-1 overflow-hidden">
          {viewMode === 'failure-analysis' ? (
            <FailureAnalysisView apiUrl={API_URL} />
          ) : viewMode === 'graph' ? (
            <DependencyGraph apiUrl={API_URL} />
          ) : (
            <TableView apiUrl={API_URL} />
          )}
        </main>
      </div>
    </div>
  );
}
