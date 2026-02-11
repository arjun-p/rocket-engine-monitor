'use client';

import { useEffect, useState, useMemo } from 'react';

interface Component {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

interface SchematicViewProps {
  apiUrl: string;
}


// Improved component positions matching RS-25 structure
const COMPONENT_POSITIONS: Record<string, Component> = {
  // Main oxidizer chain - Right side vertical
  LOX_Tank: { id: 'LOX_Tank', x: 60, y: 3, width: 18, height: 7, label: 'LOX Tank' },
  LOX_Supply_Line: { id: 'LOX_Supply_Line', x: 63, y: 10, width: 12, height: 4, label: 'LOX Supply Line' },
  LPOTP: { id: 'LPOTP', x: 60, y: 14, width: 18, height: 7, label: 'LPOTP' },
  LPOTP_Discharge: { id: 'LPOTP_Discharge', x: 62, y: 21, width: 14, height: 4, label: 'LPOTP Discharge' },
  HPOTP: { id: 'HPOTP', x: 59, y: 25, width: 20, height: 8, label: 'HPOTP' },
  HPOTP_Discharge: { id: 'HPOTP_Discharge', x: 61, y: 33, width: 16, height: 4, label: 'HPOTP Discharge' },
  OPOV: { id: 'OPOV', x: 63, y: 37, width: 12, height: 5, label: 'OPOV' },
  Oxidizer_Preburner: { id: 'Oxidizer_Preburner', x: 58, y: 42, width: 22, height: 8, label: 'Oxidizer Preburner' },

  // Central section
  Hot_Gas_Manifold: { id: 'Hot_Gas_Manifold', x: 30, y: 50, width: 40, height: 6, label: 'Hot Gas Manifold' },
  Powerhead: { id: 'Powerhead', x: 35, y: 42, width: 20, height: 7, label: 'Powerhead' },
  Main_Combustion_Chamber: { id: 'Main_Combustion_Chamber', x: 32, y: 56, width: 36, height: 16, label: 'Main Combustion Chamber' },
  Main_Injector: { id: 'Main_Injector', x: 36, y: 72, width: 28, height: 5, label: 'Main Injector' },
  Nozzle_Throat: { id: 'Nozzle_Throat', x: 30, y: 77, width: 40, height: 8, label: 'Nozzle Throat' },
  Nozzle_Extension: { id: 'Nozzle_Extension', x: 20, y: 85, width: 60, height: 10, label: 'Nozzle Extension' },

  // Left side - Fuel branch A
  Fuel_Coolant_Valve_A: { id: 'Fuel_Coolant_Valve_A', x: 10, y: 25, width: 18, height: 7, label: 'Fuel Coolant Valve A' },
  Temp_Sensor_A: { id: 'Temp_Sensor_A', x: 8, y: 32, width: 10, height: 5, label: 'Temp Sensor A' },
  Temp_Sensor_Pass_A: { id: 'Temp_Sensor_Pass_A', x: 18, y: 32, width: 12, height: 5, label: 'Temp Sensor Pass A' },

  // Left side - Branch B
  Vibration_Suppressor_B: { id: 'Vibration_Suppressor_B', x: 8, y: 56, width: 18, height: 7, label: 'Vibration Suppressor B' },
  Temp_Sensor_B: { id: 'Temp_Sensor_B', x: 6, y: 63, width: 10, height: 5, label: 'Temp Sensor B' },
  Temp_Sensor_Pass_B: { id: 'Temp_Sensor_Pass_B', x: 16, y: 63, width: 12, height: 5, label: 'Temp Sensor Pass B' },

  // Right side - Branch C (fixed overlap)
  Press_Reg_C: { id: 'Press_Reg_C', x: 82, y: 37, width: 14, height: 6, label: 'Press Reg C' },
  Temp_Sensor_C: { id: 'Temp_Sensor_C', x: 91, y: 43, width: 8, height: 5, label: 'Temp Sensor C' },
  Temp_Sensor_Pass_C: { id: 'Temp_Sensor_Pass_C', x: 82, y: 43, width: 8, height: 5, label: 'Temp Sensor Pass C' },

  // Bottom support systems
  Gimbal_Actuator: { id: 'Gimbal_Actuator', x: 4, y: 85, width: 14, height: 7, label: 'Gimbal Actuator' },
  Bleed_Valve: { id: 'Bleed_Valve', x: 82, y: 50, width: 14, height: 6, label: 'Bleed Valve' },
  Helium_Control_System: { id: 'Helium_Control_System', x: 82, y: 30, width: 14, height: 6, label: 'Helium Control System' },
  Hydraulic_Power_Unit: { id: 'Hydraulic_Power_Unit', x: 82, y: 85, width: 14, height: 7, label: 'Hydraulic Power Unit' },
  Engine_Mount: { id: 'Engine_Mount', x: 25, y: 95, width: 50, height: 4, label: 'Engine Mount' },

  // Top controls
  External_Interface: { id: 'External_Interface', x: 30, y: 25, width: 18, height: 6, label: 'External Interface' },
  Controller_MEC: { id: 'Controller_MEC', x: 30, y: 3, width: 18, height: 6, label: 'Controller MEC' },
};

export default function SchematicView({ apiUrl }: SchematicViewProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [components, setComponents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch components once and cache
  useEffect(() => {
    let mounted = true;

    const fetchComponents = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${apiUrl}/components`);
        const data = await res.json();
        if (mounted) {
          setComponents(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch components:', err);
        if (mounted) setIsLoading(false);
      }
    };

    fetchComponents();

    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  // Memoize component list to prevent re-renders
  const componentSet = useMemo(() => new Set(components), [components]);

  const handleComponentClick = (componentId: string) => {
    setSelectedComponent(componentId === selectedComponent ? null : componentId);
  };

  if (isLoading) {
    return (
      <div className="relative h-full w-full bg-slate-950 flex items-center justify-center">
        <div className="text-blue-400">Loading schematic...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-950">
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="relative w-full max-w-6xl">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-lg border border-slate-700">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />
          </div>

          {/* Title */}
          <div className="absolute top-4 left-4 z-20">
            <h2 className="text-xl font-bold text-blue-400">RS-25 Engine Schematic</h2>
            <p className="text-xs text-slate-500 mt-1">Space Shuttle Main Engine - Component Flow</p>
          </div>

          {/* Schematic */}
          <div className="relative w-full" style={{ paddingBottom: '100%' }}>
            {/* Components */}
            {Object.entries(COMPONENT_POSITIONS).map(([id, pos]) => {
              const isKnownComponent = componentSet.has(id);
              const isSelected = selectedComponent === id;
              const isHovered = hoveredComponent === id;

              if (!isKnownComponent) return null;

              return (
                <div
                  key={id}
                  className={`
                    absolute cursor-pointer transition-all duration-200
                    ${isSelected ? 'z-30' : 'z-10'}
                    ${isHovered ? 'scale-105' : 'scale-100'}
                  `}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: `${pos.width}%`,
                    height: `${pos.height}%`,
                  }}
                  onClick={() => handleComponentClick(id)}
                  onMouseEnter={() => setHoveredComponent(id)}
                  onMouseLeave={() => setHoveredComponent(null)}
                >
                  <div
                    className={`
                      h-full rounded-md border-2 transition-all duration-200 flex items-center justify-center
                      ${isSelected
                        ? 'bg-green-500/50 border-green-400 shadow-lg shadow-green-500/50'
                        : isHovered
                        ? 'bg-blue-500/40 border-blue-400 shadow-lg shadow-blue-500/50'
                        : 'bg-blue-600/25 border-blue-500/60'
                      }
                    `}
                  >
                    <span
                      className={`
                        text-center font-mono font-semibold px-1
                        ${pos.height > 6 ? 'text-sm' : 'text-xs'}
                        ${isSelected || isHovered ? 'text-white' : 'text-blue-100'}
                        leading-tight
                      `}
                      style={{
                        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                        wordBreak: 'break-word',
                        hyphens: 'auto'
                      }}
                    >
                      {pos.label || id.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {isHovered && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-mono px-2 py-1 rounded bg-slate-800 border border-slate-600 shadow-lg z-50">
                      {id}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 z-20 bg-slate-800/95 rounded-lg border border-slate-700 p-3 backdrop-blur shadow-xl">
            <div className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-600/25 border-2 border-blue-500/60"></div>
                <span className="text-slate-400">Component</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/40 border-2 border-blue-400"></div>
                <span className="text-slate-400">Hovered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/50 border-2 border-green-400"></div>
                <span className="text-slate-400">Selected</span>
              </div>
            </div>
          </div>

          {/* Component Count */}
          <div className="absolute top-4 right-4 z-20 bg-slate-800/95 rounded-lg border border-slate-700 px-4 py-2 backdrop-blur shadow-xl">
            <div className="text-sm">
              <span className="text-slate-400">Components:</span>
              <span className="ml-2 text-xl font-bold text-blue-400">{components.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="absolute bottom-4 left-4 z-20 text-xs text-slate-500">
        💡 Click components to select • Vertical layout shows flow direction
      </div>
    </div>
  );
}
