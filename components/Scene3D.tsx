import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// We are using vanilla Three.js imports for post-processing as we are not using a specific bundler config for 'three/addons'.
// Assuming standard ESM availability via ESBuild/Vite in the runtime.
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { analyzeGesture } from '../services/gestureRecognition';
import { TreeState, GestureType, ParticleData } from '../types';

interface Scene3DProps {
  onStateChange: (state: TreeState) => void;
  onGestureChange: (gesture: GestureType) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: boolean) => void;
}

const Scene3D: React.FC<Scene3DProps> = ({ onStateChange, onGestureChange, onLoadingChange, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const reqIdRef = useRef<number>(0);
  
  // State refs for animation loop access without re-renders
  const stateRef = useRef<TreeState>(TreeState.CLOSED);
  const rotationTargetRef = useRef<number>(0);
  const particlesRef = useRef<ParticleData[]>([]);
  const starRef = useRef<THREE.Mesh | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;

    // --- 1. Three.js Setup ---
    const scene = new THREE.Scene();
    // Matte Greenish Dark Background
    scene.background = new THREE.Color(0x051010); 
    scene.fog = new THREE.FogExp2(0x051010, 0.02);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30; 
    camera.position.y = 8;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    containerRef.current.appendChild(renderer.domElement);

    // --- Post Processing (Bloom) ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );
    // Tint the bloom slightly gold
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.8;
    
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffd700, 2, 50);
    pointLight.position.set(10, 20, 10);
    scene.add(pointLight);
    
    const redLight = new THREE.PointLight(0xb22222, 3, 50);
    redLight.position.set(-10, 5, 10);
    scene.add(redLight);

    // --- 2. Create Particles (Tree & Trunk) ---
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    // Materials
    const goldMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); 
    const redMaterial = new THREE.MeshBasicMaterial({ color: 0xB22222 });
    const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x2E8B57 }); 
    const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x5C4033 }); 

    // --- STAR SETUP ---
    // Octahedron looks like a diamond/star. White color ensures max bloom.
    const starGeometry = new THREE.OctahedronGeometry(1.2, 0); 
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFE0 }); // Light Yellow/White
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    
    // Position at top of tree (approx y=18 based on logic below)
    starMesh.position.set(0, 19, 0);
    particleGroup.add(starMesh);
    starRef.current = starMesh;

    // Standard Particle Geometry
    const particleGeometry = new THREE.SphereGeometry(0.25, 6, 6);

    const particlesData: ParticleData[] = [];
    
    // --- A. LEAVES & ORNAMENTS ---
    const LEAF_COUNT = 3000; 
    const TREE_HEIGHT = 28;
    const TREE_BASE_Y = -10;

    for (let i = 0; i < LEAF_COUNT; i++) {
        const rand = Math.random();
        let mat = greenMaterial;
        let color = new THREE.Color(0x2E8B57);
        
        // Distribution: 10% Gold, 5% Red, 85% Green
        if (rand > 0.9) { 
            mat = goldMaterial; 
            color.setHex(0xFFD700); 
        } else if (rand > 0.85) { 
            mat = redMaterial; 
            color.setHex(0xB22222); 
        }

        const mesh = new THREE.Mesh(particleGeometry, mat);
        const scale = Math.random() * 0.6 + 0.5; 
        mesh.scale.setScalar(scale);

        // -- Tree Position (Spiral Cone) --
        const t = i / LEAF_COUNT;
        const angle = t * Math.PI * 50 + (Math.random() * 0.5); 
        const y = t * TREE_HEIGHT + TREE_BASE_Y; 
        
        const level = (y - TREE_BASE_Y) / TREE_HEIGHT; 
        const maxRadiusAtHeight = (1 - Math.pow(level, 0.8)) * 10; 
        
        const r = maxRadiusAtHeight * (0.8 + Math.random() * 0.2); 
        
        const treeX = r * Math.cos(angle);
        const treeZ = r * Math.sin(angle);
        const treePos = new THREE.Vector3(treeX, y, treeZ);

        // -- Cloud Position (Random Sphere) --
        const rCloud = 20;
        const phi = Math.acos( -1 + ( 2 * i ) / LEAF_COUNT );
        const theta = Math.sqrt( LEAF_COUNT * Math.PI ) * phi;
        const cloudX = rCloud * Math.cos( theta ) * Math.sin( phi );
        const cloudY = rCloud * Math.sin( theta ) * Math.sin( phi );
        const cloudZ = rCloud * Math.cos( phi );
        const cloudPos = new THREE.Vector3(cloudX, cloudY, cloudZ);

        mesh.position.copy(treePos);
        particleGroup.add(mesh);

        particlesData.push({
            id: i,
            mesh: mesh,
            treePosition: treePos,
            cloudPosition: cloudPos,
            color: color,
            initialScale: scale
        });
    }

    // --- B. TRUNK ---
    const TRUNK_COUNT = 400;
    const TRUNK_TOP_Y = TREE_BASE_Y + 1; 
    const TRUNK_BOTTOM_Y = TREE_BASE_Y - 5;

    for (let i = 0; i < TRUNK_COUNT; i++) {
        const mesh = new THREE.Mesh(particleGeometry, trunkMaterial);
        const scale = Math.random() * 0.5 + 0.4;
        mesh.scale.setScalar(scale);

        const y = TRUNK_BOTTOM_Y + Math.random() * (TRUNK_TOP_Y - TRUNK_BOTTOM_Y);
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.8; 

        const treeX = radius * Math.cos(angle);
        const treeZ = radius * Math.sin(angle);
        const treePos = new THREE.Vector3(treeX, y, treeZ);

        // Cloud Position
        const rCloud = 15;
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const cloudX = rCloud * Math.sin(phi) * Math.cos(theta);
        const cloudY = rCloud * Math.sin(phi) * Math.sin(theta);
        const cloudZ = rCloud * Math.cos(phi);
        const cloudPos = new THREE.Vector3(cloudX, cloudY, cloudZ);

        mesh.position.copy(treePos);
        particleGroup.add(mesh);

        particlesData.push({
            id: i + LEAF_COUNT,
            mesh: mesh,
            treePosition: treePos,
            cloudPosition: cloudPos,
            color: new THREE.Color(0x5C4033),
            initialScale: scale
        });
    }

    particlesRef.current = particlesData;

    // --- 3. MediaPipe Setup ---
    let handLandmarker: HandLandmarker | null = null;
    let lastVideoTime = -1;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
      } catch (e) {
         console.warn("Using fallback or waiting for scripts", e);
      }
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
         try {
           const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
           videoRef.current.srcObject = stream;
           videoRef.current.play();
         } catch (err) {
            console.error("Camera Error", err);
            onError(true);
         }
      }
    };

    const createHandLandmarker = async () => {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const { HandLandmarker } = await import('@mediapipe/tasks-vision');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        onLoadingChange(false);
        return landmarker;
    };

    let landmarker: HandLandmarker | null = null;
    createHandLandmarker().then(l => landmarker = l).catch(e => console.error(e));

    let time = 0;

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      time += 0.01;

      // 1. Vision Detection Step
      if (landmarker && videoRef.current && videoRef.current.currentTime !== lastVideoTime) {
        if(videoRef.current.videoWidth > 0) {
            lastVideoTime = videoRef.current.currentTime;
            const startTimeMs = performance.now();
            const results = landmarker.detectForVideo(videoRef.current, startTimeMs);
            
            if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0]; 
                const gesture = analyzeGesture(landmarks);
                
                onGestureChange(gesture.type);

                if (gesture.type === GestureType.FIST) {
                    stateRef.current = TreeState.CLOSED;
                    onStateChange(TreeState.CLOSED);
                } else if (gesture.type === GestureType.OPEN_PALM) {
                    stateRef.current = TreeState.OPEN;
                    onStateChange(TreeState.OPEN);
                } else if (gesture.type === GestureType.PINCH) {
                    stateRef.current = TreeState.ZOOMED;
                    onStateChange(TreeState.ZOOMED);
                } else if (gesture.type === GestureType.ROTATE) {
                    rotationTargetRef.current += gesture.value * 0.05;
                }
            } else {
               onGestureChange(GestureType.NONE);
            }
        }
      }

      // 2. Scene Animation Step
      const currentState = stateRef.current;
      
      if (currentState === TreeState.CLOSED) {
          particleGroup.rotation.y += 0.005; 
      } else {
           particleGroup.rotation.y += (rotationTargetRef.current - particleGroup.rotation.y) * 0.1;
      }

      // --- Star Animation ---
      if (starRef.current) {
          // Pulse
          const pulse = 1 + Math.sin(time * 2.5) * 0.15;
          starRef.current.scale.setScalar(pulse);
          starRef.current.rotation.y -= 0.02;
          starRef.current.rotation.z += 0.01;

          // Position Logic
          const starTarget = new THREE.Vector3();
          if (currentState === TreeState.CLOSED) {
              starTarget.set(0, 19, 0); // Top of tree
          } else if (currentState === TreeState.OPEN) {
              starTarget.set(0, 0, 0); // Center of cloud
          } else if (currentState === TreeState.ZOOMED) {
              starTarget.set(0, 50, 0); // Fly away up
          }
          starRef.current.position.lerp(starTarget, 0.05);
      }

      // Particle Movement Logic
      particlesRef.current.forEach((p, i) => {
        const target = currentState === TreeState.CLOSED ? p.treePosition : p.cloudPosition;
        const noise = Math.sin(time + p.id) * 0.02;
        let finalTarget = target.clone();
        
        if (currentState === TreeState.ZOOMED) {
            finalTarget.multiplyScalar(2.0); 
            finalTarget.applyAxisAngle(new THREE.Vector3(0,1,0), Math.sin(time) * 0.5);
        }

        p.mesh.position.lerp(finalTarget, 0.05);
        
        if (currentState === TreeState.CLOSED) {
             const s = p.initialScale + Math.sin(time * 5 + p.id) * 0.1;
             p.mesh.scale.setScalar(s);
        }
      });

      // Camera Floating
      camera.position.x = Math.sin(time * 0.1) * 3;
      camera.position.y = 5 + Math.cos(time * 0.15) * 2;
      camera.lookAt(0, 2, 0);

      composer.render();
    };

    setupMediaPipe();
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      renderer.dispose();
      particleGeometry.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      goldMaterial.dispose();
      greenMaterial.dispose();
      redMaterial.dispose();
      trunkMaterial.dispose();
    };
  }, [onStateChange, onGestureChange, onLoadingChange, onError]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-matte-green" />;
};

export default Scene3D;