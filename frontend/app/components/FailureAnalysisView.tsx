'use client';

import { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import dagre from 'cytoscape-dagre';

// Register dagre layout extension
cytoscape.use(dagre);

interface FailureChain {
  parent: string;
  child: string;
}

interface Hotspot {
  component: string;
  affectedSensors: string[];
  impactScore: number;
}

interface ComponentMetadata {
  id: string;
  symptomCode: string | null;
  isObservable: string;
  status: string;
  relatedSymptom: string | null;
  team: string;
}

interface FailureAnalysisData {
  stage1: {
    failedSensors: string[];
  };
  stage2: {
    failureChains: FailureChain[];
  };
  stage3: {
    hotspots: Hotspot[];
    rootCause: Hotspot | null;
  };
  stage4: {
    alerts: any[];
  };
}

interface FailureAnalysisViewProps {
  apiUrl: string;
}

// Layout configuration presets
const layoutConfigs = {
  hierarchy: {
    name: 'dagre',
    rankDir: 'BT',           // Bottom to Top - LOX_Tank at top
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

export default function FailureAnalysisView({ apiUrl }: FailureAnalysisViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const animatingNodesRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FailureAnalysisData | null>(null);
  const [components, setComponents] = useState<Map<string, ComponentMetadata>>(new Map());
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [layoutType, setLayoutType] = useState<LayoutType>('hierarchy');
  const [hoveredNode, setHoveredNode] = useState<{
    id: string;
    x: number;
    y: number;
    metadata: ComponentMetadata;
  } | null>(null);

  // Fetch failure analysis data
  useEffect(() => {
    async function loadData() {
      // Create abort controller for 6-minute timeout (multi-database Vadalog queries can be slow)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 360000); // 6 minutes (360 seconds)

      try {
        setLoading(true);

        // Fetch both failure analysis data and component metadata in parallel
        const [analysisResponse, componentsResponse] = await Promise.all([
          fetch(`${apiUrl}/failure-analysis`, { signal: controller.signal }),
          fetch(`${apiUrl}/components`)
        ]);

        clearTimeout(timeoutId);

        if (!analysisResponse.ok) {
          throw new Error('Failed to fetch failure analysis data');
        }
        if (!componentsResponse.ok) {
          throw new Error('Failed to fetch component metadata');
        }

        const analysisData: FailureAnalysisData = await analysisResponse.json();
        const componentsData: ComponentMetadata[] = await componentsResponse.json();

        // Convert components array to Map for O(1) lookup
        const componentsMap = new Map<string, ComponentMetadata>();
        componentsData.forEach(comp => {
          componentsMap.set(comp.id, comp);
        });

        setData(analysisData);
        setComponents(componentsMap);
        setLoading(false);
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out after 6 minutes. Multi-database queries are taking longer than expected.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load analysis');
        }
        setLoading(false);
      }
    }

    loadData();
  }, [apiUrl]);

  // Initialize Cytoscape graph once when data loads
  useEffect(() => {
    if (!containerRef.current || !data || components.size === 0) return;

    // Get all unique components from failure chains
    const componentSet = new Set<string>();
    data.stage1.failedSensors.forEach(sensor => componentSet.add(sensor));
    data.stage2.failureChains.forEach(chain => {
      componentSet.add(chain.parent);
      componentSet.add(chain.child);
    });

    // Create nodes
    const nodes: ElementDefinition[] = Array.from(componentSet).map((comp) => ({
      data: {
        id: comp,
        label: comp.replace(/_/g, ' '),
      },
    }));

    // Create edges from failure chains
    // Arrow direction: child → parent (showing failure propagation upward)
    const edges: ElementDefinition[] = data.stage2.failureChains.map((chain, index) => ({
      data: {
        id: `edge-${index}`,
        source: chain.child,   // Failure starts at child
        target: chain.parent,  // Propagates to parent
      },
    }));

    // Initialize Cytoscape only once
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#64748b', // Default: slate-600
            label: 'data(label)',
            color: '#e2e8f0', // slate-200
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '14px',
            'font-family': 'monospace',
            width: 80,
            height: 80,
            'border-width': 4,
            'border-color': '#475569', // slate-700
            'text-wrap': 'wrap',
            'text-max-width': '150px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#475569', // slate-600
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1,
          },
        },
      ],
      layout: layoutConfigs[layoutType] as any,
      minZoom: 0.3,
      maxZoom: 3,
    });

    cyRef.current = cy;

    // Fit the graph to viewport after layout completes with padding
    cy.one('layoutstop', () => {
      // Small delay to ensure layout is fully settled
      setTimeout(() => {
        cy.fit(); // Fit all elements to viewport
        cy.zoom(cy.zoom() * 0.85); // Zoom out 15% to add padding
        cy.center();
      }, 100);
    });

    // Add hover event listeners for node tooltips
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      const metadata = components.get(nodeId);

      if (metadata && containerRef.current) {
        const position = event.renderedPosition || event.position;
        const containerRect = containerRef.current.getBoundingClientRect();

        setHoveredNode({
          id: nodeId,
          x: position.x + containerRect.left + 15, // Offset from cursor
          y: position.y + containerRect.top + 15,
          metadata
        });
      }
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNode(null);
    });

    // Cleanup only on unmount
    return () => {
      if (cyRef.current) {
        // Stop all animations before destroying
        cyRef.current.nodes().stop(true, false);
        cyRef.current.destroy();
        cyRef.current = null;
      }
      // Clear animation tracking
      animatingNodesRef.current.clear();
    };
  }, [data]); // Only depend on data - components loads in parallel and is available when needed

  // Add click handlers for sensor interaction
  useEffect(() => {
    if (!cyRef.current || !data) return;

    const handleNodeClick = (evt: any) => {
      const node = evt.target;
      const nodeId = node.id();

      // Only handle clicks on failed sensors
      if (data.stage1.failedSensors.includes(nodeId)) {
        setSelectedSensor(prev => prev === nodeId ? null : nodeId);
      }
    };

    // Add the event listener
    cyRef.current.on('tap', 'node', handleNodeClick);

    // Cleanup: remove event listener when data changes or unmount
    return () => {
      if (cyRef.current) {
        cyRef.current.off('tap', 'node', handleNodeClick);
      }
    };
  }, [data]);

  // Update styling when selected sensor changes
  useEffect(() => {
    if (!cyRef.current || !data) return;
    applyVisualization(cyRef.current, data, selectedSensor);
  }, [data, selectedSensor]);

  // Re-run layout when layout type changes
  useEffect(() => {
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

  // Animate pulsing glow effect for convergence point
  function animateConvergenceGlow(node: any) {
    if (!node || !node.animate) return;

    const nodeId = node.id();

    // Skip if already animating
    if (animatingNodesRef.current.has(nodeId)) return;

    // Mark as animating
    animatingNodesRef.current.add(nodeId);

    // Stop any existing animations
    node.stop(true, false);

    const pulseAnimation = () => {
      // Check if we should still be animating (node might have been removed)
      if (!node || !cyRef.current) {
        animatingNodesRef.current.delete(nodeId);
        return;
      }

      node.animate(
        {
          style: {
            'border-width': 8,
            width: 75,
            height: 75,
          }
        },
        {
          duration: 1500,
          easing: 'ease-in-out',
          complete: () => {
            if (!node || !cyRef.current) {
              animatingNodesRef.current.delete(nodeId);
              return;
            }
            node.animate(
              {
                style: {
                  'border-width': 4,
                  width: 70,
                  height: 70,
                }
              },
              {
                duration: 1500,
                easing: 'ease-in-out',
                complete: pulseAnimation
              }
            );
          }
        }
      );
    };
    pulseAnimation();
  }

  // Apply visualization based on selected sensor
  function applyVisualization(cy: Core, data: FailureAnalysisData, selectedSensor: string | null = null) {
    const failedSensors = new Set(data.stage1.failedSensors);

    // Use root cause from backend (component with 0 parents)
    const convergencePoint = data.stage3.rootCause || null;

    // Stop animations for nodes that are no longer the convergence point
    animatingNodesRef.current.forEach(nodeId => {
      if (!convergencePoint || nodeId !== convergencePoint.component) {
        const node = cy.getElementById(nodeId);
        if (node) {
          node.stop(true, false);
        }
        animatingNodesRef.current.delete(nodeId);
      }
    });

    // Reset all nodes to default
    cy.nodes().style({
      'background-color': '#475569', // slate-600
      'border-color': '#64748b', // slate-500
      'border-width': 2,
      width: 40,
      height: 40,
      opacity: 0.3,
    });

    cy.edges().style({
      'line-color': '#475569',
      'target-arrow-color': '#475569',
      width: 2,
      opacity: 0.2,
    });

    if (!selectedSensor) {
      // Default view: Show all failed sensors in RED, everything else dimmed
      cy.nodes().forEach(node => {
        const nodeId = node.id();
        const isConvergencePoint = convergencePoint && nodeId === convergencePoint.component;

        if (failedSensors.has(nodeId)) {
          node.style({
            'background-color': '#ef4444', // red-500
            'border-color': '#dc2626', // red-600
            'border-width': 3,
            opacity: 1,
          });
        } else if (isConvergencePoint) {
          // Convergence point with animated pulsing glow
          node.style({
            'background-color': '#dc2626', // red-600
            'border-color': '#ef4444', // red-500
            'border-width': 4,
            width: 70,
            height: 70,
            opacity: 1,
          });
          // Start pulsing animation
          animateConvergenceGlow(node);
        } else {
          node.style({
            'background-color': '#475569', // slate-600
            'border-color': '#64748b',
            'border-width': 2,
            opacity: 0.3,
          });
        }
      });

      cy.edges().style({
        'line-color': '#475569',
        'target-arrow-color': '#475569',
        width: 2,
        opacity: 0.2,
      });
    } else {
      // Sensor selected: Show propagation chains for this sensor
      // Recursively find all ancestors affected by this sensor
      const allAncestors = new Set<string>();
      const directParents = new Set<string>();

      // Build ancestor map for recursive traversal
      function findAncestors(nodeId: string, isDirectParent: boolean = false): void {
        const parentChains = data.stage2.failureChains.filter(
          chain => chain.child === nodeId
        );

        parentChains.forEach(chain => {
          if (!allAncestors.has(chain.parent)) {
            allAncestors.add(chain.parent);
            if (isDirectParent || nodeId === selectedSensor) {
              directParents.add(chain.parent);
            }
            // Recursively find ancestors of this parent
            findAncestors(chain.parent, false);
          }
        });
      }

      // Start recursive traversal from selected sensor
      findAncestors(selectedSensor, true);

      cy.nodes().forEach(node => {
        const nodeId = node.id();
        const isConvergencePoint = convergencePoint && nodeId === convergencePoint.component;

        if (nodeId === selectedSensor) {
          // Selected sensor - bright RED
          const baseStyle: any = {
            'background-color': '#ef4444', // red-500
            'border-color': '#dc2626', // red-600
            'border-width': 4,
            opacity: 1,
          };
          if (isConvergencePoint) {
            baseStyle.width = 70;
            baseStyle.height = 70;
          }
          node.style(baseStyle);
          if (isConvergencePoint) {
            animateConvergenceGlow(node);
          }
        } else if (failedSensors.has(nodeId)) {
          // Other failed sensors - violet at 40%
          node.style({
            'background-color': '#a78bfa', // violet-400
            'border-color': '#a78bfa',
            'border-width': 2,
            opacity: 0.4,
          });
        } else if (directParents.has(nodeId)) {
          // Direct parents - red at 60%
          const baseStyle: any = {
            'background-color': '#ef4444', // red-500
            'border-color': '#ef4444',
            'border-width': 3,
            opacity: 0.6,
          };
          if (isConvergencePoint) {
            baseStyle.width = 70;
            baseStyle.height = 70;
          }
          node.style(baseStyle);
          if (isConvergencePoint) {
            animateConvergenceGlow(node);
          }
        } else if (allAncestors.has(nodeId)) {
          // Ancestors - red at 30%
          const baseStyle: any = {
            'background-color': '#ef4444', // red-500
            'border-color': '#ef4444',
            'border-width': 2,
            opacity: 0.3,
          };
          if (isConvergencePoint) {
            baseStyle.width = 70;
            baseStyle.height = 70;
          }
          node.style(baseStyle);
          if (isConvergencePoint) {
            animateConvergenceGlow(node);
          }
        } else {
          // Unrelated nodes - dimmed
          const baseStyle: any = {
            'background-color': '#475569', // slate-600
            'border-color': '#64748b',
            'border-width': 2,
            opacity: 0.2,
          };
          if (isConvergencePoint) {
            baseStyle['background-color'] = '#dc2626'; // red-600 for visibility
            baseStyle['border-color'] = '#ef4444';
            baseStyle['border-width'] = 4;
            baseStyle.width = 70;
            baseStyle.height = 70;
            baseStyle.opacity = 1;
          }
          node.style(baseStyle);
          if (isConvergencePoint) {
            animateConvergenceGlow(node);
          }
        }
      });

      // Highlight edges in the selected sensor's failure chain
      cy.edges().forEach(edge => {
        const sourceId = edge.source().id();
        const targetId = edge.target().id();

        // Edge is in chain if it connects sensor→parent or any ancestor→ancestor
        const isInSelectedChain =
          (targetId === selectedSensor && allAncestors.has(sourceId)) ||
          (allAncestors.has(targetId) && allAncestors.has(sourceId));

        if (isInSelectedChain) {
          edge.style({
            'line-color': '#ef4444', // red-500
            'target-arrow-color': '#ef4444',
            width: 3,
            opacity: 0.6,
          });
        } else {
          edge.style({
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            width: 1,
            opacity: 0.1,
          });
        }
      });
    }
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
          <p className="text-slate-400">Loading failure analysis...</p>
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

  if (!data) return null;

  // Use root cause from backend (component with 0 parents, calculated by Vadalog)
  const rootCause = data.stage3.rootCause || null;

  return (
    <div className="flex h-full w-full bg-slate-950">
      {/* Graph container */}
      <div className="flex-1 overflow-hidden relative">
        {/* Layout Toggle Button */}
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
        <div ref={containerRef} className="h-full w-full bg-slate-950" />
      </div>

      {/* Right sidebar - Hotspots */}
      <div className="w-96 flex-shrink-0 border-l border-slate-800 bg-slate-900/30 overflow-y-auto">
        <div className="p-4 pr-8">
            {/* Alert Notification */}
            {data.stage4.alerts.length > 0 && rootCause && (
              <div className="mb-6">
                <div className="rounded-lg border border-orange-500/50 bg-orange-500/10 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-orange-400 text-lg">🔔</span>
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Alert Sent</div>
                      <div className="text-sm font-bold text-orange-300">
                        {data.stage4.alerts[0].firstName} {data.stage4.alerts[0].lastName}
                      </div>
                      <div className="text-xs text-slate-400">
                        Team Leader of {data.stage4.alerts[0].team.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-orange-500/20">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Sensors Failed:</div>
                      <div className="flex flex-wrap gap-1">
                        {data.stage1.failedSensors.map((sensor) => (
                          <span key={sensor} className="inline-block rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300">
                            {sensor.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 mb-1">Likely Root Cause:</div>
                      <div className="text-sm font-semibold text-orange-200">
                        {rootCause.component.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Root Cause */}
            {rootCause && (
              <div className="mb-6">
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Likely Root Cause</div>
                  <div className="text-lg font-bold text-red-400">{rootCause.component.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-slate-500 mb-1.5 mt-2">Affected by:</div>
                  <div className="flex flex-wrap gap-1">
                    {rootCause.affectedSensors.map((sensor) => (
                      <span key={sensor} className="inline-block rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300">
                        {sensor.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-sm font-bold text-blue-400 mb-4">Hotspots</h3>

            {data.stage3.hotspots.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-8">
                No hotspots detected
              </div>
            ) : (
              <div className="space-y-3">
                {data.stage3.hotspots.slice(0, 10).map((hotspot) => (
                  <div
                    key={hotspot.component}
                    className="rounded-lg border border-slate-700 bg-slate-900/50 p-3"
                  >
                    <div className="mb-2">
                      <h4 className="text-sm font-bold text-blue-400">
                        {hotspot.component.replace(/_/g, ' ')}
                      </h4>
                    </div>

                    <div className="text-xs text-slate-500 mb-1.5">Affected by:</div>

                    <div className="flex flex-wrap gap-1">
                      {hotspot.affectedSensors.map((sensor) => (
                        <div
                          key={sensor}
                          className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-red-300"
                        >
                          {sensor.replace(/_/g, ' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl"
          style={{
            left: `${hoveredNode.x}px`,
            top: `${hoveredNode.y}px`,
            maxWidth: '250px'
          }}
        >
          <div className="text-sm font-bold text-blue-400 mb-2 border-b border-slate-700 pb-2">
            {hoveredNode.id.replace(/_/g, ' ')}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className={`font-semibold ${
                hoveredNode.metadata.status === 'failed' ? 'text-red-400' :
                hoveredNode.metadata.status === 'passed' ? 'text-green-400' :
                'text-slate-400'
              }`}>
                {hoveredNode.metadata.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Observable:</span>
              <span className="text-slate-300">{hoveredNode.metadata.isObservable}</span>
            </div>
            {hoveredNode.metadata.symptomCode && hoveredNode.metadata.symptomCode !== 'null' && (
              <div className="flex justify-between">
                <span className="text-slate-500">Symptom Code:</span>
                <span className="font-mono text-slate-300">{hoveredNode.metadata.symptomCode}</span>
              </div>
            )}
            {hoveredNode.metadata.relatedSymptom && hoveredNode.metadata.relatedSymptom !== 'null' && (
              <div className="flex justify-between">
                <span className="text-slate-500">Related Symptom:</span>
                <span className="font-mono text-slate-300">{hoveredNode.metadata.relatedSymptom}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Team:</span>
              <span className="text-slate-300">{hoveredNode.metadata.team.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}