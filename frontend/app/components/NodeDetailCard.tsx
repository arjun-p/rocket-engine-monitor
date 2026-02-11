import React from 'react';

interface NodeDetailCardProps {
  nodeData: {
    component_id: string;
    degree: number;
    centrality: number;
    centrality_percent: number;
    rank: number;
  } | null;
  totalNodes: number;
  onClose: () => void;
}

export default function NodeDetailCard({ nodeData, totalNodes, onClose }: NodeDetailCardProps) {
  if (!nodeData) return null;

  return (
    <div className="absolute top-6 right-6 w-80 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 backdrop-blur-sm z-50 animate-in slide-in-from-top-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 className="font-semibold text-white text-sm">
          {nodeData.component_id.replace(/_/g, ' ')}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Metrics */}
      <div className="p-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Centrality:</span>
          <span className="text-white font-semibold font-mono">{nodeData.centrality.toFixed(4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Connections:</span>
          <span className="text-white font-semibold">{nodeData.degree}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Rank:</span>
          <span className="text-white font-semibold">
            #{nodeData.rank} of {totalNodes}
          </span>
        </div>
      </div>
    </div>
  );
}
