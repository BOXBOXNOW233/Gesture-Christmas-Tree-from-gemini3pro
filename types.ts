import * as THREE from 'three';

export enum TreeState {
  CLOSED = 'CLOSED',   // Formed Tree
  OPEN = 'OPEN',       // Scattered Cloud
  ZOOMED = 'ZOOMED'    // Focused on a photo
}

export enum GestureType {
  NONE = 'NONE',
  FIST = 'FIST',       // Trigger Closed
  OPEN_PALM = 'OPEN_PALM', // Trigger Open
  PINCH = 'PINCH',     // Trigger Zoom/Select
  ROTATE = 'ROTATE'    // Pan logic
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface ParticleData {
  id: number;
  mesh: THREE.Object3D;
  treePosition: THREE.Vector3;
  cloudPosition: THREE.Vector3;
  color: THREE.Color;
  initialScale: number;
}