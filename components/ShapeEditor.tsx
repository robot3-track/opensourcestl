"use client";

import { ShapeConfig } from "./ThreeCanvas";
import { Trash2, Copy, Move, Eye, EyeOff, Sliders } from "lucide-react";

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
  if (!shape) {
    return (
      <div className="bg-[#050811] border-l border-slate-900 p-6 flex flex-col items-center justify-center text-center h-full">
        <Sliders className="w-6 h-6 text-slate-700 mb-3" />
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
          No Active Selection
        </p>
        <p className="text-[10px] text-slate-600 font-sans mt-2 max-w-[180px]">
          Select a primitive from the viewport to configure its properties.
        </p>
      </div>
    );
  }

  const handlePositionChange = (axis: "x" | "y" | "z", value: number) => {
    onUpdateShape({
      ...shape,
      position: { ...shape.position, [axis]: value },
    });
  };

  const handleRotationChange = (axis: "x" | "y" | "z", value: number) => {
    onUpdateShape({
      ...shape,
      rotation: { ...shape.rotation, [axis]: value },
    });
  };

  const handleScaleChange = (axis: "x" | "y" | "z", value: number) => {
    onUpdateShape({
      ...shape,
      scale: { ...shape.scale, [axis]: Math.max(0.1, value) },
    });
  };

  const colorPresets = [
    { value: "#8c8c8c", name: "Matte Gray" },
    { value: "#ef4444", name: "Red" },
    { value: "#3b82f6", name: "Blue" },
    { value: "#10b981", name: "Green" },
    { value: "#f59e0b", name: "Orange" },
  ];

  return (
    <div className="bg-[#050811] border-l border-slate-900 p-4 flex flex-col h-full font-sans text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div>
          <h2 className="font-semibold text-xs text-slate-100 uppercase tracking-wider">Properties</h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {shape.id.split("-")[0]}</p>
        </div>
        <button
          onClick={() => onUpdateShape({ ...shape, visible: !shape.visible })}
          title={shape.visible ? "Hide Shape" : "Show Shape"}
          className={`p-1.5 rounded-sm transition cursor-pointer border ${
            shape.visible 
              ? "bg-slate-900 border-slate-800 text-sky-400 hover:bg-slate-800" 
              : "bg-slate-950 border-transparent text-slate-600 hover:text-slate-400"
          }`}
        >
          {shape.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
        {/* Shape Name & Operation Type */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-mono block mb-1.5 uppercase tracking-wider">Label</label>
            <input
              type="text"
              value={shape.name}
              onChange={(e) => onUpdateShape({ ...shape, name: e.target.value })}
              className="w-full bg-[#080d19] border border-slate-800 rounded-sm px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500 font-sans"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-mono block mb-1.5 uppercase tracking-wider">Boolean Operation</label>
            <select
              value={shape.operation}
              onChange={(e) =>
                onUpdateShape({
                  ...shape,
                  operation: e.target.value as ShapeConfig["operation"],
                })
              }
              className="w-full bg-[#080d19] border border-slate-800 rounded-sm px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="merge">Union (Merge)</option>
              <option value="subtract">Subtract (Cut)</option>
              <option value="intersect">Intersect</option>
            </select>
          </div>
        </div>

        {/* Translation Coordinates (Position) */}
        <div>
          <span className="text-[10px] text-slate-500 font-mono block mb-1.5 uppercase tracking-wider">Translation</span>
          <div className="bg-[#080d19] border border-slate-900 p-2 rounded-sm space-y-2">
            {["x", "y", "z"].map((axis) => (
              <div key={`pos-${axis}`} className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-600 w-3">{axis}</span>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={shape.position[axis as "x" | "y" | "z"]}
                  onChange={(e) => handlePositionChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="flex-1 h-1 bg-slate-800 rounded-sm appearance-none cursor-pointer accent-sky-500"
                />
                <input
                  type="number"
                  value={shape.position[axis as "x" | "y" | "z"].toFixed(1)}
                  onChange={(e) => handlePositionChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="w-12 bg-slate-950 border border-slate-800 rounded-sm text-center text-[10px] font-mono py-0.5 focus:outline-none focus:border-sky-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rotation Sliders */}
        <div>
          <span className="text-[10px] text-slate-500 font-mono block mb-1.5 uppercase tracking-wider">Rotation (Deg)</span>
          <div className="bg-[#080d19] border border-slate-900 p-2 rounded-sm space-y-2">
            {["x", "y", "z"].map((axis) => (
              <div key={`rot-${axis}`} className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-600 w-3">{axis}</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={shape.rotation[axis as "x" | "y" | "z"]}
                  onChange={(e) => handleRotationChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="flex-1 h-1 bg-slate-800 rounded-sm appearance-none cursor-pointer accent-sky-500"
                />
                <input
                  type="number"
                  value={shape.rotation[axis as "x" | "y" | "z"]}
                  onChange={(e) => handleRotationChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="w-12 bg-slate-950 border border-slate-800 rounded-sm text-center text-[10px] font-mono py-0.5 focus:outline-none focus:border-sky-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dimension Scaling */}
        <div>
          <span className="text-[10px] text-slate-500 font-mono block mb-1.5 uppercase tracking-wider">Scale</span>
          <div className="bg-[#080d19] border border-slate-900 p-2 rounded-sm space-y-2">
            {["x", "y", "z"].map((axis) => (
              <div key={`scale-${axis}`} className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-600 w-3">{axis}</span>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={shape.scale[axis as "x" | "y" | "z"]}
                  onChange={(e) => handleScaleChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="flex-1 h-1 bg-slate-800 rounded-sm appearance-none cursor-pointer accent-sky-500"
                />
                <input
                  type="number"
                  value={shape.scale[axis as "x" | "y" | "z"].toFixed(1)}
                  onChange={(e) => handleScaleChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="w-12 bg-slate-950 border border-slate-800 rounded-sm text-center text-[10px] font-mono py-0.5 focus:outline-none focus:border-sky-500"
                  step="0.1"
                  min="0.1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Preset Colors */}
        <div>
          <span className="text-[10px] text-slate-500 font-mono block mb-1.5 uppercase tracking-wider">Material Color</span>
          <div className="flex gap-2 p-1">
            {colorPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onUpdateShape({ ...shape, color: preset.value })}
                title={preset.name}
                className={`w-5 h-5 rounded-sm border-2 transition-all cursor-pointer ${
                  shape.color === preset.value ? "border-sky-400 scale-110" : "border-slate-800 hover:border-slate-600"
                }`}
                style={{ backgroundColor: preset.value }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Quick Action Bar */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800 mt-4">
        <button
          onClick={() =>
            onUpdateShape({
              ...shape,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            })
          }
          className="flex items-center justify-center gap-1.5 p-2 bg-[#080d19] hover:bg-slate-800 rounded-sm border border-slate-800 text-slate-300 transition text-[10px] uppercase font-semibold cursor-pointer"
        >
          <Move className="w-3 h-3 text-slate-400" />
          Reset
        </button>
        <button
          onClick={() => onCloneShape(shape)}
          className="flex items-center justify-center gap-1.5 p-2 bg-[#080d19] hover:bg-slate-800 rounded-sm border border-slate-800 text-slate-300 transition text-[10px] uppercase font-semibold cursor-pointer"
        >
          <Copy className="w-3 h-3 text-slate-400" />
          Clone
        </button>
        <button
          onClick={() => onDeleteShape(shape.id)}
          className="flex items-center justify-center gap-1.5 p-2 bg-rose-950/20 hover:bg-rose-900/40 rounded-sm border border-rose-900/30 text-rose-400 transition text-[10px] uppercase font-semibold cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}