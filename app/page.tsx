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
  Terminal,
  Activity,
} from "lucide-react";

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
      color: "#a1a1aa",
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
  const [projectName, setProjectName] = useState("WORKSPACE_PROJECT_01");
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [showPrimitives, setShowPrimitives] = useState(true);
  const [showWireframe, setShowWireframe] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [activeView, setActiveView] = useState<"dashboard" | "stl-viewer" | "pic-scanner" | "workspace">("dashboard");

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
    setActiveView("workspace");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        showToast(`SYS_AUTH: ${firebaseUser.email}`, "success");
      }
    });
    return () => unsubscribe();
  }, []);

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
        console.error("Firestore initialization error:", error);
        showToast("ERR_FS_LOAD", "error");
      }
    );

    return () => unsubscribe();
  }, [user]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddShape = (type: ShapeConfig["type"], customName?: string) => {
    const id = `shape-${Date.now()}`;
    const newShape: ShapeConfig = {
      id,
      name: customName || `PRIMITIVE_${type.toUpperCase()}`,
      type,
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: "#71717a",
      operation: "merge",
      visible: true,
    };
    setShapes([...shapes, newShape]);
    setSelectedShapeId(id);
    showToast(`ADD_NODE: ${newShape.name}`, "success");
  };

  const handleUpdateShape = (updatedShape: ShapeConfig) => {
    setShapes(shapes.map((s) => (s.id === updatedShape.id ? updatedShape : s)));
  };

  const handleDeleteShape = (id: string) => {
    setShapes(shapes.filter((s) => s.id !== id));
    if (selectedShapeId === id) setSelectedShapeId(null);
    showToast("DEL_NODE_SUCCESS", "info");
  };

  const handleCloneShape = (shape: ShapeConfig) => {
    const id = `shape-${Date.now()}`;
    const cloned: ShapeConfig = {
      ...shape,
      id,
      name: `${shape.name}_COPY`,
      position: { ...shape.position, x: shape.position.x + 0.5, z: shape.position.z + 0.5 },
    };
    setShapes([...shapes, cloned]);
    setSelectedShapeId(id);
    showToast(`CLONE_NODE: ${cloned.name}`, "success");
  };

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, "projects", projectId), payload);
      setCurrentProjectId(projectId);
      showToast("DB_WRITE_SUCCESS", "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, path);
      showToast("DB_WRITE_FAIL", "error");
    }
  };

  const handleLoadProject = (proj: any) => {
    setShapes(proj.shapes || []);
    setCurrentProjectId(proj.id);
    setProjectName(proj.name);
    setSelectedShapeId(null);
    setIsProjectManagerOpen(false);
    showToast(`LOAD_PROJECT_OK`, "success");
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const path = `projects/${id}`;
    try {
      await deleteDoc(doc(db, "projects", id));
      if (currentProjectId === id) setCurrentProjectId(null);
      showToast("DB_DELETE_SUCCESS", "info");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const startNewProject = () => {
    setShapes([]);
    setCurrentProjectId(null);
    setProjectName("UNTITLED_WORKSPACE");
    setSelectedShapeId(null);
    showToast("RESET_CANVAS", "info");
  };

  const handleExportSTL = () => {
    let stlText = "solid academic_mesh_studio\n";
    shapes.forEach((shape) => {
      if (!shape.visible) return;
      stlText += `\n# NODE_NAME: ${shape.name} TYPE: ${shape.type}\n`;
      stlText += `  facet normal 0 0 0\n`;
      stlText += `    outer loop\n`;
      stlText += `      vertex ${shape.position.x} ${shape.position.y} ${shape.position.z}\n`;
      stlText += `      vertex ${shape.position.x + shape.scale.x} ${shape.position.y} ${shape.position.z}\n`;
      stlText += `      vertex ${shape.position.x} ${shape.position.y + shape.scale.y} ${shape.position.z}\n`;
      stlText += `    endloop\n`;
      stlText += `  endfacet\n`;
    });
    stlText += "endsolid academic_mesh_studio\n";

    const blob = new Blob([stlText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, "_")}.stl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("STL_EXPORT_COMPLETED", "success");
  };

  // Shared application header
  const renderWorkspaceHeader = (showBackToDashboard = true) => (
    <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-xs flex-shrink-0">
      <div className="flex items-center gap-4">
        {showBackToDashboard && (
          <button
            onClick={() => setActiveView("dashboard")}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-300 hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>DASHBOARD</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider text-white">METROLOGY_LAB //</span>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-black border border-zinc-800 rounded px-2 py-0.5 text-zinc-300 focus:outline-none focus:border-zinc-500 w-44 font-mono text-[11px]"
            title="Project Identifier"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsProjectManagerOpen(true)}
          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-[11px] flex items-center gap-1.5 transition"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Load</span>
        </button>

        <button
          onClick={handleSaveProject}
          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-[11px] flex items-center gap-1.5 transition"
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <span>Save Matrix</span>
        </button>

        <button
          onClick={handleExportSTL}
          className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium rounded text-[11px] flex items-center gap-1.5 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Compile STL</span>
        </button>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {user ? (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/60 border border-zinc-800 rounded text-[11px] text-zinc-400"
          >
            <UserIcon className="w-3 h-3 text-zinc-400" />
            <span>CLOUD_SYNC: ON</span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded text-[11px] transition"
          >
            <UserIcon className="w-3 h-3" />
            <span>Link Server</span>
          </button>
        )}
      </div>
    </header>
  );

  const renderToast = () => toast && (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-[11px]">
      <div className={`px-3 py-2 border flex items-center gap-2 bg-black shadow-lg ${
        toast.type === "success" ? "border-emerald-800 text-emerald-400" :
        toast.type === "error" ? "border-rose-800 text-rose-400" : "border-zinc-700 text-zinc-400"
      }`}>
        <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
        <span>[{toast.message}]</span>
      </div>
    </div>
  );

  if (activeView === "stl-viewer") {
    return (
      <div className="w-full h-screen overflow-hidden bg-black text-zinc-100 font-mono relative flex flex-col">
        {renderWorkspaceHeader()}
        <div className="flex-1 min-h-0 bg-zinc-950">
          <StlViewerSection onBack={() => setActiveView("dashboard")} showToast={showToast} />
        </div>
        {renderToast()}
      </div>
    );
  }

  if (activeView === "pic-scanner") {
    return (
      <div className="w-full h-screen overflow-hidden bg-black text-zinc-100 font-mono relative flex flex-col">
        {renderWorkspaceHeader()}
        <div className="flex-1 min-h-0 bg-zinc-950">
          <PicScannerSection
            onBack={() => setActiveView("dashboard")}
            showToast={showToast}
            onSendToPlayground={handleSendToPlayground}
          />
        </div>
        {renderToast()}
      </div>
    );
  }

  if (activeView === "dashboard") {
    return (
      <div className="flex flex-col h-screen bg-black text-zinc-200 font-mono selection:bg-zinc-800 relative overflow-hidden">
        
        {/* Core Project Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-1.5 border border-zinc-800 text-zinc-300 bg-black">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold uppercase tracking-widest text-white">
                Computational Metrology &amp; Solid Modeling Suite
              </h1>
              <p className="text-[10px] text-zinc-500">
                Advanced Undergrad Thesis / Systems Architecture Sandbox
              </p>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 text-right">
            <span>STATUS // COMPILER_STABLE</span>
          </div>
        </header>

        {/* Central Dashboard Matrix */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col justify-center">
          
          <div className="mb-8 border-l-2 border-zinc-700 pl-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Select Experimental Application Module
            </h2>
            <p className="text-xs text-zinc-500 max-w-xl">
              Analytical execution interface for CSG constructive solid geometry compilation, geometric triangulation diagnostics, and cloud-vault mesh snapshots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            
            {/* Module 1 */}
            <div
              onClick={() => setActiveView("stl-viewer")}
              className="border border-zinc-800 bg-zinc-950/40 p-5 flex flex-col justify-between hover:border-zinc-500 hover:bg-zinc-950 transition cursor-pointer group"
            >
              <div>
                <div className="w-8 h-8 border border-zinc-800 flex items-center justify-center bg-black mb-4 text-zinc-400 group-hover:text-white transition">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wide">
                  01 // STL Data Analysis
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Parse local stereolithography headers. Extract dimensional matrix maps, computational polygon density tracking, and calculate spatial displacement boundaries.
                </p>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 group-hover:text-zinc-300 tracking-wider mt-4">
                EXECUTE_PARSER &rarr;
              </span>
            </div>

            {/* Module 2 */}
            <div
              onClick={() => setActiveView("workspace")}
              className="border border-zinc-800 bg-zinc-950/40 p-5 flex flex-col justify-between hover:border-zinc-500 hover:bg-zinc-950 transition cursor-pointer group"
            >
              <div>
                <div className="w-8 h-8 border border-zinc-800 flex items-center justify-center bg-black mb-4 text-zinc-400 group-hover:text-white transition">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wide">
                  02 // Constructive Solid Geometry Workspace
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Synthesize complex coordinate bounds. Features geometric Boolean intersections (Merge, Subtract) utilizing localized spatial layer structures.
                </p>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 group-hover:text-zinc-300 tracking-wider mt-4">
                INITIALIZE_WORKSPACE &rarr;
              </span>
            </div>

            {/* Module 3 */}
            <div
              onClick={() => setActiveView("pic-scanner")}
              className="border border-zinc-800 bg-zinc-950/40 p-5 flex flex-col justify-between hover:border-zinc-500 hover:bg-zinc-950 transition cursor-pointer group"
            >
              <div>
                <div className="w-8 h-8 border border-zinc-800 flex items-center justify-center bg-black mb-4 text-zinc-400 group-hover:text-white transition">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wide">
                  03 // Triangulation Photogrammetry
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Simulate point-cloud alignment routines from physical photographic orientations. Maps dynamic vertices into linear vertex clouds.
                </p>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 group-hover:text-zinc-300 tracking-wider mt-4">
                RUN_RECONSTRUCTOR &rarr;
              </span>
            </div>

          </div>
        </main>

        {/* Informative Grid Footer */}
        <footer className="p-4 border-t border-zinc-800 bg-zinc-950 text-[10px] text-zinc-600 flex justify-between items-center px-6">
          <div className="flex gap-4">
            <span>SYS_BOUND: PRIVATE_LOCAL_HOST</span>
            <span>DATA_INTEGRITY: FIREBASE_CLOUD</span>
          </div>
          <span>ACADEMIC EVALUATION DESIGN // © 2026</span>
        </footer>

        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} user={user} />
      </div>
    );
  }

  // Engineering Studio/Workspace View
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-zinc-200 font-mono">
      {renderWorkspaceHeader(true)}

      {/* Main Studio Area */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side Controller Rail */}
        <div className="w-72 bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-5 overflow-y-auto flex-shrink-0 text-[11px]">
          
          {/* Node Creation Panel */}
          <div className="space-y-2">
            <h3 className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
              // INITIALIZE_GEOMETRY_NODE
            </h3>
            <div className="grid grid-cols-1 gap-1">
              <button
                onClick={() => handleAddShape("box")}
                className="flex items-center justify-between px-3 py-1.5 bg-black hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-300 transition text-left"
              >
                <span>+ ADD_PRIMITIVE_BOX</span>
                <Box className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <button
                onClick={() => handleAddShape("cylinder")}
                className="flex items-center justify-between px-3 py-1.5 bg-black hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-300 transition text-left"
              >
                <span>+ ADD_PRIMITIVE_CYLINDER</span>
                <Circle className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <button
                onClick={() => handleAddShape("sphere")}
                className="flex items-center justify-between px-3 py-1.5 bg-black hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-300 transition text-left"
              >
                <span>+ ADD_PRIMITIVE_SPHERE</span>
                <Circle className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <button
                onClick={() => handleAddShape("cone")}
                className="flex items-center justify-between px-3 py-1.5 bg-black hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-300 transition text-left"
              >
                <span>+ ADD_PRIMITIVE_CONE</span>
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <button
                onClick={() => handleAddShape("torus")}
                className="flex items-center justify-between px-3 py-1.5 bg-black hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-300 transition text-left"
              >
                <span>+ ADD_PRIMITIVE_TORUS</span>
                <Circle className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Rendering Options Toggle Panel */}
          <div className="space-y-2 bg-black border border-zinc-800 p-3 rounded">
            <h3 className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
              // VIEWPORT_DIAGNOSTICS
            </h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Primitive Outlines</span>
                <button onClick={() => setShowPrimitives(!showPrimitives)} className="text-zinc-400 hover:text-white transition">
                  {showPrimitives ? <ToggleRight className="w-6 h-6 text-white" /> : <ToggleLeft className="w-6 h-6 text-zinc-700" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Wireframe Mesh Grid</span>
                <button onClick={() => setShowWireframe(!showWireframe)} className="text-zinc-400 hover:text-white transition">
                  {showWireframe ? <ToggleRight className="w-6 h-6 text-white" /> : <ToggleLeft className="w-6 h-6 text-zinc-700" />}
                </button>
              </div>
            </div>
          </div>

          {/* Scene Pipeline / Hierarchy Tree */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
                // NODE_PIPELINE ({shapes.length})
              </h3>
              {shapes.length > 0 && (
                <button onClick={startNewProject} className="text-[10px] text-rose-400 hover:underline">
                  [RESET_TREE]
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 p-1 bg-black border border-zinc-800 rounded">
              {shapes.length === 0 ? (
                <div className="text-center py-8 text-zinc-600">
                  <Activity className="w-4 h-4 mx-auto mb-1.5 text-zinc-700" />
                  <p>NO_ACTIVE_NODES</p>
                </div>
              ) : (
                shapes.map((shape) => (
                  <div
                    key={shape.id}
                    onClick={() => setSelectedShapeId(shape.id)}
                    className={`flex items-center justify-between p-2 rounded border transition cursor-pointer group ${
                      shape.id === selectedShapeId
                        ? "bg-zinc-900 border-zinc-500"
                        : "bg-transparent border-zinc-900 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-none flex-shrink-0" style={{ backgroundColor: shape.color }} />
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-200 truncate">{shape.name}</p>
                        <p className="text-[9px] text-zinc-500 uppercase">
                          {shape.type} // {shape.operation}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShape(shape.id);
                      }}
                      className="p-0.5 text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Central WebGL Viewport Container */}
        <div className="flex-1 relative bg-black flex flex-col p-2">
          <div className="absolute top-4 left-4 z-10 bg-zinc-950/80 backdrop-blur border border-zinc-800 px-2 py-1 text-[10px] text-zinc-500 rounded pointer-events-none">
            RENDER_ENGINE: WEBGL_THREE // WIREFRAME: {showWireframe ? "ON" : "OFF"}
          </div>
          <ThreeCanvas
            shapes={shapes}
            selectedShapeId={selectedShapeId}
            onSelectShape={setSelectedShapeId}
            showPrimitives={showPrimitives}
            showWireframe={showWireframe}
            onUpdateShape={handleUpdateShape}
          />
        </div>

        {/* Right Controls Panel (Metrology Simulator & Vector Inputs) */}
        <div className="w-72 bg-zinc-950 border-l border-zinc-800 p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0 text-[11px]">
          <div className="border border-zinc-800 bg-black p-3 rounded">
            <Scanner onAddScannedShape={handleAddShape} />
          </div>
          
          <div className="flex-1 border border-zinc-800 bg-black p-3 rounded">
            <ShapeEditor
              shape={shapes.find((s) => s.id === selectedShapeId) || null}
              onUpdateShape={handleUpdateShape}
              onDeleteShape={handleDeleteShape}
              onCloneShape={handleCloneShape}
            />
          </div>
        </div>
      </main>

      {/* Cloud Snapshots Sidebar Drawer */}
      {isProjectManagerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex justify-end font-mono">
          <div className="w-80 bg-zinc-950 border-l border-zinc-800 h-full p-5 flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-zinc-400" />
                <h3 className="font-bold text-xs text-zinc-200 uppercase tracking-wider">Project Cache Vault</h3>
              </div>
              <button onClick={() => setIsProjectManagerOpen(false)} className="text-zinc-500 hover:text-white text-[11px]">
                [ESC]
              </button>
            </div>

            {user ? (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <span className="text-[9px] text-zinc-500 tracking-wider block font-bold">
                  // CACHED_MATRICES ({projects.length})
                </span>

                <div className="flex-1 overflow-y-auto space-y-1">
                  {projects.length === 0 ? (
                    <div className="text-center p-4 border border-zinc-800 rounded bg-black text-zinc-600">
                      <p>NO_SNAPSHOTS_FOUND</p>
                    </div>
                  ) : (
                    projects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => handleLoadProject(proj)}
                        className="flex items-center justify-between p-2 bg-black border border-zinc-900 hover:border-zinc-700 rounded cursor-pointer transition"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-300 truncate text-[11px]">{proj.name}</p>
                          <p className="text-[9px] text-zinc-500">
                            {proj.shapes?.length || 0} structures
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteProject(proj.id, e)}
                          className="p-1 text-zinc-600 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-4 border border-zinc-800 rounded bg-black text-zinc-400">
                <p className="text-xs font-bold mb-1">AUTH_REQUIRED</p>
                <p className="text-[10px] text-zinc-600 mb-3">Link profile matrix to load saved matrices from remote instance.</p>
                <button
                  onClick={() => {
                    setIsProjectManagerOpen(false);
                    setIsAuthOpen(true);
                  }}
                  className="w-full bg-zinc-200 hover:bg-zinc-300 text-black text-[11px] font-bold py-1.5 rounded transition"
                >
                  LINK_SERVER
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {renderToast()}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} user={user} />
    </div>
  );
}