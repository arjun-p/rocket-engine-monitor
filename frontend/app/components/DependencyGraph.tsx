'use client';

import { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import NodeDetailCard from './NodeDetailCard';

// Register dagre extension
cytoscape.use(dagre);

// Layout configuration presets
const layoutConfigs = {
  hierarchy: {
    name: 'dagre',
    rankDir: 'TB',           // Top to Bottom - leaf components at bottom
    nodeSep: 120,            // Horizontal spread
    rankSep: 15,             // Short arrows
    animate: true,
    animationDuration: 500,
  },
  network: {
    name: 'cose',
    animate: true,
    animationDuration: 1000,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 1.2,
    gravity: 1,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  },
};

type LayoutType = 'hierarchy' | 'network';

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

interface DegreeCentralityNode {
  component_id: string;
  degree: number;
  centrality: number;
  centrality_percent: number;
  rank: number;
}

interface DegreeCentralityResponse {
  nodes: DegreeCentralityNode[];
  metadata: {
    total_nodes: number;
    average_degree: number;
    most_central_component: string | null;
    max_degree: number;
  };
}

interface DependencyGraphProps {
  apiUrl: string;
}

export default function DependencyGraph({ apiUrl }: DependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const isInitialMount = useRef(true);
  const graphInitialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [degreeCentrality, setDegreeCentrality] = useState<DegreeCentralityResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<DegreeCentralityNode | null>(null);
  const [layoutType, setLayoutType] = useState<LayoutType>('hierarchy');

  useEffect(() => {
    if (!containerRef.current) return;

    async function loadGraph() {
      try {
        setLoading(true);

        // Fetch components, relationships, and degree centrality in parallel
        const [componentsRes, relationshipsRes, degreeCentralityRes] = await Promise.all([
          fetch(`${apiUrl}/components`),
          fetch(`${apiUrl}/relationships`),
          fetch(`${apiUrl}/degree-centrality`),
        ]);

        if (!componentsRes.ok || !relationshipsRes.ok || !degreeCentralityRes.ok) {
          throw new Error('Failed to fetch graph data');
        }

        const components: Component[] = await componentsRes.json();
        const relationships: Relationship[] = await relationshipsRes.json();
        const degreeCentralityData: DegreeCentralityResponse = await degreeCentralityRes.json();

        // Store degree centrality data in state
        setDegreeCentrality(degreeCentralityData);

        // Create degree lookup map for efficient access
        const degreeMap = new Map<string, number>();
        degreeCentralityData.nodes.forEach(node => {
          degreeMap.set(node.component_id, node.degree);
        });

        // Create full centrality data map for click handlers (avoids closure issue)
        const localCentralityMap = new Map(
          degreeCentralityData.nodes.map(node => [node.component_id, node])
        );

        // Transform to Cytoscape format with degree data
        const nodes: ElementDefinition[] = components.map((comp) => {
          const degree = degreeMap.get(comp.id) || 0;
          return {
            data: {
              id: comp.id,
              label: comp.id,
              degree: degree, // Store degree in node data
              team: comp.team,
              status: comp.status,
            },
          };
        });

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
                'background-color': '#3b82f6', // blue-500
                label: 'data(label)', // Just show component name
                color: '#e2e8f0', // slate-200
                'text-valign': 'center',
                'text-halign': 'center',
                'font-size': '12px',
                'font-family': 'monospace',
                width: 80,
                height: 80,
                'border-width': 4,
                'border-color': '#60a5fa', // blue-400
                'text-wrap': 'wrap',
                'text-max-width': '150px',
              },
            },
            {
              selector: 'edge',
              style: {
                width: 2,
                'line-color': '#475569', // slate-600
                'target-arrow-shape': 'none', // No arrows for cleaner view
                'curve-style': 'bezier',
              },
            },
            {
              selector: 'node:selected',
              style: {
                'background-color': '#10b981', // green-500
                'border-color': '#34d399', // green-400
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
          layout: layoutConfigs[layoutType] as any,
        });

        cyRef.current = cy;

        // Apply degree centrality sizing from backend data
        cy.one('layoutstop', () => {
          setTimeout(() => {
            // All nodes same size - no dynamic sizing
            cy.fit();                      // Fit all elements
            cy.zoom(cy.zoom() * 0.85);     // Zoom out 15% for padding
            cy.center();

            // Mark graph as initialized to prevent layout re-run
            graphInitialized.current = true;

            // Auto-select the most central node (rank #1)
            if (degreeCentralityData.nodes.length > 0) {
              const topNode = degreeCentralityData.nodes[0]; // Rank #1
              setSelectedNode(topNode);

              // Highlight the top node with green background + amber border
              const cyNode = cy.getElementById(topNode.component_id);
              if (cyNode.length > 0) {
                cyNode.style({
                  'background-color': '#10b981', // green-500
                  'border-width': 6,
                  'border-color': '#f59e0b', // amber-500
                });
              }
            }
          }, 100);
        });

        // Add interaction handlers
        cy.on('tap', 'node', (evt) => {
          const node = evt.target;
          const componentId = node.data('id');

          // Get full centrality data from local map and show detail card
          const nodeData = localCentralityMap.get(componentId);
          if (nodeData) {
            setSelectedNode(nodeData);
          }

          // Reset all node styles to default
          cy.nodes().style({
            'background-color': '#3b82f6', // blue-500
            'border-width': 4,
            'border-color': '#60a5fa',
          });

          // Highlight only the clicked node with green background + amber border
          node.style({
            'background-color': '#10b981', // green-500
            'border-width': 6,
            'border-color': '#f59e0b', // amber-500 for prominence
          });
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            // Clicked on background - reset all highlights and close card
            setSelectedNode(null);
            cy.elements().removeClass('highlighted');
            cy.nodes().style({
              'background-color': '#3b82f6', // blue-500
              'border-width': 4,
              'border-color': '#60a5fa',
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
      graphInitialized.current = false;
    };
  }, [apiUrl]);

  // Re-run layout when layout type changes (skip until graph is initialized)
  useEffect(() => {
    // Skip until graph is fully initialized to avoid double animation
    if (!graphInitialized.current) {
      return;
    }

    if (!cyRef.current) return;

    const cy = cyRef.current;
    const layout = cy.layout(layoutConfigs[layoutType] as any);
    layout.run();

    // Fit to viewport after layout completes
    layout.on('layoutstop', () => {
      setTimeout(() => {
        cy.fit();
        cy.zoom(cy.zoom() * 0.85);
        cy.center();
      }, 100);
    });
  }, [layoutType]);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/90">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
            <p className="text-slate-400">Loading dependency graph...</p>
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
          <div className="text-sm">
            <p className="text-slate-400">Nodes:</p>
            <p className="text-xl font-bold text-blue-400">{stats.nodes}</p>
          </div>
          <div className="mt-2 text-sm">
            <p className="text-slate-400">Edges:</p>
            <p className="text-xl font-bold text-green-400">{stats.edges}</p>
          </div>
        </div>
      )}

      {/* Layout Toggle Button */}
      {!loading && !error && (
        <div className="absolute bottom-4 left-4 z-10 group">
          <button
            onClick={() => setLayoutType(prev => prev === 'hierarchy' ? 'network' : 'hierarchy')}
            className="rounded-lg bg-slate-800 border border-slate-700 p-2.5 text-slate-200 hover:bg-slate-750 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all shadow-lg"
            title="Toggle view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Toggle view
          </div>
        </div>
      )}

      <div ref={containerRef} className="h-full w-full bg-slate-950" />

      {/* Node Detail Card */}
      {selectedNode && (
        <NodeDetailCard
          nodeData={selectedNode}
          totalNodes={degreeCentrality?.metadata.total_nodes || 30}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Centrality Table */}
      {degreeCentrality && (
        <div className="absolute bottom-6 right-6 w-96 max-h-80 bg-slate-800/95 rounded-lg shadow-2xl border border-slate-700 backdrop-blur-sm overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-200">Network Metrics</h3>
          </div>
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="text-left p-2 text-slate-400 font-medium">Rank</th>
                  <th className="text-left p-2 text-slate-400 font-medium">Component</th>
                  <th className="text-right p-2 text-slate-400 font-medium">Centrality</th>
                  <th className="text-right p-2 text-slate-400 font-medium">Connections</th>
                </tr>
              </thead>
              <tbody>
                {degreeCentrality.nodes.map((node) => (
                  <tr
                    key={node.component_id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedNode(node)}
                  >
                    <td className="p-2 text-slate-300">#{node.rank}</td>
                    <td className="p-2 text-slate-100 font-medium">
                      {node.component_id.replace(/_/g, ' ')}
                    </td>
                    <td className="p-2 text-right text-blue-400 font-mono">
                      {node.centrality.toFixed(4)}
                    </td>
                    <td className="p-2 text-right text-green-400 font-semibold">
                      {node.degree}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}