"use client";

import { useState } from "react";
import { Camera, RefreshCw, Layers } from "lucide-react";

interface ScannerProps {
  onAddScannedShape: (type: "box" | "sphere" | "cylinder" | "cone" | "torus", name: string) => void;
}

export default function Scanner({ onAddScannedShape }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [resolution, setResolution] = useState("high");
  const [focalLength, setFocalLength] = useState(55);
  const [targetObject, setTargetObject] = useState("");

  const startScanningProcess = () => {
    if (isScanning || !targetObject.trim()) return;
    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          // Defaults to a generic box for the simulation of a generated mesh
          onAddScannedShape("box", `Generated: ${targetObject}`);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col h-full shadow-lg">
      {/* Title */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
        <Camera className="w-4.5 h-4.5 text-sky-400" />
        <div>
          <h2 className="font-sans font-semibold text-xs text-slate-100 uppercase tracking-wider">STL Mesh Generator</h2>
          <p className="text-[10px] text-slate-400 font-mono">Solid manifold reconstruction</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
        <div>
          <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase tracking-wider">Target Object</label>
          <input
            type="text"
            placeholder="Enter object (e.g., Engine Bracket)"
            value={targetObject}
            onChange={(e) => setTargetObject(e.target.value)}
            disabled={isScanning}
            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        {/* Embedded Generation Parameters */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-sm">
          <span className="text-[9px] text-slate-500 font-mono block mb-1.5 uppercase tracking-wider">Generation Parameters</span>
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed italic">
            "Create a high-quality, continuous 3D mesh model of <strong className="text-sky-400 not-italic">{targetObject || "[Insert Object]"}</strong> designed specifically for 3D printing and STL export. The model should be a solid manifold mesh with a clean, cohesive structure, smooth contours, and optimized geometry. Omit all textures, colors, floating artifacts, and background environments. The final render should be an unpainted, uniform matte-gray prototype suitable for direct STL export"
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase tracking-wider">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              disabled={isScanning}
              className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-sans"
            >
              <option value="low">Low (1.5mm)</option>
              <option value="medium">Medium (0.8mm)</option>
              <option value="high">High (0.2mm)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase tracking-wider">Focal Depth (mm)</label>
            <input
              type="number"
              value={focalLength}
              onChange={(e) => setFocalLength(Number(e.target.value))}
              disabled={isScanning}
              min="10"
              max="150"
              className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Status Area */}
        <div className="bg-slate-950 rounded-sm border border-slate-800 p-3 mt-2 flex flex-col justify-center items-center relative overflow-hidden min-h-[110px]">
          {isScanning ? (
            <>
              <RefreshCw className="w-5 h-5 text-sky-400 animate-spin mb-2" />
              <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-semibold">Generating Mesh...</span>
              <span className="text-sm font-mono text-slate-100 font-bold mt-1">{scanProgress}%</span>
              
              <div className="w-full bg-slate-800 h-1 rounded-none mt-2 overflow-hidden">
                <div className="bg-sky-500 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Layers className="w-6 h-6 text-slate-600 mb-1.5" />
              <span className="text-xs text-slate-300">Generator Idle</span>
              <p className="text-[10px] text-slate-500 font-sans max-w-[200px] mt-1 leading-normal">
                Enter a target object name to begin optimized mesh generation for STL export.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scanner Trigger Button */}
      <div className="pt-3 border-t border-slate-800 mt-4">
        <button
          onClick={startScanningProcess}
          disabled={isScanning || !targetObject.trim()}
          className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 disabled:text-slate-600 border border-slate-700 disabled:border-slate-800 text-white font-medium text-xs py-2 px-3 rounded-sm transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <Camera className="w-3.5 h-3.5" />
          {isScanning ? "Processing..." : "Generate 3D Model"}
        </button>
      </div>
    </div>
  );
}