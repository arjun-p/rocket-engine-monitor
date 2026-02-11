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

  const getCriticality = (percent: number) => {
    if (percent > 7) return { color: 'bg-red-500', textColor: 'text-red-500', label: 'High', emoji: '🔴' };
    if (percent > 3) return { color: 'bg-yellow-500', textColor: 'text-yellow-500', label: 'Medium', emoji: '🟡' };
    return { color: 'bg-green-500', textColor: 'text-green-500', label: 'Low', emoji: '🟢' };
  };

  const criticality = getCriticality(nodeData.centrality_percent);

  return (
    <div className="absolute bottom-6 right-6 w-80 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 backdrop-blur-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
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

      {/* Progress Bar */}
      <div className="p-4 space-y-2">
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(nodeData.centrality_percent, 100)}%` }}
          />
        </div>
        <p className="text-sm text-slate-300">
          {nodeData.centrality_percent.toFixed(2)}% Centrality
        </p>
      </div>

      {/* Metrics */}
      <div className="px-4 pb-4 space-y-2 text-sm">
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

      {/* Criticality */}
      <div className="px-4 pb-4">
        <div className={`${criticality.color} bg-opacity-10 border rounded-lg p-3 flex items-center gap-2 ${criticality.textColor} border-current`}>
          <span className="text-xl">{criticality.emoji}</span>
          <div>
            <p className="text-xs text-slate-400">Criticality</p>
            <p className={`font-semibold ${criticality.textColor}`}>
              {criticality.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
