import { GestureType, HandLandmark } from '../types';

/**
 * Calculates Euclidean distance between two 3D points
 */
const distance = (p1: HandLandmark, p2: HandLandmark): number => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
  );
};

export const analyzeGesture = (landmarks: HandLandmark[]): { type: GestureType; value: number } => {
  if (!landmarks || landmarks.length < 21) {
    return { type: GestureType.NONE, value: 0 };
  }

  // Key Landmarks (MediaPipe Hands)
  // 0: Wrist
  // 4: Thumb Tip
  // 8: Index Tip
  // 12: Middle Tip
  // 16: Ring Tip
  // 20: Pinky Tip
  
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  // 1. Detect FIST (Closed)
  // Check if fingertips are close to the palm/wrist center (simplified to wrist for robustness)
  const tips = [indexTip, middleTip, ringTip, pinkyTip];
  let avgDistToWrist = 0;
  tips.forEach(tip => {
    avgDistToWrist += distance(tip, wrist);
  });
  avgDistToWrist /= 4;

  // Thresholds need tuning based on normalized coordinate space (usually 0-1)
  // In screen space 0.15 is roughly a tight fist relative to full hand size
  const isFist = avgDistToWrist < 0.25;

  // 2. Detect OPEN PALM (Scatter)
  // Fingers extended far from wrist
  const isOpen = avgDistToWrist > 0.45;

  // 3. Detect PINCH (Zoom/Grab)
  // Distance between thumb tip and index tip
  const pinchDist = distance(thumbTip, indexTip);
  const isPinch = pinchDist < 0.05;

  if (isFist) {
    return { type: GestureType.FIST, value: avgDistToWrist };
  }
  
  if (isPinch) {
    // Return the x position of the pinch to potentially control which photo to zoom, or just zoom state
    return { type: GestureType.PINCH, value: pinchDist };
  }

  if (isOpen) {
    return { type: GestureType.OPEN_PALM, value: avgDistToWrist };
  }

  // Fallback: Use hand X position for rotation value
  // Normalize x from 0-1 to -1 to 1 range
  const rotationValue = (wrist.x - 0.5) * 2;
  return { type: GestureType.ROTATE, value: rotationValue };
};