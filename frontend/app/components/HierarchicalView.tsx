'use client';

import { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';

interface Relationship {
  source: string;
  target: string;
}

interface HierarchicalViewProps {
  apiUrl: string;
}

export default function HierarchicalView({ apiUrl }: HierarchicalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    async function loadGraph() {
      try {
        setLoading(true);

        // Fetch components and relationships in parallel
        const [componentsRes, relationshipsRes] = await Promise.all([
          fetch(`${apiUrl}/components`),
          fetch(`${apiUrl}/relationships`),
        ]);

        if (!componentsRes.ok || !relationshipsRes.ok) {
          throw new Error('Failed to fetch graph data');
        }

        const components: string[] = await componentsRes.json();
        const relationships: Relationship[] = await relationshipsRes.json();

        // Transform to Cytoscape format
        const nodes: ElementDefinition[] = components.map((id) => ({
          data: { id, label: id.replace(/_/g, ' ') },
        }));

        const edges: ElementDefinition[] = relationships.map((rel, index) => ({
          data: {
            id: `edge-${index}`,
            source: rel.source,
            target: rel.target,
          },
        }));

        setStats({ nodes: nodes.length, edges: edges.length });

        // Initialize Cytoscape
        if (cyRef.current) {
          cyRef.current.destroy();
        }

        const cy = cytoscape({
          container: containerRef.current,
          elements: [...nodes, ...edges],
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#1e40af', // blue-800
                label: 'data(label)',
                color: '#e2e8f0', // slate-200
                'text-valign': 'center',
                'text-halign': 'center',
                'font-size': '11px',
                'font-family': 'monospace',
                'font-weight': '600',
                width: 60,
                height: 50,
                shape: 'roundrectangle',
                'border-width': 2,
                'border-color': '#3b82f6', // blue-500
                'text-wrap': 'wrap',
                'text-max-width': '100px',
                'padding': '8px',
              },
            },
            {
              selector: 'edge',
              style: {
                width: 2,
                'line-color': '#475569', // slate-600
                'target-arrow-color': '#3b82f6',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'arrow-scale': 1.2,
              },
            },
            {
              selector: 'node:selected',
              style: {
                'background-color': '#059669', // green-600
                'border-color': '#10b981', // green-500
                'border-width': 3,
              },
            },
            {
              selector: 'edge.highlighted',
              style: {
                'line-color': '#10b981', // green-500
                'target-arrow-color': '#10b981',
                width: 3,
              },
            },
          ],
          layout: {
            name: 'breadthfirst', // Hierarchical top-to-bottom layout
            directed: true,
            spacingFactor: 1.5,
            animate: true,
            animationDuration: 500,
            avoidOverlap: true,
            nodeDimensionsIncludeLabels: true,
          },
        });

        cyRef.current = cy;

        // Add interaction handlers
        cy.on('tap', 'node', (evt) => {
          const node = evt.target;

          // Reset all highlights
          cy.elements().removeClass('highlighted');

          // Highlight connected edges
          const connectedEdges = node.connectedEdges();
          connectedEdges.addClass('highlighted');

          // Highlight connected nodes
          const connectedNodes = connectedEdges.connectedNodes();
          connectedNodes.style({
            'border-width': 3,
            'border-color': '#10b981',
          });
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            // Clicked on background - reset all highlights
            cy.elements().removeClass('highlighted');
            cy.nodes().style({
              'border-width': 2,
              'border-color': '#3b82f6',
            });
          }
        });

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load graph');
        setLoading(false);
      }
    }

    loadGraph();

    // Cleanup
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [apiUrl]);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/90">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
            <p className="text-slate-400">Loading hierarchical view...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/90">
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-center">
            <div className="mb-2 text-2xl">⚠️</div>
            <h3 className="text-lg font-semibold text-red-400">Error</h3>
            <p className="mt-1 text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute left-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-800/90 p-4 backdrop-blur">
          <div className="text-xs font-semibold text-slate-300 mb-2">HIERARCHICAL LAYOUT</div>
          <div className="text-sm">
            <p className="text-slate-400">Nodes:</p>
            <p className="text-xl font-bold text-blue-400">{stats.nodes}</p>
          </div>
          <div className="mt-2 text-sm">
            <p className="text-slate-400">Edges:</p>
            <p className="text-xl font-bold text-green-400">{stats.edges}</p>
          </div>
          <div className="mt-4 border-t border-slate-700 pt-4 text-xs text-slate-500">
            💡 Top-to-bottom flow • Click nodes to highlight
          </div>
        </div>
      )}

      <div ref={containerRef} className="h-full w-full bg-slate-950" />
    </div>
  );
}
