# OpensourceSTL

This is a simple 3D tool. It lets you view 3D shapes, change them, and even turn photos of real objects into 3D models. You can also glue shapes together or use one shape to cut a hole in another.

---

## What the Files Do

### 1. Photo Scanner (`PicScannerSection.tsx`)
This file lets you turn photos of an object into a 3D shape.
* **Upload Photos**: You can upload up to 4 photos of an object from different sides (front, side, back, and top).
* **Pick a Shape**: Choose if your object looks like a box, a cylinder, or a donut (torus).
* **Send to Workspace**: Send your finished shape straight to the main 3D screen.

### 2. Shape Editor (`ShapeEditor.tsx`)
This file is the control panel for changing your shapes.
* **Glue or Cut**: Decide if a shape should add solid mass or act like a cutter to make a hole.
* **Move & Resize**: Use easy sliders to move, turn, or change the size of your shapes.
* **Works with Your Files**: It also works with 3D files (STL files) that you upload yourself.

---

## How to Set It Up

Before you run the code, make sure to install these three helper tools in your project:

```bash
npm install three three-csg-ts lucide-react
