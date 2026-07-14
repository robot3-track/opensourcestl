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

  const primitiveMeshesRef = useRef<{ [id: string]: THREE.Mesh }>({});
  const [transformMode, setTransformMode] = useState<"translate" | "rotate" | "scale">("translate");

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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050811");
    scene.fog = new THREE.FogExp2("#050811", 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(6, 6, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight("#1e293b", 1.5);
    scene.add(ambientLight);

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

    const fillLight = new THREE.DirectionalLight("#38bdf8", 0.8);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight("#f43f5e", 1.5, 30);
    rimLight.position.set(3, 5, -5);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(30, 30, "#475569", "#1e293b");
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const polarGrid = new THREE.PolarGridHelper(15, 16, 8, 64, "#334155", "#1e293b");
    polarGrid.position.y = -0.005;
    scene.add(polarGrid);

    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.position.set(-5, 0.05, -5);
    scene.add(axesHelper);

    const shapesGroup = new THREE.Group();
    scene.add(shapesGroup);
    shapesGroupRef.current = shapesGroup;

    const transformControls = new TransformControls(camera, renderer.domElement);
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

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

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      if (transformControlsRef.current?.dragging || transformControlsRef.current?.pointerIsOver) {
        return;
      }

      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
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

  useEffect(() => {
    const scene = sceneRef.current;
    const shapesGroup = shapesGroupRef.current;
    if (!scene || !shapesGroup) return;

    while (shapesGroup.children.length > 0) {
      shapesGroup.remove(shapesGroup.children[0]);
    }
    if (csgMeshRef.current) {
      scene.remove(csgMeshRef.current);
      csgMeshRef.current = null;
    }
    primitiveMeshesRef.current = {};

    const visibleShapes = shapes.filter((s) => s.visible);

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

    visibleShapes.forEach((shape) => {
      const geometry = createGeometry(shape.type);
      const isSelected = shape.id === selectedShapeId;

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

      mesh.userData = { shapeId: shape.id };

      if (isSelected && showPrimitives) {
        const edgeGeom = new THREE.EdgesGeometry(geometry);
        const lineMat = new THREE.LineBasicMaterial({ color: "#f43f5e", linewidth: 2 });
        const wireframeLines = new THREE.LineSegments(edgeGeom, lineMat);
        mesh.add(wireframeLines);
      }

      shapesGroup.add(mesh);
      primitiveMeshesRef.current[shape.id] = mesh;
    });

    try {
      let combinedCSG: CSG | null = null;

      visibleShapes.forEach((shape) => {
        const mesh = primitiveMeshesRef.current[shape.id];
        if (!mesh) return;

        mesh.updateMatrix();
        mesh.updateMatrixWorld();

        const currentCSG = CSG.fromMesh(mesh);

        if (!combinedCSG) {
          combinedCSG = currentCSG;
        } else {
          if (shape.operation === "merge") {
            combinedCSG = combinedCSG.union(currentCSG);
          } else if (shape.operation === "subtract") {
            combinedCSG = combinedCSG.subtract(currentCSG);
          } else if (shape.operation === "intersect") {
            combinedCSG = combinedCSG.intersect(currentCSG);
          }
        }
      });

      if (combinedCSG) {
        const resultMesh = CSG.toMesh(combinedCSG, new THREE.Matrix4());
        
        resultMesh.material = new THREE.MeshStandardMaterial({
          color: "#38bdf8",
          roughness: 0.25,
          metalness: 0.8,
          wireframe: showWireframe,
          flatShading: true,
        });

        resultMesh.castShadow = true;
        resultMesh.receiveShadow = true;
        resultMesh.position.set(0, 0, 0);

        resultMesh.userData = { isCsgModel: true };

        scene.add(resultMesh);
        csgMeshRef.current = resultMesh;
      }
    } catch (csgError) {
      console.warn("CSG execution warning:", csgError);
    }

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

  useEffect(() => {
    const transformControls = transformControlsRef.current;
    if (transformControls) {
      transformControls.setMode(transformMode);
    }
  }, [transformMode]);

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
    <div className="relative w-full h-full rounded-sm overflow-hidden border border-slate-900">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute top-4 left-4 bg-[#080d19] border border-slate-800 rounded-sm px-3 py-2 text-[10px] flex flex-col gap-1 pointer-events-none">
        <span className="font-mono text-slate-400">CAMERA: Orbit drag | Pan right-click | Zoom scroll</span>
        {selectedShapeId && showPrimitives ? (
          <span className="font-mono text-indigo-400">GIZMO: Drag handles | [W] Move | [E] Rotate | [R] Scale</span>
        ) : (
          <span className="font-mono text-slate-500">CSG RENDERING: Auto-compiled solid model</span>
        )}
      </div>

      {selectedShapeId && showPrimitives && (
        <div className="absolute top-4 right-4 bg-[#080d19] border border-slate-800 rounded-sm p-1 flex gap-1 z-10">
          <button
            onClick={() => setTransformMode("translate")}
            className={`px-2.5 py-1 rounded-sm flex items-center gap-1.5 text-[10px] font-mono font-semibold transition cursor-pointer ${
              transformMode === "translate"
                ? "bg-slate-900 text-sky-400 border border-slate-700"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Translate Mode [W]"
          >
            <Move className="w-3 h-3" />
            <span>Move [W]</span>
          </button>
          <button
            onClick={() => setTransformMode("rotate")}
            className={`px-2.5 py-1 rounded-sm flex items-center gap-1.5 text-[10px] font-mono font-semibold transition cursor-pointer ${
              transformMode === "rotate"
                ? "bg-slate-900 text-sky-400 border border-slate-700"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Rotate Mode [E]"
          >
            <RotateCw className="w-3 h-3" />
            <span>Rotate [E]</span>
          </button>
          <button
            onClick={() => setTransformMode("scale")}
            className={`px-2.5 py-1 rounded-sm flex items-center gap-1.5 text-[10px] font-mono font-semibold transition cursor-pointer ${
              transformMode === "scale"
                ? "bg-slate-900 text-sky-400 border border-slate-700"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Scale Mode [R]"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Scale [R]</span>
          </button>
        </div>
      )}
    </div>
  );
}