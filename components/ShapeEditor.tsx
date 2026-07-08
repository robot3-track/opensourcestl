"use client";

import { ShapeConfig } from "./ThreeCanvas";
import { Trash2, Copy, Move, Eye, EyeOff, Sliders, Palette, ShieldAlert } from "lucide-react";

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
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full shadow-xl">
        <Sliders className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-sm font-semibold text-slate-300">No Shape Selected</p>
        <p className="text-xs text-slate-500 font-mono mt-1 max-w-[200px]">
          Select an active primitive shape from the viewport or list to configure properties.
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
    { value: "#ef4444", name: "Laser Crimson" },
    { value: "#3b82f6", name: "Cyber Cyan" },
    { value: "#10b981", name: "Emerald Grid" },
    { value: "#f59e0b", name: "Gold Brass" },
    { value: "#8b5cf6", name: "Plasma Purple" },
    { value: "#ec4899", name: "Neo Rose" },
  ];

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="font-sans font-semibold text-sm text-slate-100">Shape Editor</h2>
            <p className="text-[10px] text-slate-500 font-mono">CONSTRUCTIVE VECTOR CONTROLS</p>
          </div>
        </div>
        <button
          onClick={() => onUpdateShape({ ...shape, visible: !shape.visible })}
          title={shape.visible ? "Hide Shape" : "Show Shape"}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          {shape.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* Shape Name & Operation Type */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-mono block mb-1">SHAPE LABEL</label>
            <input
              type="text"
              value={shape.name}
              onChange={(e) => onUpdateShape({ ...shape, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-mono block mb-1">CSG OPERATION</label>
            <select
              value={shape.operation}
              onChange={(e) =>
                onUpdateShape({
                  ...shape,
                  operation: e.target.value as ShapeConfig["operation"],
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="merge">Union (Merge)</option>
              <option value="subtract">Subtract (Cut)</option>
              <option value="intersect">Intersect</option>
            </select>
          </div>
        </div>

        {/* Translation Coordinates (Position) */}
        <div>
          <span className="text-[10px] text-slate-400 font-mono block mb-2">POSITION (X, Y, Z)</span>
          <div className="space-y-2 bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl">
            {["x", "y", "z"].map((axis) => (
              <div key={axis} className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase font-bold text-slate-500 w-3">{axis}</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.05"
                  value={shape.position[axis as "x" | "y" | "z"]}
                  onChange={(e) => handlePositionChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="font-mono text-xs text-slate-300 w-10 text-right">
                  {shape.position[axis as "x" | "y" | "z"].toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rotation Sliders */}
        <div>
          <span className="text-[10px] text-slate-400 font-mono block mb-2">ROTATION (DEGREES)</span>
          <div className="space-y-2 bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl">
            {["x", "y", "z"].map((axis) => (
              <div key={axis} className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase font-bold text-slate-500 w-3">{axis}</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={shape.rotation[axis as "x" | "y" | "z"]}
                  onChange={(e) => handleRotationChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="font-mono text-xs text-slate-300 w-10 text-right">
                  {shape.rotation[axis as "x" | "y" | "z"]}°
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dimension Scaling */}
        <div>
          <span className="text-[10px] text-slate-400 font-mono block mb-2">SCALE PROPORTIONS</span>
          <div className="space-y-2 bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl">
            {["x", "y", "z"].map((axis) => (
              <div key={axis} className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase font-bold text-slate-500 w-3">{axis}</span>
                <input
                  type="range"
                  min="0.1"
                  max="4"
                  step="0.05"
                  value={shape.scale[axis as "x" | "y" | "z"]}
                  onChange={(e) => handleScaleChange(axis as "x" | "y" | "z", Number(e.target.value))}
                  className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="font-mono text-xs text-slate-300 w-10 text-right">
                  {shape.scale[axis as "x" | "y" | "z"].toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Preset Colors */}
        <div>
          <span className="text-[10px] text-slate-400 font-mono block mb-2">PREVIEW COLOR PRESETS</span>
          <div className="flex flex-wrap gap-1.5 p-1">
            {colorPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onUpdateShape({ ...shape, color: preset.value })}
                title={preset.name}
                className={`w-6 h-6 rounded-full border-2 transition transform hover:scale-110 cursor-pointer ${
                  shape.color === preset.value ? "border-white scale-105" : "border-transparent"
                }`}
                style={{ backgroundColor: preset.value }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Quick Action Bar */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 mt-4">
        <button
          onClick={() =>
            onUpdateShape({
              ...shape,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            })
          }
          className="flex flex-col items-center justify-center p-2 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 text-slate-300 transition text-[10px] cursor-pointer"
        >
          <Move className="w-3.5 h-3.5 text-slate-400 mb-1" />
          Recenter
        </button>
        <button
          onClick={() => onCloneShape(shape)}
          className="flex flex-col items-center justify-center p-2 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 text-slate-300 transition text-[10px] cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-slate-400 mb-1" />
          Clone
        </button>
        <button
          onClick={() => onDeleteShape(shape.id)}
          className="flex flex-col items-center justify-center p-2 bg-rose-950/40 hover:bg-rose-950/60 rounded-xl border border-rose-900/50 text-rose-300 transition text-[10px] cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400 mb-1" />
          Delete
        </button>
      </div>
    </div>
  );
}
