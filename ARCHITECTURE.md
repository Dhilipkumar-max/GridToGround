# How GridToGround Works

GridToGround leverages advanced AI models to bridge the gap between 2D sketches and 3D reality. This document outlines the technical flow of the application.

## 1. Blueprint Upload & Analysis
When a user uploads a floor plan, the image is processed through **Gemini 2.5 Flash**. We use a specialized prompt (see `lib/ai.action.ts`) that instructs the model to:
- Detect outer boundary walls.
- Identify internal segments.
- Locate door gaps and room types.
- Map everything to a normalized grid system.

## 2. 3D Layout Extraction
The AI returns a structured JSON object containing:
- `walls`: Coordinates for outer perimeters.
- `internalWalls`: Coordinates for room dividers.
- `doors`: Positions and rotations for openings.
- `rooms`: Labels and center points.

## 3. Rendering Engine (Three.js)
The frontend takes this JSON and dynamically constructs a 3D scene:
- **Walls**: Extruded geometries based on the coordinates.
- **Lighting**: Ambient and directional lights to create depth.
- **Materials**: Modern textures applied to surfaces for a professional look.

## 4. AI-Enhanced Visualization
In addition to the geometric 3D model, the app uses **Gemini 2.5 Flash Image Preview** to generate a high-fidelity "artistic" render of the space, allowing users to see what the finished room could look like.

## 5. Persistence
All projects, source images, and generated layouts are securely stored in **Puter's Cloud Storage**, linked to the user's account via **Puter Auth**.

---

For more details on the implementation, see:
- [`lib/ai.action.ts`](./lib/ai.action.ts): AI logic and prompts.
- [`app/routes/visualizer.$id.tsx`](./app/routes/visualizer.$id.tsx): Visualizer UI and orchestration.
- [`app/routes/3d-visualizer.$id.tsx`](./app/routes/3d-visualizer.$id.tsx): Three.js implementation.
