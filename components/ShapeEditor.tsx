"use client";

import { useState } from "react";
import { Trash2, Copy, Move, Eye, EyeOff, Sliders, ChevronDown, ChevronRight, FileCode } from "lucide-react";

// Explicit structural interface mapping support for custom imported geometries
export interface ShapeConfig {
  id: string;
  name: string;
  type: "box" | "sphere" | "cylinder" | "cone" | "torus" | "custom";
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  visible: boolean;
  operation: "merge" | "subtract" | "intersect";
  geometry?: any; // Native BufferGeometry tracking for imported STL data streams
}

interface ShapeEditorProps {
  shape: ShapeConfig | null;
  onUpdateShape: (updated: ShapeConfig) => void;
  onDeleteShape: (id: string) => void;
  onCloneShape: (shape: ShapeConfig) => void;
}

export default function ShapeEditor({
  shape,
  onUpdateShape,
  onDeleteShape,
  onCloneShape,
}: ShapeEditorProps) {
  // Panel toggle state to prevent overcrowding
  const [panels, setPanels] = useState({
    general: true,
    transform: true,
    appearance: false,
  });

  const togglePanel = (panel: keyof typeof panels) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  if (!shape) {
    return (
      <div className="bg-[#080d19] border-l border-slate-900 p-6 flex flex-col items-center justify-center text-center h-full">
        <Sliders className="w-6 h-6 text-slate-600 mb-2" />
        <p className="text-xs font-mono text-slate-500">NO SHAPE SELECTED</p>
      </div>
    );
  }

  const handlePositionChange = (axis: "x" | "y" | "z", value: number) => {
    onUpdateShape({ ...shape, position: { ...shape.position, [axis]: value } });
  };

  const handleRotationChange = (axis: "x" | "y" | "z", value: number) => {
    onUpdateShape({ ...shape, rotation: { ...shape.rotation, [axis]: value } });
  };

  const handleScaleChange = (axis: "x" | "y" | "z", value: number) => {
    onUpdateShape({ ...shape, scale: { ...shape.scale, [axis]: Math.max(0.1, value) } });
  };

  const colorPresets = [
    { value: "#ef4444", name: "Red" },
    { value: "#3b82f6", name: "Blue" },
    { value: "#10b981", name: "Green" },
    { value: "#f59e0b", name: "Yellow" },
    { value: "#8b5cf6", name: "Purple" },
    { value: "#94a3b8", name: "Steel" },
  ];

  return (
    <div className="bg-[#080d19] border-l border-slate-900 flex flex-col h-full overflow-hidden text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-900 bg-[#050811]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-500" />
          <div className="flex items-center gap-1.5">
            <h2 className="font-mono font-bold text-xs text-slate-100 uppercase">Shape Editor</h2>
            {shape.type === "custom" && (
              <span className="text-[8px] bg-sky-950/40 border border-sky-900/60 text-sky-400 font-bold px-1 py-0.5 rounded-sm flex items-center gap-0.5">
                <FileCode size={8} /> STL
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onUpdateShape({ ...shape, visible: !shape.visible })}
          title={shape.visible ? "Hide Shape" : "Show Shape"}
          className="p-1 hover:bg-slate-800 rounded-sm text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          {shape.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto">
        
        {/* General Properties */}
        <div className="border-b border-slate-900">
          <button 
            onClick={() => togglePanel("general")} 
            className="w-full p-4 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-slate-400 hover:text-slate-200"
          >
            <span>General</span>
            {panels.general ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {panels.general && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="text-[9px] text-slate-500 font-mono block mb-1 uppercase">Identifier</label>
                <input
                  type="text"
                  value={shape.name}
                  onChange={(e) => onUpdateShape({ ...shape, name: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-800 rounded-sm px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-mono block mb-1 uppercase">CSG Operation</label>
                <select
                  value={shape.operation}
                  onChange={(e) => onUpdateShape({ ...shape, operation: e.target.value as ShapeConfig["operation"] })}
                  className="w-full bg-[#050811] border border-slate-800 rounded-sm px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                >
                  <option value="merge">Union (Merge)</option>
                  <option value="subtract">Subtract (Cut Hole)</option>
                  <option value="intersect">Intersect</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Transform Tools */}
        <div className="border-b border-slate-900">
          <button 
            onClick={() => togglePanel("transform")} 
            className="w-full p-4 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-slate-400 hover:text-slate-200"
          >
            <span>Transform</span>
            {panels.transform ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {panels.transform && (
            <div className="px-4 pb-4 space-y-4">
              {/* Position */}
              <div>
                <span className="text-[9px] text-slate-500 font-mono block mb-2 uppercase">Position (mm)</span>
                <div className="space-y-1.5">
                  {["x", "y", "z"].map((axis) => (
                    <div key={axis} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold text-slate-500 w-3">{axis}</span>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.05"
                        value={shape.position[axis as "x" | "y" | "z"]}
                        onChange={(e) => handlePositionChange(axis as "x" | "y" | "z", Number(e.target.value))}
                        className="flex-1 h-1 bg-slate-800 rounded-sm appearance-none cursor-pointer accent-sky-500"
                      />
                      <span className="font-mono text-[10px] text-slate-400 w-8 text-right">
                        {shape.position[axis as "x" | "y" | "z"].toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rotation */}
              <div>
                <span className="text-[9px] text-slate-500 font-mono block mb-2 uppercase">Rotation (deg)</span>
                <div className="space-y-1.5">
                  {["x", "y", "z"].map((axis) => (
                    <div key={axis} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold text-slate-500 w-3">{axis}</span>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={shape.rotation[axis as "x" | "y" | "z"]}
                        onChange={(e) => handleRotationChange(axis as "x" | "y" | "z", Number(e.target.value))}
                        className="flex-1 h-1 bg-slate-800 rounded-sm appearance-none cursor-pointer accent-sky-500"
                      />
                      <span className="font-mono text-[10px] text-slate-400 w-8 text-right">
                        {shape.rotation[axis as "x" | "y" | "z"]}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scale */}
              <div>
                <span className="text-[9px] text-slate-500 font-mono block mb-2 uppercase">Scale (Factor)</span>
                <div className="space-y-1.5">
                  {["x", "y", "z"].map((axis) => (
                    <div key={axis} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold text-slate-500 w-3">{axis}</span>
                      <input
                        type="range"
                        min="0.1"
                        max="4"
                        step="0.05"
                        value={shape.scale[axis as "x" | "y" | "z"]}
                        onChange={(e) => handleScaleChange(axis as "x" | "y" | "z", Number(e.target.value))}
                        className="flex-1 h-1 bg-slate-800 rounded-sm appearance-none cursor-pointer accent-sky-500"
                      />
                      <span className="font-mono text-[10px] text-slate-400 w-8 text-right">
                        {shape.scale[axis as "x" | "y" | "z"].toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Appearance Options */}
        <div className="border-b border-slate-900">
          <button 
            onClick={() => togglePanel("appearance")} 
            className="w-full p-4 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-slate-400 hover:text-slate-200"
          >
            <span>Appearance</span>
            {panels.appearance ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {panels.appearance && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => onUpdateShape({ ...shape, color: preset.value })}
                    title={preset.name}
                    className={`w-5 h-5 rounded-sm border transition cursor-pointer ${
                      shape.color === preset.value ? "border-white" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Quick Action Bar */}
      <div className="p-4 bg-[#050811] border-t border-slate-900">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() =>
              onUpdateShape({
                ...shape,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
              })
            }
            className="flex flex-col items-center justify-center py-2 bg-slate-900 hover:bg-slate-800 rounded-sm border border-slate-800 text-slate-400 hover:text-slate-200 transition text-[9px] font-mono uppercase cursor-pointer"
          >
            <Move className="w-3.5 h-3.5 mb-1" />
            Origin
          </button>
          <button
            onClick={() => onCloneShape(shape)}
            className="flex flex-col items-center justify-center py-2 bg-slate-900 hover:bg-slate-800 rounded-sm border border-slate-800 text-slate-400 hover:text-slate-200 transition text-[9px] font-mono uppercase cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 mb-1" />
            Clone
          </button>
          <button
            onClick={() => onDeleteShape(shape.id)}
            className="flex flex-col items-center justify-center py-2 bg-rose-950/20 hover:bg-rose-900/40 rounded-sm border border-rose-900/30 text-rose-400 transition text-[9px] font-mono uppercase cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mb-1" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}