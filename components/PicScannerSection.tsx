"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Camera, Image as ImageIcon, Sparkles, RefreshCw, Layers, ArrowLeft, Upload, CheckCircle, Plus } from "lucide-react";

interface PicScannerSectionProps {
  onBack: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onSendToPlayground: (scannedShape: { type: "sphere" | "cylinder" | "box" | "cone" | "torus"; name: string; color: string }) => void;
}

export default function PicScannerSection({ onBack, showToast, onSendToPlayground }: PicScannerSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState<"upload" | "features" | "points" | "mesh">("upload");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Scanned Target Selection
  const [targetPreset, setTargetPreset] = useState<"crown" | "screw" | "torus">("crown");

  // Mock pictures uploaded
  const [pictures, setPictures] = useState<string[]>([
    "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=200&auto=format&fit=crop&q=60", 
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=200&auto=format&fit=crop&q=60"
  ]);

  // ThreeJS references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  // Objects refs in scene
  const pointCloudRef = useRef<THREE.Points | null>(null);
  const reconstructedMeshRef = useRef<THREE.Mesh | null>(null);

  // Initialize Canvas
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
    camera.position.set(3, 2.5, 4);
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

    // Neutral studio lighting
    const ambientLight = new THREE.AmbientLight("#0f172a", 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight("#f8fafc", 2.0);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight("#38bdf8", 1.0);
    fillLight.position.set(-5, 4, -5);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(20, 20, "#1e293b", "#0f172a");
    grid.position.y = -1.0;
    scene.add(grid);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (pointCloudRef.current) {
        pointCloudRef.current.rotation.y += 0.002;
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

  // Update ThreeJS mesh depending on the step
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (pointCloudRef.current) scene.remove(pointCloudRef.current);
    if (reconstructedMeshRef.current) scene.remove(reconstructedMeshRef.current);
    pointCloudRef.current = null;
    reconstructedMeshRef.current = null;

    if (activeStep === "points" || activeStep === "mesh") {
      const count = 3000;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const colorBase = targetPreset === "crown" ? new THREE.Color("#e2e8f0") : targetPreset === "screw" ? new THREE.Color("#475569") : new THREE.Color("#64748b");

      for (let i = 0; i < count; i++) {
        let x = 0, y = 0, z = 0;

        if (targetPreset === "crown") {
          const u = Math.random();
          const v = Math.random();
          const theta = u * 2.0 * Math.PI;
          const phi = Math.acos(2.0 * v - 1.0);
          const r = 0.8 + Math.sin(theta * 4) * 0.08;
          x = r * Math.sin(phi) * Math.cos(theta);
          y = Math.abs(r * Math.sin(phi) * Math.sin(theta));
          z = r * Math.cos(phi);
        } else if (targetPreset === "screw") {
          const theta = Math.random() * Math.PI * 8;
          const h = (Math.random() - 0.5) * 1.8;
          const r = 0.5 + (theta % (2 * Math.PI) < 0.5 ? 0.05 : 0);
          x = r * Math.cos(theta);
          y = h;
          z = r * Math.sin(theta);
        } else {
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          const R = 0.9;
          const r = 0.3;
          x = (R + r * Math.cos(v)) * Math.cos(u);
          y = r * Math.sin(v);
          z = (R + r * Math.cos(v)) * Math.sin(u);
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const c = colorBase.clone().multiplyScalar(0.8 + Math.random() * 0.2);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      const pointsGeom = new THREE.BufferGeometry();
      pointsGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const pointsMat = new THREE.PointsMaterial({
        size: 0.025,
        vertexColors: true,
        transparent: true,
        opacity: activeStep === "points" ? 0.95 : 0.3,
      });

      const cloud = new THREE.Points(pointsGeom, pointsMat);
      scene.add(cloud);
      pointCloudRef.current = cloud;
    }

    if (activeStep === "mesh") {
      let geometry: THREE.BufferGeometry;
      let matColor = "#cbd5e1";

      if (targetPreset === "crown") {
        geometry = new THREE.SphereGeometry(0.85, 32, 16);
        matColor = "#f1f5f9";
        
        const pos = geometry.attributes.position;
        const tempV = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          tempV.fromBufferAttribute(pos, i);
          if (tempV.y > 0.1) {
            const angle = Math.atan2(tempV.z, tempV.x);
            tempV.y += Math.sin(angle * 4) * 0.1;
          }
          pos.setXYZ(i, tempV.x, tempV.y, tempV.z);
        }
      } else if (targetPreset === "screw") {
        geometry = new THREE.CylinderGeometry(0.5, 0.52, 1.8, 32, 16);
        matColor = "#94a3b8";
      } else {
        geometry = new THREE.TorusGeometry(0.9, 0.28, 16, 64);
        matColor = "#64748b";
      }

      geometry.computeVertexNormals();

      const meshMat = new THREE.MeshStandardMaterial({
        color: matColor,
        roughness: 0.4,
        metalness: 0.1,
        flatShading: false,
      });

      const mesh = new THREE.Mesh(geometry, meshMat);
      scene.add(mesh);
      reconstructedMeshRef.current = mesh;

      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(1.8, 1.5, 2.2);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  }, [activeStep, targetPreset]);

  const startReconstruction = () => {
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
          showToast("Extracted and aligned sparse point cloud", "success");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
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
          showToast("Compiled surface mesh geometry", "success");
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleAddToCADPlayground = () => {
    const shapeType = targetPreset === "crown" ? "sphere" : targetPreset === "screw" ? "cylinder" : "torus";
    const color = targetPreset === "crown" ? "#f1f5f9" : targetPreset === "screw" ? "#94a3b8" : "#64748b";
    
    onSendToPlayground({
      type: shapeType,
      name: `Scan [${targetPreset.toUpperCase()}]`,
      color,
    });
    showToast("Scanned model imported to solid workspace", "success");
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPictures([url, ...pictures.slice(0, 2)]);
    setActiveStep("upload");
    showToast("Photo feed reference registered", "info");
  };

  return (
    <div className="flex flex-col h-full bg-[#050811] text-slate-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-[#080d19]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK</span>
          </button>
          <div className="h-5 w-px bg-slate-800" />
          <div>
            <h1 className="text-xs font-bold tracking-wider text-white uppercase">
              Photogrammetry 3D Reconstructor
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">Synthesize 3D models from photo series</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Source Template:</span>
          <select
            value={targetPreset}
            onChange={(e) => {
              setTargetPreset(e.target.value as "crown" | "screw" | "torus");
              setActiveStep("upload");
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-sans"
          >
            <option value="crown">Dental Crown</option>
            <option value="screw">Machined Pin Bolt</option>
            <option value="torus">Torus Space Washer</option>
          </select>
        </div>
      </header>

      {/* Main workspace layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left pane controls */}
        <div className="w-80 border-r border-slate-900 bg-[#050811] p-5 flex flex-col gap-4 overflow-y-auto">
          
          {/* Progress Sequence */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest block uppercase">
              RECONSTRUCTION TIMELINE
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                { key: "upload", name: "1. Align Perspective Photos" },
                { key: "features", name: "2. Keypoint Matching" },
                { key: "points", name: "3. Interpolate Point Cloud" },
                { key: "mesh", name: "4. Generate Solid Mesh" }
              ].map((step) => {
                const isCurrent = activeStep === step.key;
                return (
                  <div
                    key={step.key}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-sans font-medium transition ${
                      isCurrent
                        ? "bg-slate-900 border-sky-500/30 text-sky-400 shadow-sm"
                        : "bg-transparent border-transparent text-slate-500"
                    }`}
                  >
                    {step.name}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Picture feed list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                Reference Angles ({pictures.length})
              </span>
              <label className="text-[10px] text-sky-400 hover:text-sky-300 font-sans cursor-pointer flex items-center gap-1 select-none">
                <Plus className="w-3 h-3" />
                <span>Add perspective</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 border border-slate-900 rounded-xl">
              {pictures.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                  <img
                    src={url}
                    alt={`Reference ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {activeStep === "features" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-sky-500/10">
                      <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping" />
                    </div>
                  )}

                  {activeStep !== "upload" && activeStep !== "features" && (
                    <div className="absolute top-1 right-1 bg-sky-500 text-white rounded-full p-0.5 shadow-md">
                      <CheckCircle className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-auto">
            <span className="text-[10px] text-slate-400 font-mono tracking-widest block uppercase">
              Process Controls
            </span>

            {activeStep === "upload" && (
              <button
                onClick={startReconstruction}
                disabled={processing}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 text-white border border-slate-700 disabled:border-slate-850 font-medium text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Align &amp; Generate Point Cloud
              </button>
            )}

            {activeStep === "features" && (
              <div className="flex flex-col items-center justify-center text-center py-2">
                <RefreshCw className="w-5 h-5 text-sky-400 animate-spin mb-1.5" />
                <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase tracking-wider">Analyzing Photos: {progress}%</span>
                <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-sky-500 h-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {activeStep === "points" && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 leading-normal font-sans text-center">
                  Points matched. Interpolate the sparse cloud into a solid, closed boundary mesh.
                </p>
                <button
                  onClick={runPoissonReconstruction}
                  disabled={processing}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 text-white border border-slate-700 disabled:border-slate-850 font-medium text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Generate Solid Mesh
                </button>
              </div>
            )}

            {activeStep === "mesh" && (
              <div className="space-y-2">
                <button
                  onClick={handleAddToCADPlayground}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Send to Solid Workspace
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Viewport Canvas */}
        <div className="flex-1 relative bg-[#050811] flex flex-col p-4">
          <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-900 shadow-xl bg-[#03060c]">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Instruction bar */}
            <div className="absolute bottom-4 left-4 right-4 bg-[#080d19]/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span className="uppercase tracking-wider">STATE: {activeStep === "upload" ? "Ready" : activeStep === "features" ? "Analyzing..." : activeStep === "points" ? "Point cloud" : "Closed mesh"}</span>
              </span>
              <span>Left-click drag to orbit | Scroll to zoom</span>
            </div>

            {processing && activeStep !== "features" && (
              <div className="absolute inset-0 bg-[#050811]/70 backdrop-blur-sm flex flex-col items-center justify-center">
                <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mb-2" />
                <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">Reconstructing Boundary: {progress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
