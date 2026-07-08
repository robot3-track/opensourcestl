import * as THREE from "three";

export function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const isBinary = (buf: ArrayBuffer) => {
    if (buf.byteLength < 84) return false;
    const reader = new DataView(buf);
    const faceCount = reader.getUint32(80, true);
    const expectedSize = 80 + 4 + faceCount * 50;
    return buf.byteLength === expectedSize;
  };

  if (isBinary(buffer)) {
    return parseBinarySTL(buffer);
  } else {
    return parseAsciiSTL(new TextDecoder().decode(buffer));
  }
}

function parseBinarySTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const reader = new DataView(buffer);
  const faceCount = reader.getUint32(80, true);
  
  const positions = new Float32Array(faceCount * 9);
  const normals = new Float32Array(faceCount * 9);
  
  let offset = 84;
  for (let face = 0; face < faceCount; face++) {
    // Normal (3 floats)
    const nx = reader.getFloat32(offset, true);
    const ny = reader.getFloat32(offset + 4, true);
    const nz = reader.getFloat32(offset + 8, true);
    offset += 12;
    
    // 3 Vertices (3 * 3 floats)
    for (let i = 0; i < 3; i++) {
      const vx = reader.getFloat32(offset, true);
      const vy = reader.getFloat32(offset + 4, true);
      const vz = reader.getFloat32(offset + 8, true);
      offset += 12;
      
      const idx = face * 9 + i * 3;
      positions[idx] = vx;
      positions[idx + 1] = vy;
      positions[idx + 2] = vz;
      
      normals[idx] = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;
    }
    
    // Attribute byte count (2 bytes)
    offset += 2;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function parseAsciiSTL(text: string): THREE.BufferGeometry {
  const points: number[] = [];
  const normals: number[] = [];
  
  const lines = text.split("\n");
  let normal = [0, 0, 0];
  
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("facet normal")) {
      const parts = line.split(/\s+/);
      normal = [parseFloat(parts[2]) || 0, parseFloat(parts[3]) || 0, parseFloat(parts[4]) || 0];
    } else if (line.startsWith("vertex")) {
      const parts = line.split(/\s+/);
      points.push(parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0, parseFloat(parts[3]) || 0);
      normals.push(normal[0], normal[1], normal[2]);
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(points), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(normals), 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Generate raw STL string from THREE geometry to allow downloading edited or scanned models
export function exportGeometryToSTL(geometry: THREE.BufferGeometry, name: string = "export"): string {
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr) return "";
  
  let stlText = `solid ${name.replace(/\s+/g, "_")}\n`;
  const count = positionAttr.count;
  
  for (let i = 0; i < count; i += 3) {
    stlText += `  facet normal 0 0 0\n`;
    stlText += `    outer loop\n`;
    for (let j = 0; j < 3; j++) {
      const idx = i + j;
      const x = positionAttr.getX(idx);
      const y = positionAttr.getY(idx);
      const z = positionAttr.getZ(idx);
      stlText += `      vertex ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
    }
    stlText += `    endloop\n`;
    stlText += `  endfacet\n`;
  }
  
  stlText += `endsolid ${name.replace(/\s+/g, "_")}\n`;
  return stlText;
}
