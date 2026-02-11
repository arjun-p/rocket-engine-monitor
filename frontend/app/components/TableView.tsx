'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface Component {
  id: string;
  symptomCode: string | null;
  isObservable: string;
  status: string;
  relatedSymptom: string | null;
  team: string;
}

interface Relationship {
  source: string;
  target: string;
}

interface ComponentRow {
  id: string;
  team: string;
  status: string;
  symptomCode: string | null;
  incomingCount: number;
  outgoingCount: number;
  totalConnections: number;
  incoming: string[];
  outgoing: string[];
}

interface TableViewProps {
  apiUrl: string;
}

export default function TableView({ apiUrl }: TableViewProps) {
  const [components, setComponents] = useState<Component[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'incoming' | 'outgoing' | 'total'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [componentsRes, relationshipsRes] = await Promise.all([
          fetch(`${apiUrl}/components`),
          fetch(`${apiUrl}/relationships`),
        ]);

        if (!componentsRes.ok || !relationshipsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const componentsData: Component[] = await componentsRes.json();
        const relationshipsData: Relationship[] = await relationshipsRes.json();

        setComponents(componentsData);
        setRelationships(relationshipsData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    }

    loadData();
  }, [apiUrl]);

  const componentRows = useMemo(() => {
    const rows: ComponentRow[] = components.map((comp) => {
      const incoming = relationships
        .filter((rel) => rel.target === comp.id)
        .map((rel) => rel.source);
      const outgoing = relationships
        .filter((rel) => rel.source === comp.id)
        .map((rel) => rel.target);

      return {
        id: comp.id,
        team: comp.team,
        status: comp.status,
        symptomCode: comp.symptomCode,
        incomingCount: incoming.length,
        outgoingCount: outgoing.length,
        totalConnections: incoming.length + outgoing.length,
        incoming,
        outgoing,
      };
    });

    return rows;
  }, [components, relationships]);

  const filteredRows = useMemo(() => {
    return componentRows.filter((row) =>
      row.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [componentRows, searchTerm]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;

      switch (sortBy) {
        case 'id':
          compareA = a.id;
          compareB = b.id;
          break;
        case 'incoming':
          compareA = a.incomingCount;
          compareB = b.incomingCount;
          break;
        case 'outgoing':
          compareA = a.outgoingCount;
          compareB = b.outgoingCount;
          break;
        case 'total':
          compareA = a.totalConnections;
          compareB = b.totalConnections;
          break;
      }

      if (typeof compareA === 'string' && typeof compareB === 'string') {
        return sortDirection === 'asc'
          ? compareA.localeCompare(compareB)
          : compareB.localeCompare(compareA);
      }

      return sortDirection === 'asc'
        ? (compareA as number) - (compareB as number)
        : (compareB as number) - (compareA as number);
    });

    return sorted;
  }, [filteredRows, sortBy, sortDirection]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) {
      return <span className="text-slate-600">↕</span>;
    }
    return <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
          <p className="text-slate-400">Loading components...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-center">
          <div className="mb-2 text-2xl">⚠️</div>
          <h3 className="text-lg font-semibold text-red-400">Error</h3>
          <p className="mt-1 text-sm text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-950">
      {/* Controls */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 p-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-slate-500">Components: </span>
                <span className="font-bold text-blue-400">{filteredRows.length}</span>
                {searchTerm && (
                  <span className="text-slate-600"> / {components.length}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500">Relationships: </span>
                <span className="font-bold text-green-400">{relationships.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-300"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-2">
                    Component ID
                    <SortIcon column="id" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-300"
                  onClick={() => handleSort('incoming')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Incoming
                    <SortIcon column="incoming" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-300"
                  onClick={() => handleSort('outgoing')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Outgoing
                    <SortIcon column="outgoing" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-300"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Total
                    <SortIcon column="total" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className="border-b border-slate-800/50 transition-colors hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-3">
                      <code className="text-sm font-mono text-blue-300">
                        {row.id.replace(/_/g, ' ')}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300">
                        {row.incomingCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                        {row.outgoingCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                        {row.totalConnections}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                        className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        {expandedRow === row.id ? '▼ Hide' : '▶ Details'}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === row.id && (
                    <tr className="bg-slate-900/80">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {/* Incoming connections */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                              Incoming Connections ({row.incomingCount})
                            </h4>
                            {row.incoming.length > 0 ? (
                              <div className="space-y-1">
                                {row.incoming.map((comp) => (
                                  <div
                                    key={comp}
                                    className="rounded bg-slate-800/50 px-3 py-1.5 font-mono text-xs text-slate-300"
                                  >
                                    {comp.replace(/_/g, ' ')}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-600">No incoming connections</p>
                            )}
                          </div>

                          {/* Outgoing connections */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-green-400">
                              Outgoing Connections ({row.outgoingCount})
                            </h4>
                            {row.outgoing.length > 0 ? (
                              <div className="space-y-1">
                                {row.outgoing.map((comp) => (
                                  <div
                                    key={comp}
                                    className="rounded bg-slate-800/50 px-3 py-1.5 font-mono text-xs text-slate-300"
                                  >
                                    {comp.replace(/_/g, ' ')}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-600">No outgoing connections</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {sortedRows.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500">No components match your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
