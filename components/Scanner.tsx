"use client";

import { useState } from "react";
import { Camera, RefreshCw, Layers, ChevronDown, ChevronRight, Sliders, SlidersHorizontal } from "lucide-react";

interface ScannerProps {
  onAddScannedShape: (
    type: "box" | "sphere" | "cylinder" | "cone" | "torus",
    name: string,
    operation: "merge" | "subtract" | "intersect"
  ) => void;
}

export default function Scanner({ onAddScannedShape }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  // Accordion panel toggles to completely prevent layout overcrowding
  const [panels, setPanels] = useState({
    hardware: true,
    filters: false,
  });

  const [scanTarget, setScanTarget] = useState<"box" | "cylinder" | "torus">("box");
  const [targetOperation, setTargetOperation] = useState<"merge" | "subtract">("merge");
  const [resolution, setResolution] = useState("high");
  const [focalLength, setFocalLength] = useState(55);
  const [filterNoise, setFilterNoise] = useState(true);

  const togglePanel = (panel: keyof typeof panels) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  const startScanningProcess = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          // Generates proper geometric primitives aligned with CAD workspace logic
          const label = `SCAN_${scanTarget.toUpperCase()}_${targetOperation.toUpperCase()}`;
          onAddScannedShape(scanTarget, label, targetOperation);
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  return (
    <div className="bg-[#080d19] border border-slate-900 rounded-sm p-4 flex flex-col h-full font-mono text-slate-100 select-none">
      {/* Title block */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-900 mb-2">
        <Camera className="w-4 h-4 text-sky-500" />
        <div>
          <h2 className="font-bold text-xs uppercase tracking-wider">3D Scanner Engine</h2>
          <p className="text-[9px] text-slate-500 uppercase tracking-tight">Structured light acquisition matrix</p>
        </div>
      </div>

      {/* Configuration Body */}
      <div className="flex-1 overflow-y-auto space-y-1">
        
        {/* Core Settings Section */}
        <div className="bg-[#050811] border border-slate-950 p-2.5 rounded-sm space-y-3">
          <div>
            <label className="text-[9px] text-slate-500 block mb-1 uppercase font-bold">Target Geometry</label>
            <select
              value={scanTarget}
              onChange={(e) => setScanTarget(e.target.value as "box" | "cylinder" | "torus")}
              disabled={isScanning}
              className="w-full bg-[#080d19] border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="box">Prismatic Block (Box)</option>
              <option value="cylinder">Machined Core (Cylinder)</option>
              <option value="torus">Retaining Ring (Torus)</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] text-slate-500 block mb-1 uppercase font-bold">Default CSG Mapping</label>
            <select
              value={targetOperation}
              onChange={(e) => setTargetOperation(e.target.value as "merge" | "subtract")}
              disabled={isScanning}
              className="w-full bg-[#080d19] border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="merge">Solid Mass Addition (Union)</option>
              <option value="subtract">Material Cutout (Hole)</option>
            </select>
          </div>
        </div>

        {/* Expandable Hardware Parameters Section */}
        <div className="border-b border-slate-900">
          <button
            onClick={() => togglePanel("hardware")}
            className="w-full py-2 flex items-center justify-between text-[9px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5"><SlidersHorizontal size={10} /> Lens Parameters</span>
            {panels.hardware ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {panels.hardware && (
            <div className="pb-3 grid grid-cols-2 gap-2 pt-1 px-1">
              <div>
                <label className="text-[8px] text-slate-500 block mb-1 uppercase font-bold">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={isScanning}
                  className="w-full bg-[#050811] border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="low">1.5 mm</option>
                  <option value="medium">0.8 mm</option>
                  <option value="high">0.2 mm</option>
                </select>
              </div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1 uppercase font-bold">Focal Depth (mm)</label>
                <input
                  type="number"
                  value={focalLength}
                  onChange={(e) => setFocalLength(Number(e.target.value))}
                  disabled={isScanning}
                  min="10"
                  max="150"
                  className="w-full bg-[#050811] border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Expandable Processing Filters Section */}
        <div className="border-b border-slate-900">
          <button
            onClick={() => togglePanel("filters")}
            className="w-full py-2 flex items-center justify-between text-[9px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5"><Layers size={10} /> Data Optimization</span>
            {panels.filters ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {panels.filters && (
            <div className="pb-3 pt-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] select-none text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={filterNoise}
                  onChange={(e) => setFilterNoise(e.target.checked)}
                  disabled={isScanning}
                  className="rounded-sm bg-[#050811] border-slate-800 text-sky-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Apply absolute noise correction filter</span>
              </label>
            </div>
          )}
        </div>

        {/* Acquisition Progress Box */}
        <div className="bg-[#050811] rounded-sm border border-slate-900 p-4 mt-2 flex flex-col justify-center items-center min-h-[100px]">
          {isScanning ? (
            <div className="w-full text-center">
              <RefreshCw className="w-4 h-4 text-sky-500 animate-spin mx-auto mb-2" />
              <span className="text-[9px] text-sky-500 font-bold uppercase tracking-wider block">SOLVING POINT VECTOR CLOUD</span>
              <span className="text-xs text-slate-200 font-bold mt-1 block">{scanProgress}%</span>
              <div className="w-full bg-[#080d19] border border-slate-900 h-1.5 rounded-sm mt-2 overflow-hidden">
                <div className="bg-sky-600 h-full transition-all duration-100" style={{ width: `${scanProgress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Layers className="w-5 h-5 text-slate-700 mb-1.5" />
              <span className="text-[10px] text-slate-400 uppercase font-bold">Acquisition Matrix Idle</span>
              <p className="text-[9px] text-slate-600 max-w-[220px] mt-1 uppercase leading-normal">
                Align target, set configurations, and execute compute sequence.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Execution Trigger */}
      <div className="pt-3 border-t border-slate-900 mt-2">
        <button
          onClick={startScanningProcess}
          disabled={isScanning}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-[#050811] text-slate-200 hover:text-white border border-slate-800 disabled:border-slate-950 font-bold text-xs py-2 px-3 rounded-sm transition cursor-pointer disabled:cursor-not-allowed uppercase"
        >
          {isScanning ? "PROCESSING MATRIX..." : "EXECUTE PARAMETRIC SCAN"}
        </button>
      </div>
    </div>
  );
}