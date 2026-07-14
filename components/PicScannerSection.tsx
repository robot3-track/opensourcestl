"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Camera, RefreshCw, Layers, ArrowLeft, Upload, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";

interface PicScannerSectionProps {
  onBack: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onSendToPlayground: (scannedShape: { 
    type: "sphere" | "cylinder" | "box" | "cone" | "torus"; 
    name: string; 
    color: string;
    operation: "merge" | "subtract" | "intersect";
  }) => void;
}

interface AngleSlot {
  id: string;
  label: string;
  url: string | null;
}

export default function PicScannerSection({ onBack, showToast, onSendToPlayground }: PicScannerSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState<"upload" | "features" | "points" | "mesh">("upload");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // UI Panel Toggles to prevent overcrowding
  const [panels, setPanels] = useState({
    timeline: true,
    alignment: true,
    execution: true,
  });

  // Aligned directly with CAD primitive types to fix the rendering bug
  const [targetPreset, setTargetPreset] = useState<"box" | "cylinder" | "torus">("box");
  // Toggle mode tracking how this primitive behaves when loaded into the playground matrix
  const [scannedOperation, setScannedOperation] = useState<"merge" | "subtract">("merge");

  // Fixed angular slots for precise photogrammetry reference alignment
  const [slots, setSlots] = useState<AngleSlot[]>([
    { id: "front", label: "0° FRONT VIEW", url: null },
    { id: "profile", label: "90° PROFILE VIEW", url: null },
    { id: "rear", label: "180° REAR VIEW", url: null },
    { id: "top", label: "TOP-DOWN VIEW", url: null },
  ]);

  // ThreeJS references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const pointCloudRef = useRef<THREE.Points | null>(null);
  const reconstructedMeshRef = useRef<THREE.Mesh | null>(null);

  const togglePanel = (panel: keyof typeof panels) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Initialize Canvas Workspace
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050811");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(2.5, 2.5, 3.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Standard Industrial Workbench Lighting
    const ambientLight = new THREE.AmbientLight("#0f172a", 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight("#f8fafc", 1.8);
    dirLight1.position.set(6, 10, 6);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight("#38bdf8", 0.6);
    dirLight2.position.set(-6, 4, -6);
    scene.add(dirLight2);

    const grid = new THREE.GridHelper(20, 20, "#1e293b", "#0f172a");
    grid.position.y = -0.8;
    scene.add(grid);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (pointCloudRef.current) {
        pointCloudRef.current.rotation.y += 0.001;
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  // Compute 3D Vectors Depending on Step and Type
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (pointCloudRef.current) scene.remove(pointCloudRef.current);
    if (reconstructedMeshRef.current) scene.remove(reconstructedMeshRef.current);
    pointCloudRef.current = null;
    reconstructedMeshRef.current = null;

    if (activeStep === "points" || activeStep === "mesh") {
      const count = 2500;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const baseColor = new THREE.Color(targetPreset === "box" ? "#cbd5e1" : targetPreset === "cylinder" ? "#94a3b8" : "#64748b");

      for (let i = 0; i < count; i++) {
        let x = 0, y = 0, z = 0;

        if (targetPreset === "box") {
          x = (Math.random() - 0.5) * 1.2;
          y = (Math.random() - 0.5) * 1.2;
          z = (Math.random() - 0.5) * 1.2;
        } else if (targetPreset === "cylinder") {
          const theta = Math.random() * Math.PI * 2;
          const r = 0.5;
          x = r * Math.cos(theta);
          y = (Math.random() - 0.5) * 1.5;
          z = r * Math.sin(theta);
        } else {
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          const R = 0.7;
          const r = 0.22;
          x = (R + r * Math.cos(v)) * Math.cos(u);
          y = r * Math.sin(v);
          z = (R + r * Math.cos(v)) * Math.sin(u);
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const c = baseColor.clone().multiplyScalar(0.85 + Math.random() * 0.15);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      const pointsGeom = new THREE.BufferGeometry();
      pointsGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const pointsMat = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        transparent: true,
        opacity: activeStep === "points" ? 0.9 : 0.25,
      });

      const cloud = new THREE.Points(pointsGeom, pointsMat);
      scene.add(cloud);
      pointCloudRef.current = cloud;
    }

    if (activeStep === "mesh") {
      let geometry: THREE.BufferGeometry;
      const matColor = targetPreset === "box" ? "#cbd5e1" : targetPreset === "cylinder" ? "#94a3b8" : "#64748b";

      if (targetPreset === "box") {
        geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      } else if (targetPreset === "cylinder") {
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32);
      } else {
        geometry = new THREE.TorusGeometry(0.7, 0.22, 16, 64);
      }

      geometry.computeVertexNormals();
      const meshMat = new THREE.MeshStandardMaterial({
        color: matColor,
        roughness: 0.5,
        metalness: 0.2,
        roughnessMap: null
      });

      const mesh = new THREE.Mesh(geometry, meshMat);
      scene.add(mesh);
      reconstructedMeshRef.current = mesh;
    }
  }, [activeStep, targetPreset]);

  const startReconstruction = () => {
    const uploadedCount = slots.filter(s => s.url !== null).length;
    if (uploadedCount < 2) {
      showToast("Minimum 2 perspective angles required for triangular alignment", "error");
      return;
    }

    if (processing) return;
    setProcessing(true);
    setProgress(0);
    setActiveStep("features");

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setProcessing(false);
          setActiveStep("points");
          showToast("Extracted aligned structural point cloud", "success");
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const runPoissonReconstruction = () => {
    if (processing) return;
    setProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setProcessing(false);
          setActiveStep("mesh");
          showToast("Reconstructed absolute surface mesh boundary", "success");
          return 100;
        }
        return prev + 25;
      });
    }, 100);
  };

  // Fixed rendering bug by cleanly transmitting the correct geometry type string and dynamic CSG mapping state
  const handleAddToCADPlayground = () => {
    const color = targetPreset === "box" ? "#cbd5e1" : targetPreset === "cylinder" ? "#94a3b8" : "#64748b";
    
    onSendToPlayground({
      type: targetPreset,
      name: `PHOTOGRAMMETRY_${targetPreset.toUpperCase()}`,
      color,
      operation: scannedOperation,
    });
    showToast("Scanned primitive data transmitted to CAD workspace", "success");
  };

  const handleUploadImage = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setSlots(prev => prev.map(slot => slot.id === id ? { ...slot, url } : slot));
    setActiveStep("upload");
    showToast(`Registered perspective input for slot [${id.toUpperCase()}]`, "info");
  };

  return (
    <div className="flex flex-col h-full bg-[#050811] text-slate-100 font-mono select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-900 bg-[#080d19]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1 hover:bg-slate-800 rounded-sm text-slate-400 hover:text-slate-100 transition cursor-pointer flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>EXIT</span>
          </button>
          <div className="h-4 w-px bg-slate-900" />
          <div>
            <h1 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              Photogrammetry Alignment Engine
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">MAP AS:</span>
            <select
              value={scannedOperation}
              onChange={(e) => setScannedOperation(e.target.value as "merge" | "subtract")}
              className="bg-[#050811] border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value="merge">Solid Mass (Union)</option>
              <option value="subtract">Cutting Tool (Hole)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">TARGET PRIMITIVE:</span>
            <select
              value={targetPreset}
              onChange={(e) => {
                setTargetPreset(e.target.value as "box" | "cylinder" | "torus");
                setActiveStep("upload");
              }}
              className="bg-[#050811] border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value="box">Prismatic Box / Cube</option>
              <option value="cylinder">Machined Cylinder</option>
              <option value="torus">Torus Ring / Washer</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side Controls Panel */}
        <div className="w-80 border-r border-slate-900 bg-[#080d19]/40 flex flex-col overflow-y-auto">
          
          {/* Section 1: Reconstruction Timeline */}
          <div className="border-b border-slate-900">
            <button 
              onClick={() => togglePanel("timeline")}
              className="w-full p-4 flex items-center justify-between text-[10px] tracking-widest uppercase text-slate-400 hover:text-slate-200"
            >
              <span>1. Pipeline Timeline</span>
              {panels.timeline ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            
            {panels.timeline && (
              <div className="px-4 pb-4 flex flex-col gap-1">
                {[
                  { key: "upload", name: "01 / ALIGN SOURCE ANGLES" },
                  { key: "features", name: "02 / COMPUTE KEYPOINTS" },
                  { key: "points", name: "03 / SPARSE POINT CLOUD" },
                  { key: "mesh", name: "04 / SOLID BOUNDARY GENERATION" }
                ].map((step) => (
                  <div
                    key={step.key}
                    className={`px-3 py-1.5 rounded-sm border text-[10px] transition font-bold ${
                      activeStep === step.key
                        ? "bg-[#050811] border-sky-600 text-sky-400"
                        : "bg-transparent border-transparent text-slate-600"
                    }`}
                  >
                    {step.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Angle Capture Slots */}
          <div className="border-b border-slate-900">
            <button 
              onClick={() => togglePanel("alignment")}
              className="w-full p-4 flex items-center justify-between text-[10px] tracking-widest uppercase text-slate-400 hover:text-slate-200"
            >
              <span>2. Angular Projections</span>
              {panels.alignment ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>

            {panels.alignment && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <div key={slot.id} className="bg-[#050811] border border-slate-900 p-2 rounded-sm flex flex-col gap-1.5">
                      <span className="text-[9px] text-slate-500 font-bold tracking-tight">{slot.label}</span>
                      
                      <label className="relative aspect-[4/3] w-full bg-slate-950 border border-dashed border-slate-800 hover:border-slate-700 transition rounded-sm flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                        {slot.url ? (
                          <>
                            <img src={slot.url} alt={slot.label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Upload className="w-3 h-3 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-400 transition">
                            <Upload className="w-3 h-3" />
                            <span className="text-[8px]">INPUT</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadImage(slot.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Process Execution Controls */}
          <div className="mt-auto p-4 bg-[#050811] border-t border-slate-900">
            <span className="text-[9px] text-slate-500 tracking-widest block uppercase mb-3">
              EXECUTION MATRIX
            </span>

            {activeStep === "upload" && (
              <button
                onClick={startReconstruction}
                disabled={processing}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-200 hover:text-white border border-slate-800 disabled:border-slate-900 text-xs font-bold rounded-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                COMPILE MATRIX CLOUD
              </button>
            )}

            {activeStep === "features" && (
              <div className="flex flex-col items-center justify-center py-1">
                <RefreshCw className="w-4 h-4 text-sky-500 animate-spin mb-2" />
                <span className="text-[9px] text-sky-500 font-bold uppercase tracking-wider">COMPUTING POSE CORRELATION: {progress}%</span>
                <div className="w-full bg-slate-950 h-1 rounded-sm mt-2 overflow-hidden border border-slate-900">
                  <div className="bg-sky-600 h-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {activeStep === "points" && (
              <button
                onClick={runPoissonReconstruction}
                disabled={processing}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-200 hover:text-white border border-slate-800 disabled:border-slate-900 text-xs font-bold rounded-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                GENERATE SOLID MESH
              </button>
            )}

            {activeStep === "mesh" && (
              <button
                onClick={handleAddToCADPlayground}
                className="w-full py-2 bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold rounded-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                TRANSMIT TO CAD ENGINE
              </button>
            )}
          </div>
        </div>

        {/* Viewport View Component */}
        <div className="flex-1 relative bg-[#050811] flex flex-col p-4">
          <div className="relative w-full h-full border border-slate-900 bg-[#03060c]">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Instruction Bar Footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#080d19] border-t border-slate-900 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-slate-400" />
                <span>PIPE_STATE: {activeStep.toUpperCase()}</span>
              </span>
              <span>ORBIT: L-CLICK DRAG | ZOOM: SCROLL</span>
            </div>

            {processing && activeStep !== "features" && (
              <div className="absolute inset-0 bg-[#050811]/80 flex flex-col items-center justify-center">
                <RefreshCw className="w-5 h-5 text-sky-500 animate-spin mb-2" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">SOLVING SPATIAL BOUNDARIES: {progress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}