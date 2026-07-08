"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { CSG } from "three-csg-ts";
import { Move, RotateCw, Maximize2 } from "lucide-react";

export interface ShapeConfig {
  id: string;
  name: string;
  type: "box" | "sphere" | "cylinder" | "cone" | "torus";
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  operation: "merge" | "subtract" | "intersect";
  visible: boolean;
}

interface ThreeCanvasProps {
  shapes: ShapeConfig[];
  selectedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
  showPrimitives: boolean;
  showWireframe: boolean;
  onUpdateShape: (updated: ShapeConfig) => void;
}

export default function ThreeCanvas({
  shapes,
  selectedShapeId,
  onSelectShape,
  showPrimitives,
  showWireframe,
  onUpdateShape,
}: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const shapesGroupRef = useRef<THREE.Group | null>(null);
  const csgMeshRef = useRef<THREE.Mesh | null>(null);

  // Keep tracks of meshes representing individual primitive shapes
  const primitiveMeshesRef = useRef<{ [id: string]: THREE.Mesh }>({});

  const [transformMode, setTransformMode] = useState<"translate" | "rotate" | "scale">("translate");

  // Keep shapes and callbacks fresh in refs to prevent closures from holding stale values
  const shapesRef = useRef(shapes);
  const onUpdateShapeRef = useRef(onUpdateShape);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    onUpdateShapeRef.current = onUpdateShape;
  }, [onUpdateShape]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene with a dark tech theme background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#090d16");
    scene.fog = new THREE.FogExp2("#090d16", 0.015);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(6, 6, 8);
    cameraRef.current = camera;

    // Renderer with high-quality antialiasing and shadow support
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear any previous canvas
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underground
    controlsRef.current = controls;

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight("#1e293b", 1.5);
    scene.add(ambientLight);

    // Directional Main Key Light (Shadow casting)
    const dirLight = new THREE.DirectionalLight("#ffffff", 2.0);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    const d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Soft Blue Fill Light
    const fillLight = new THREE.DirectionalLight("#38bdf8", 0.8);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    // Warm Accent Rim Light
    const rimLight = new THREE.PointLight("#f43f5e", 1.5, 30);
    rimLight.position.set(3, 5, -5);
    scene.add(rimLight);

    // CAD Grid & Ground Platform
    const gridHelper = new THREE.GridHelper(30, 30, "#475569", "#1e293b");
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Polar Grid for mechanical feeling
    const polarGrid = new THREE.PolarGridHelper(15, 16, 8, 64, "#334155", "#1e293b");
    polarGrid.position.y = -0.005;
    scene.add(polarGrid);

    // Add Axes Helper
    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.position.set(-5, 0.05, -5);
    // Style axes helper nicely
    scene.add(axesHelper);

    // Group to hold all primitive shapes for raycasting and CSG input
    const shapesGroup = new THREE.Group();
    scene.add(shapesGroup);
    shapesGroupRef.current = shapesGroup;

    // Create TransformControls for interactive gizmos
    const transformControls = new TransformControls(camera, renderer.domElement);
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    // Disable orbit camera controls during dragging, and trigger React sync on release
    transformControls.addEventListener("dragging-changed", (event) => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !event.value;
      }
      if (!event.value) {
        const mesh = transformControls.object;
        if (mesh) {
          const shapeId = mesh.userData?.shapeId;
          const originalShape = shapesRef.current.find((s) => s.id === shapeId);
          if (originalShape && onUpdateShapeRef.current) {
            onUpdateShapeRef.current({
              ...originalShape,
              position: {
                x: Number(mesh.position.x.toFixed(2)),
                y: Number(mesh.position.y.toFixed(2)),
                z: Number(mesh.position.z.toFixed(2)),
              },
              rotation: {
                x: Math.round(THREE.MathUtils.radToDeg(mesh.rotation.x)),
                y: Math.round(THREE.MathUtils.radToDeg(mesh.rotation.y)),
                z: Math.round(THREE.MathUtils.radToDeg(mesh.rotation.z)),
              },
              scale: {
                x: Number(Math.max(0.1, mesh.scale.x).toFixed(2)),
                y: Number(Math.max(0.1, mesh.scale.y).toFixed(2)),
                z: Number(Math.max(0.1, mesh.scale.z).toFixed(2)),
              },
            });
          }
        }
      }
    });

    // Raycasting for shape selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      // Prevent selection changes when actively dragging or clicking the transform handle gizmos
      if (transformControlsRef.current?.dragging || transformControlsRef.current?.pointerIsOver) {
        return;
      }

      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Calculate normalized mouse coordinates
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      // Raycast against primitives if they are shown, otherwise against CSG mesh
      const intersects = raycaster.intersectObjects(
        showPrimitives ? shapesGroup.children : csgMeshRef.current ? [csgMeshRef.current] : [],
        true
      );

      if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        const clickedShapeId = hitObject.userData?.shapeId;
        if (clickedShapeId) {
          onSelectShape(clickedShapeId);
        }
      } else {
        onSelectShape(null);
      }
    };

    containerRef.current.addEventListener("click", handleCanvasClick);

    // Resize observer
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (containerRef.current) {
        containerRef.current.removeEventListener("click", handleCanvasClick);
      }
      if (transformControlsRef.current) {
        transformControlsRef.current.dispose();
      }
    };
  }, [showPrimitives, onSelectShape]);

  // Handle Updates to Shapes (Rebuilds primitives & CSG model)
  useEffect(() => {
    const scene = sceneRef.current;
    const shapesGroup = shapesGroupRef.current;
    if (!scene || !shapesGroup) return;

    // 1. Clear existing meshes
    while (shapesGroup.children.length > 0) {
      shapesGroup.remove(shapesGroup.children[0]);
    }
    if (csgMeshRef.current) {
      scene.remove(csgMeshRef.current);
      csgMeshRef.current = null;
    }
    primitiveMeshesRef.current = {};

    // Filter only visible shapes
    const visibleShapes = shapes.filter((s) => s.visible);

    // Helper to get geometry based on shape type
    const createGeometry = (type: ShapeConfig["type"]) => {
      switch (type) {
        case "box":
          return new THREE.BoxGeometry(1, 1, 1);
        case "sphere":
          return new THREE.SphereGeometry(0.5, 32, 32);
        case "cylinder":
          return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        case "cone":
          return new THREE.ConeGeometry(0.5, 1, 32);
        case "torus":
          return new THREE.TorusGeometry(0.4, 0.15, 16, 100);
        default:
          return new THREE.BoxGeometry(1, 1, 1);
      }
    };

    // 2. Re-create primitive meshes in the shapesGroup
    visibleShapes.forEach((shape) => {
      const geometry = createGeometry(shape.type);
      const isSelected = shape.id === selectedShapeId;

      // Material for individual primitive preview
      const material = new THREE.MeshStandardMaterial({
        color: shape.color,
        roughness: 0.4,
        metalness: 0.2,
        transparent: true,
        opacity: showPrimitives ? (isSelected ? 0.75 : 0.35) : 0.0,
        wireframe: showWireframe,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(shape.position.x, shape.position.y, shape.position.z);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(shape.rotation.x),
        THREE.MathUtils.degToRad(shape.rotation.y),
        THREE.MathUtils.degToRad(shape.rotation.z)
      );
      mesh.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Store ID metadata in mesh userData for raycasting
      mesh.userData = { shapeId: shape.id };

      // Add a thin highlight wireframe overlay if selected
      if (isSelected && showPrimitives) {
        const edgeGeom = new THREE.EdgesGeometry(geometry);
        const lineMat = new THREE.LineBasicMaterial({ color: "#f43f5e", linewidth: 2 });
        const wireframeLines = new THREE.LineSegments(edgeGeom, lineMat);
        mesh.add(wireframeLines);
      }

      shapesGroup.add(mesh);
      primitiveMeshesRef.current[shape.id] = mesh;
    });

    // 3. Compute CSG model (Constructive Solid Geometry)
    try {
      let combinedCSG: CSG | null = null;

      // Ensure we process shapes in order: primary first, then others subtracted/intersected/merged
      visibleShapes.forEach((shape) => {
        const mesh = primitiveMeshesRef.current[shape.id];
        if (!mesh) return;

        // Ensure matrices are up to date
        mesh.updateMatrix();
        mesh.updateMatrixWorld();

        const currentCSG = CSG.fromMesh(mesh);

        if (!combinedCSG) {
          // First shape initializes the base CSG
          combinedCSG = currentCSG;
        } else {
          // Perform operation
          if (shape.operation === "merge") {
            combinedCSG = combinedCSG.union(currentCSG);
          } else if (shape.operation === "subtract") {
            combinedCSG = combinedCSG.subtract(currentCSG);
          } else if (shape.operation === "intersect") {
            combinedCSG = combinedCSG.intersect(currentCSG);
          }
        }
      });

      // Render the compiled CSG solid mesh
      if (combinedCSG) {
        // Build mesh from CSG
        const resultMesh = CSG.toMesh(combinedCSG, new THREE.Matrix4());
        
        // Give the solid final product a sleek metallic titanium styling
        resultMesh.material = new THREE.MeshStandardMaterial({
          color: "#38bdf8", // Cool digital cyan / titanium
          roughness: 0.25,
          metalness: 0.8,
          wireframe: showWireframe,
          flatShading: true,
        });

        resultMesh.castShadow = true;
        resultMesh.receiveShadow = true;
        resultMesh.position.set(0, 0, 0); // Combined is in global center

        // Attach metadata for raycasting selection
        resultMesh.userData = { isCsgModel: true };

        scene.add(resultMesh);
        csgMeshRef.current = resultMesh;
      }
    } catch (csgError) {
      console.warn("CSG execution warning:", csgError);
    }

    // 4. Attach TransformControls to the currently selected primitive shape mesh
    const transformControls = transformControlsRef.current;
    if (transformControls) {
      if (selectedShapeId && showPrimitives) {
        const selectedMesh = primitiveMeshesRef.current[selectedShapeId];
        if (selectedMesh) {
          transformControls.attach(selectedMesh);
          transformControls.setMode(transformMode);
        } else {
          transformControls.detach();
        }
      } else {
        transformControls.detach();
      }
    }
  }, [shapes, selectedShapeId, showPrimitives, showWireframe, transformMode]);

  // Sync TransformControls mode when transformMode state changes
  useEffect(() => {
    const transformControls = transformControlsRef.current;
    if (transformControls) {
      transformControls.setMode(transformMode);
    }
  }, [transformMode]);

  // Keyboard shortcuts for switching transform modes (W: Translate, E: Rotate, R: Scale)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedShapeId) return;
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "SELECT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "w") {
        setTransformMode("translate");
      } else if (key === "e") {
        setTransformMode("rotate");
      } else if (key === "r") {
        setTransformMode("scale");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedShapeId]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Control overlay on the viewport */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-xs flex flex-col gap-1 shadow-lg pointer-events-none">
        <span className="font-mono text-slate-400">CAMERA: Orbit drag | Pan right-click | Zoom scroll</span>
        {selectedShapeId && showPrimitives ? (
          <span className="font-mono text-indigo-400">GIZMO: Drag handles | [W] Move | [E] Rotate | [R] Scale</span>
        ) : (
          <span className="font-mono text-slate-500">CSG RENDERING: Auto-compiled solid model</span>
        )}
      </div>

      {/* Floating Transform Mode Controls */}
      {selectedShapeId && showPrimitives && (
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 flex gap-1 shadow-lg z-10">
          <button
            onClick={() => setTransformMode("translate")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-medium transition cursor-pointer ${
              transformMode === "translate"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title="Translate Mode [W]"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Move [W]</span>
          </button>
          <button
            onClick={() => setTransformMode("rotate")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-medium transition cursor-pointer ${
              transformMode === "rotate"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title="Rotate Mode [E]"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate [E]</span>
          </button>
          <button
            onClick={() => setTransformMode("scale")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-medium transition cursor-pointer ${
              transformMode === "scale"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title="Scale Mode [R]"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Scale [R]</span>
          </button>
        </div>
      )}
    </div>
  );
}
