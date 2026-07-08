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
  const [filterNoise, setFilterNoise] = useState(true);
  const [scanTarget, setScanTarget] = useState("Dental Crown");

  const startScanningProcess = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          const shapeType = scanTarget === "Dental Crown" ? "sphere" : scanTarget === "Threaded Screw" ? "cylinder" : "torus";
          onAddScannedShape(shapeType, `Scanned ${scanTarget}`);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-lg">
      {/* Title */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
        <Camera className="w-4.5 h-4.5 text-sky-400" />
        <div>
          <h2 className="font-sans font-semibold text-xs text-slate-100 uppercase tracking-wider">3D Scanner Simulator</h2>
          <p className="text-[10px] text-slate-400 font-mono">Structured light reconstruction</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
        <div>
          <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase tracking-wider">Target Preset</label>
          <select
            value={scanTarget}
            onChange={(e) => setScanTarget(e.target.value)}
            disabled={isScanning}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
          >
            <option value="Dental Crown">Dental Crown Mold</option>
            <option value="Threaded Screw">Threaded Hinge Joint</option>
            <option value="Torus Flange">Circular Torus Flange</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase tracking-wider">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              disabled={isScanning}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-sans"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 mt-1">
          <span className="text-[9px] text-slate-500 font-mono block mb-1.5 uppercase tracking-wider">Processing Filter</span>
          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={filterNoise}
              onChange={(e) => setFilterNoise(e.target.checked)}
              disabled={isScanning}
              className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-slate-300 font-sans">Apply noise correction filter</span>
          </label>
        </div>

        {/* Status Area */}
        <div className="bg-slate-950 rounded-xl border border-slate-850 p-3 mt-2 flex flex-col justify-center items-center relative overflow-hidden min-h-[110px]">
          {isScanning ? (
            <>
              <RefreshCw className="w-5 h-5 text-sky-400 animate-spin mb-2" />
              <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-semibold">Simulating Acquisition...</span>
              <span className="text-sm font-mono text-slate-100 font-bold mt-1">{scanProgress}%</span>
              
              <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-sky-500 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Layers className="w-6 h-6 text-slate-600 mb-1.5" />
              <span className="text-xs text-slate-300">Scanner Idle</span>
              <p className="text-[10px] text-slate-500 font-sans max-w-[200px] mt-1 leading-normal">
                Choose a template target preset and configure resolution to begin reconstruction.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scanner Trigger Button */}
      <div className="pt-3 border-t border-slate-800 mt-4">
        <button
          onClick={startScanningProcess}
          disabled={isScanning}
          className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 border border-slate-700 disabled:border-slate-850 text-white font-medium text-xs py-2 px-3 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <Camera className="w-3.5 h-3.5" />
          {isScanning ? "Processing Scan..." : "Generate 3D Scan"}
        </button>
      </div>
    </div>
  );
}
