'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ModelViewer3DProps {
  modelPath?: string;
  className?: string;
}

export default function ModelViewer3D({
  modelPath = '/3dmodel/latestvartalaap3dmodel.glb',
  className = '',
}: ModelViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 4.5);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Clear existing canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't flip under ground
    controls.minDistance = 2.0;
    controls.maxDistance = 8.0;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    // 5. Lighting setup
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x88bbff, 1.2);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    // Warm orange rim light matching the retro amber CRT vibe
    const rimLight = new THREE.PointLight(0xff6600, 3, 10);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // Soft ground plane for subtle shadow
    const shadowPlaneGeo = new THREE.PlaneGeometry(10, 10);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.8;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 6. Load GLTF Model
    let modelGroup: THREE.Group | null = null;
    const loader = new GLTFLoader();

    loader.load(
      modelPath,
      (gltf) => {
        modelGroup = gltf.scene;

        // Auto-center and fit model into view
        const box = new THREE.Box3().setFromObject(modelGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const desiredScale = 3.2 / (maxDim || 1);

        modelGroup.scale.set(desiredScale, desiredScale, desiredScale);
        modelGroup.position.x = -center.x * desiredScale;
        modelGroup.position.y = -center.y * desiredScale - 0.2;
        modelGroup.position.z = -center.z * desiredScale;

        // Enable shadows for all sub-meshes
        modelGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(modelGroup);
        setIsLoaded(true);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadingProgress(percent);
        } else {
          setLoadingProgress(50);
        }
      },
      (err) => {
        console.error('Error loading 3D model:', err);
        setError('Failed to load 3D terminal model.');
      }
    );

    // 7. Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle floating animation
      if (modelGroup) {
        modelGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.05 - 0.2;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Responsive resize handling
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW === 0 || newH === 0) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [modelPath]);

  return (
    <div className={`relative w-full h-full min-h-[350px] flex items-center justify-center ${className}`}>
      {/* Canvas container */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Loading Indicator */}
      {!isLoaded && !error && (
        <div className="absolute z-10 flex flex-col items-center justify-center p-4 bg-dark-oxide/90 border border-chassis-sand rounded-sm text-paper-display font-mono text-xs space-y-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-magnetic-oxide animate-ping" />
            <span className="font-bold tracking-wider uppercase">[LOADING 3D TERMINAL...]</span>
          </div>
          <div className="w-48 bg-cassette-housing h-2 rounded-full overflow-hidden border border-paper-display/30">
            <div
              className="bg-magnetic-oxide h-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-oxide-brown">{loadingProgress}% CALIBRATED</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute z-10 p-3 bg-danger/20 border border-danger rounded text-danger font-mono text-xs text-center">
          {error}
        </div>
      )}

      {/* Interaction Hint Overlay */}
      {isLoaded && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10 bg-dark-oxide/70 border border-paper-display/20 px-3 py-1 rounded text-[10px] font-mono text-paper-display/80 tracking-widest uppercase flex items-center gap-1.5 shadow">
          <span>❖ DRAG TO ROTATE 3D MODEL</span>
        </div>
      )}
    </div>
  );
}
