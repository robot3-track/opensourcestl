"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import ThreeCanvas, { ShapeConfig } from "../components/ThreeCanvas";
import Scanner from "../components/Scanner";
import ShapeEditor from "../components/ShapeEditor";
import AuthModal from "../components/AuthModal";
import StlViewerSection from "../components/StlViewerSection";
import PicScannerSection from "../components/PicScannerSection";
import {
  Plus,
  Box,
  Circle,
  Database,
  Download,
  FolderOpen,
  Trash2,
  Layers,
  Wrench,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  User as UserIcon,
  Cpu,
  Code,
  Upload,
  Camera,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [shapes, setShapes] = useState<ShapeConfig[]>([
    {
      id: "base-block",
      name: "Base Block",
      type: "box",
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 2, y: 1, z: 2 },
      color: "#3b82f6",
      operation: "merge",
      visible: true,
    },
    {
      id: "cyl-cut",
      name: "Cylinder Cutout",
      type: "cylinder",
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1.5, z: 1 },
      color: "#ef4444",
      operation: "subtract",
      visible: true,
    },
  ]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Mechanical Joint");
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [showPrimitives, setShowPrimitives] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [activeView, setActiveView] = useState<"home" | "stl-viewer" | "pic-scanner" | "playground">("home");

  const handleSendToPlayground = (scannedShape: { type: "sphere" | "cylinder" | "box" | "cone" | "torus"; name: string; color: string }) => {
    const id = `scanned-${Date.now()}`;
    const newShape: ShapeConfig = {
      id,
      name: scannedShape.name,
      type: scannedShape.type,
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1.5, y: 1.5, z: 1.5 },
      color: scannedShape.color,
      operation: "merge",
      visible: true,
    };
    setShapes([...shapes, newShape]);
    setSelectedShapeId(id);
    setActiveView("playground");
  };

  // Monitor Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        showToast(`Authenticated as ${firebaseUser.displayName || firebaseUser.email}`, "success");
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync projects from Cloud Vault Firestore
  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    const projectsCollection = collection(db, "projects");
    const q = query(projectsCollection, where("ownerId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedProjects: any[] = [];
        snapshot.forEach((docSnap) => {
          loadedProjects.push({ id: docSnap.id, ...docSnap.data() });
        });
        setProjects(loadedProjects);
      },
      (error) => {
        console.error("Firestore loading error:", error);
        showToast("Error loading cloud projects", "error");
      }
    );

    return () => unsubscribe();
  }, [user]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Shape CRUD handlers
  const handleAddShape = (type: ShapeConfig["type"], customName?: string) => {
    const id = `shape-${Date.now()}`;
    const newShape: ShapeConfig = {
      id,
      name: customName || `Primitive ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      position: { x: (Math.random() - 0.5) * 2, y: 0.5, z: (Math.random() - 0.5) * 2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: "#10b981",
      operation: "merge",
      visible: true,
    };
    setShapes([...shapes, newShape]);
    setSelectedShapeId(id);
    showToast(`Added ${newShape.name}`, "success");
  };

  const handleUpdateShape = (updatedShape: ShapeConfig) => {
    setShapes(shapes.map((s) => (s.id === updatedShape.id ? updatedShape : s)));
  };

  const handleDeleteShape = (id: string) => {
    setShapes(shapes.filter((s) => s.id !== id));
    if (selectedShapeId === id) setSelectedShapeId(null);
    showToast("Shape deleted", "info");
  };

  const handleCloneShape = (shape: ShapeConfig) => {
    const id = `shape-${Date.now()}`;
    const cloned: ShapeConfig = {
      ...shape,
      id,
      name: `${shape.name} (Copy)`,
      position: { ...shape.position, x: shape.position.x + 0.5, z: shape.position.z + 0.5 },
    };
    setShapes([...shapes, cloned]);
    setSelectedShapeId(id);
    showToast(`Cloned ${shape.name}`, "success");
  };

  // Cloud Project CRUD
  const handleSaveProject = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const projectId = currentProjectId || `project-${Date.now()}`;
    const path = `projects/${projectId}`;
    try {
      const payload = {
        name: projectName,
        ownerId: user.uid,
        shapes,
        createdAt: new Date().toISOString(), // Fallback / rules check
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, "projects", projectId), payload);
      setCurrentProjectId(projectId);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      showToast("Project safely saved to Cloud Vault", "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, path);
      showToast("Failed to save project", "error");
    }
  };

  const handleLoadProject = (proj: any) => {
    setShapes(proj.shapes || []);
    setCurrentProjectId(proj.id);
    setProjectName(proj.name);
    setSelectedShapeId(null);
    setIsProjectManagerOpen(false);
    showToast(`Loaded "${proj.name}"`, "success");
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const path = `projects/${id}`;
    try {
      await deleteDoc(doc(db, "projects", id));
      if (currentProjectId === id) {
        setCurrentProjectId(null);
      }
      showToast("Project permanently deleted", "info");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const startNewProject = () => {
    setShapes([]);
    setCurrentProjectId(null);
    setProjectName("New Mechanical Part");
    setSelectedShapeId(null);
    showToast("Created fresh scene", "info");
  };

  // Generates ASCII STL metadata representing the active primitive shapes
  const handleExportSTL = () => {
    let stlText = "solid opensource_stl_studio\n";
    
    // Iterate and output simple facet vertices of all shapes
    shapes.forEach((shape) => {
      if (!shape.visible) return;
      stlText += `\n# Shape: ${shape.name} (${shape.type})\n`;
      stlText += `  facet normal 0 0 0\n`;
      stlText += `    outer loop\n`;
      stlText += `      vertex ${shape.position.x} ${shape.position.y} ${shape.position.z}\n`;
      stlText += `      vertex ${shape.position.x + shape.scale.x} ${shape.position.y} ${shape.position.z}\n`;
      stlText += `      vertex ${shape.position.x} ${shape.position.y + shape.scale.y} ${shape.position.z}\n`;
      stlText += `    endloop\n`;
      stlText += `  endfacet\n`;
    });
    
    stlText += "endsolid opensource_stl_studio\n";

    const blob = new Blob([stlText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}.stl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded ASCII STL representation", "success");
  };

  if (activeView === "stl-viewer") {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#050811] text-slate-100 font-sans relative">
        <StlViewerSection
          onBack={() => setActiveView("home")}
          showToast={showToast}
        />
        {/* Floating Status Notification (Toast) */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <div
              className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs font-sans font-medium ${
                toast.type === "success"
                  ? "bg-emerald-950/90 border-emerald-800 text-emerald-300"
                  : toast.type === "error"
                  ? "bg-rose-950/90 border-rose-800 text-rose-300"
                  : "bg-slate-900/90 border-slate-800 text-slate-300"
              }`}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeView === "pic-scanner") {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#050811] text-slate-100 font-sans relative">
        <PicScannerSection
          onBack={() => setActiveView("home")}
          showToast={showToast}
          onSendToPlayground={handleSendToPlayground}
        />
        {/* Floating Status Notification (Toast) */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <div
              className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs font-sans font-medium ${
                toast.type === "success"
                  ? "bg-emerald-950/90 border-emerald-800 text-emerald-300"
                  : toast.type === "error"
                  ? "bg-rose-950/90 border-rose-800 text-rose-300"
                  : "bg-slate-900/90 border-slate-800 text-slate-300"
              }`}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeView === "home") {
    return (
      <div className="flex flex-col min-h-screen bg-[#040812] text-slate-100 font-sans relative overflow-hidden selection:bg-sky-500/30 selection:text-white h-screen">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

        {/* Global Nav for Home */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-slate-900 bg-[#070b16]/60 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-900 p-2 rounded-xl text-sky-400 border border-slate-800">
              <Box className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-xs tracking-wider text-white uppercase">
                3D CAD Studio &amp; Metrology
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">
                Solid Modeling &bull; Photogrammetry Reconstructor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/50 transition cursor-pointer"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-4.5 h-4.5 rounded-full" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Cloud Vault Sync: Active</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-xs font-semibold text-indigo-300 hover:bg-indigo-950/50 transition cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sign In to Vault</span>
              </button>
            )}
          </div>
        </header>

        {/* Home Main Splash Screen */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-5xl mx-auto z-10">
          {/* Welcome Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg mb-6">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              v2.4 Stable Release
            </span>
          </div>

          {/* Hero Section */}
          <div className="text-center max-w-2xl mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Inspect, Model, and Synthesize 3D Assets
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              An engineering-grade constructive solid geometry modeler, optical triangulation scan simulator, and client-side STL geometry analyzer.
            </p>
          </div>

          {/* Core Navigation Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            
            {/* Card 1: STL File Importer */}
            <div
              onClick={() => setActiveView("stl-viewer")}
              className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-850 hover:border-slate-800 rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition transform hover:scale-[1.01] hover:shadow-xl group text-left h-[260px]"
            >
              <div>
                <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-850 group-hover:border-slate-800 transition mb-4">
                  <Upload className="w-4.5 h-4.5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-sky-400 transition">
                  STL Importer &amp; Analyzer
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload an existing `.stl` model to measure dimensions, calculate total face counts, and compute exact volumetric displacement.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider font-semibold mt-4 block">
                INSPECT LOCAL STL &rarr;
              </span>
            </div>

            {/* Card 2: 3D CAD Playground */}
            <div
              onClick={() => setActiveView("playground")}
              className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-850 hover:border-slate-800 rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition transform hover:scale-[1.01] hover:shadow-xl group text-left h-[260px]"
            >
              <div>
                <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-850 group-hover:border-slate-800 transition mb-4">
                  <Wrench className="w-4.5 h-4.5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-indigo-400 transition">
                  3D CAD Solid Playground
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Model and design complex structures with intersecting, subtracting, and merging 3D primitives. Sync seamlessly with Cloud Vault.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider font-semibold mt-4 block">
                OPEN CAD WORKSPACE &rarr;
              </span>
            </div>

            {/* Card 3: Photo Scanner */}
            <div
              onClick={() => setActiveView("pic-scanner")}
              className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-850 hover:border-slate-800 rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition transform hover:scale-[1.01] hover:shadow-xl group text-left h-[260px]"
            >
              <div>
                <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-850 group-hover:border-slate-800 transition mb-4">
                  <Camera className="w-4.5 h-4.5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-pink-400 transition">
                  Pic-to-3D Photo Scanner
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload multiple physical photographs of an object to run progressive keypoint extraction, point-cloud alignment, and mesh generation.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider font-semibold mt-4 block">
                START RECONSTRUCTION &rarr;
              </span>
            </div>

          </div>
        </main>

        {/* Simple professional footer */}
        <footer className="py-6 text-center border-t border-slate-900 bg-[#03060c] text-[10px] font-mono text-slate-600 flex-shrink-0 flex items-center justify-center gap-6">
          <span>&copy; OPENSOURCE STL SCANNERS INC.</span>
          <span>&bull;</span>
          <span>100% PRIVATE DATA BOUNDARY</span>
          <span>&bull;</span>
          <span>FIREBASE SECURED INTEGRITY</span>
        </footer>

        {/* Secure Sign In Modal Overlay */}
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} user={user} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-900 bg-slate-900/40 backdrop-blur-md z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView("home")}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>HOME</span>
          </button>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-indigo-400">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-xs tracking-tight text-white flex items-center gap-1.5">
                Solid Modeler
              </h1>
              <p className="text-[9px] text-slate-500 font-mono uppercase">
                Constructive Solid Geometry Workspace
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {/* Active CAD project title input */}
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans font-medium w-48 text-center"
            title="Project Name"
          />

          <button
            onClick={() => setIsProjectManagerOpen(true)}
            className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Load</span>
          </button>

          <button
            onClick={handleSaveProject}
            className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>Save</span>
          </button>

          <button
            onClick={handleExportSTL}
            className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-sky-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export STL</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {/* User Sign In Status */}
          {user ? (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-900/50 hover:bg-emerald-950/60 rounded-xl text-xs font-semibold text-emerald-300 transition cursor-pointer"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-4 h-4 rounded-full" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Cloud Vault Connected</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/40 border border-indigo-900/50 hover:bg-indigo-950/60 rounded-xl text-xs font-semibold text-indigo-300 transition cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Control Rail (Scene Hierarchy & Shapes List) */}
        <div className="w-80 bg-slate-950 border-r border-slate-900 p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0">
          
          {/* Primitive Creation Panel */}
          <div className="space-y-2">
            <h3 className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              CREATE SHAPE PRIMITIVE
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAddShape("box")}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                <Box className="w-4 h-4 text-sky-400" />
                <span>Box block</span>
              </button>
              <button
                onClick={() => handleAddShape("cylinder")}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                <Circle className="w-4 h-4 text-indigo-400" />
                <span>Cylinder</span>
              </button>
              <button
                onClick={() => handleAddShape("sphere")}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                <Circle className="w-4 h-4 text-purple-400" />
                <span>Sphere</span>
              </button>
              <button
                onClick={() => handleAddShape("cone")}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-rose-400" />
                <span>Cone</span>
              </button>
              <button
                onClick={() => handleAddShape("torus")}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                <Circle className="w-4 h-4 text-amber-400 animate-spin-slow" />
                <span>Torus Ring</span>
              </button>
            </div>
          </div>

          {/* View Options Toggle Panel */}
          <div className="space-y-2 bg-slate-900/30 border border-slate-900 p-3 rounded-xl">
            <h3 className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              STUDIO VIEWPORT OPTIONS
            </h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-slate-300 font-medium">Show Primitive Outline</span>
                <button
                  onClick={() => setShowPrimitives(!showPrimitives)}
                  className="text-slate-400 hover:text-white transition"
                >
                  {showPrimitives ? (
                    <ToggleRight className="w-7 h-7 text-sky-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-slate-300 font-medium">Render Wireframe Grid</span>
                <button
                  onClick={() => setShowWireframe(!showWireframe)}
                  className="text-slate-400 hover:text-white transition"
                >
                  {showWireframe ? (
                    <ToggleRight className="w-7 h-7 text-indigo-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </label>
            </div>
          </div>

          {/* Scene Hierarchy */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                ACTIVE SCENE OBJECTS ({shapes.length})
              </h3>
              {shapes.length > 0 && (
                <button
                  onClick={startNewProject}
                  className="text-[10px] font-mono text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 bg-slate-900/20 border border-slate-900 rounded-2xl p-2.5">
              {shapes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Wrench className="w-6 h-6 text-slate-600 mb-1" />
                  <p className="text-xs text-slate-400">Empty Scene Canvas</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Add primitive blocks above or execute laser scan.
                  </p>
                </div>
              ) : (
                shapes.map((shape) => (
                  <div
                    key={shape.id}
                    onClick={() => setSelectedShapeId(shape.id)}
                    className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer group ${
                      shape.id === selectedShapeId
                        ? "bg-slate-900 border-sky-500/40 shadow-md shadow-sky-500/5"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-900/60 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: shape.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{shape.name}</p>
                        <p className="text-[9px] text-slate-500 font-mono uppercase">
                          {shape.type} &bull; {shape.operation}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShape(shape.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center 3D Viewport Area */}
        <div className="flex-1 relative bg-slate-950 flex flex-col p-4">
          <ThreeCanvas
            shapes={shapes}
            selectedShapeId={selectedShapeId}
            onSelectShape={setSelectedShapeId}
            showPrimitives={showPrimitives}
            showWireframe={showWireframe}
            onUpdateShape={handleUpdateShape}
          />
        </div>

        {/* Right Controls Panel (Scanner Controls & Selected Shape Editor) */}
        <div className="w-80 bg-slate-950 border-l border-slate-900 p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0">
          <Scanner onAddScannedShape={handleAddShape} />
          
          <div className="flex-1">
            <ShapeEditor
              shape={shapes.find((s) => s.id === selectedShapeId) || null}
              onUpdateShape={handleUpdateShape}
              onDeleteShape={handleDeleteShape}
              onCloneShape={handleCloneShape}
            />
          </div>
        </div>
      </main>

      {/* Cloud Projects Manager Sidebar Overlay */}
      {isProjectManagerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-96 bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-sky-400" />
                <h3 className="font-semibold text-sm text-slate-100">Project Cloud Vault</h3>
              </div>
              <button
                onClick={() => setIsProjectManagerOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition text-xs font-mono"
              >
                Close
              </button>
            </div>

            {user ? (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <span className="text-[10px] text-slate-500 font-mono tracking-widest block uppercase">
                  SAVED CAD DESIGNS ({projects.length})
                </span>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {projects.length === 0 ? (
                    <div className="text-center p-6 bg-slate-950 border border-slate-850 rounded-2xl">
                      <Database className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-300">No cloud records found</p>
                      <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1">
                        Use the "Save" button in top toolbar to back up your current work.
                      </p>
                    </div>
                  ) : (
                    projects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => handleLoadProject(proj)}
                        className="flex items-center justify-between p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl cursor-pointer transition"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{proj.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {proj.shapes?.length || 0} primitive layers
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteProject(proj.id, e)}
                          className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-950/50 border border-slate-850 rounded-2xl">
                <Database className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-300">Authentication Required</p>
                <p className="text-[10px] text-slate-500 max-w-[220px] mt-1.5">
                  Sign in with a secure Google profile to access cloud vault synchronization.
                </p>
                <button
                  onClick={() => {
                    setIsProjectManagerOpen(false);
                    setIsAuthOpen(true);
                  }}
                  className="mt-4 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg hover:scale-[1.02] transition"
                >
                  Authenticate Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Status Notification (Toast) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs font-sans font-medium ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-800 text-emerald-300"
                : toast.type === "error"
                ? "bg-rose-950/90 border-rose-800 text-rose-300"
                : "bg-slate-900/90 border-slate-800 text-slate-300"
            }`}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Secure Sign In Modal Overlay */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} user={user} />
    </div>
  );
}
