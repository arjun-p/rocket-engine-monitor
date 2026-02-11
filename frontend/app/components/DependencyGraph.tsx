'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import NodeDetailCard from './NodeDetailCard';

// Register dagre extension
cytoscape.use(dagre);

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [degreeCentrality, setDegreeCentrality] = useState<DegreeCentralityResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<DegreeCentralityNode | null>(null);

  // Create centrality map for quick lookup when nodes are clicked
  const centralityMap = useMemo(() => {
    if (!degreeCentrality?.nodes) return new Map<string, DegreeCentralityNode>();
    return new Map(
      degreeCentrality.nodes.map(node => [node.component_id, node])
    );
  }, [degreeCentrality]);

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

        const maxDegree = degreeCentralityData.metadata.max_degree;
        const minDegree = Math.min(...degreeCentralityData.nodes.map(n => n.degree));

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
          layout: {
            name: 'dagre',
            rankDir: 'TB',           // Top to Bottom - leaf components at bottom
            nodeSep: 120,            // Horizontal spread
            rankSep: 15,             // Short arrows
            animate: true,
            animationDuration: 500,
          } as any,
        });

        cyRef.current = cy;

        // Apply degree centrality sizing from backend data
        cy.one('layoutstop', () => {
          setTimeout(() => {
            console.log('=== DEGREE CENTRALITY SIZING DEBUG ===');
            console.log('Max degree:', maxDegree, 'Min degree:', minDegree);
            console.log('Total nodes in degreeMap:', degreeMap.size);

            // Apply proportional sizing based on backend degree centrality
            cy.nodes().forEach(node => {
              const nodeId = node.id();
              const degree = degreeMap.get(nodeId);

              if (degree === undefined) {
                console.warn(`No degree found for node: ${nodeId}`);
                return;
              }

              // Use exponential scaling for more visual distinction
              const baseSize = 50;
              const maxSize = 150;

              // Normalize to 0-1 range
              const normalizedDegree = maxDegree > minDegree
                ? (degree - minDegree) / (maxDegree - minDegree)
                : 0.5;

              // Apply exponential curve for more dramatic differences
              const scaledValue = Math.pow(normalizedDegree, 0.7); // Soften the curve slightly
              const size = baseSize + (scaledValue * (maxSize - baseSize));

              console.log(`${nodeId}: degree=${degree}, normalized=${normalizedDegree.toFixed(2)}, size=${size.toFixed(0)}px`);

              node.style({
                'width': size,
                'height': size,
                'font-size': `${10 + scaledValue * 8}px`, // 10-18px font scaling
              });
            });

            cy.fit();                      // Fit all elements
            cy.zoom(cy.zoom() * 0.85);     // Zoom out 15% for padding
            cy.center();
          }, 100);
        });

        // Add interaction handlers
        cy.on('tap', 'node', (evt) => {
          const node = evt.target;
          const componentId = node.data('id');

          // Get full centrality data from map and show detail card
          const nodeData = centralityMap.get(componentId);
          if (nodeData) {
            setSelectedNode(nodeData);
          }

          // Reset all highlights
          cy.elements().removeClass('highlighted');

          // Highlight connected edges
          const connectedEdges = node.connectedEdges();
          connectedEdges.addClass('highlighted');

          // Highlight connected nodes
          const connectedNodes = connectedEdges.connectedNodes();
          connectedNodes.style({
            'border-width': 3,
            'border-color': '#34d399',
          });
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            // Clicked on background - reset all highlights and close card
            setSelectedNode(null);
            cy.elements().removeClass('highlighted');
            cy.nodes().style({
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
    };
  }, [apiUrl]);

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
          {degreeCentrality?.metadata.most_central_component && (
            <div className="mt-3 border-t border-slate-700 pt-3 text-sm">
              <p className="text-slate-400 text-xs">Most Connected:</p>
              <p className="text-sm font-semibold text-orange-400">
                {degreeCentrality.metadata.most_central_component.replace(/_/g, ' ')}
              </p>
            </div>
          )}
          <div className="mt-4 border-t border-slate-700 pt-4 text-xs text-slate-500">
            💡 Click nodes to highlight connections
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
    </div>
  );
}