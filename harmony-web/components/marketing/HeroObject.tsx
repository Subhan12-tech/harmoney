"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function HeroObject() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 0, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.x = 0.35;
    group.rotation.y = -0.45;
    scene.add(group);

    const CUBE_SIZE = 0.42;
    const GAP = 0.03;
    const SPACING = CUBE_SIZE + GAP;
    const GRID = 4;
    const OFFSET = (GRID - 1) / 2;

    const boxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.75,
      roughness: 0.28,
      emissive: 0x0a0a0a,
      emissiveIntensity: 0.1,
    });
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.55 });

    for (let ix = 0; ix < GRID; ix++) {
      for (let iy = 0; iy < GRID; iy++) {
        for (let iz = 0; iz < GRID; iz++) {
          const isInteriorCore = [ix, iy, iz].every((v) => v === 1 || v === 2);
          if (isInteriorCore) continue; // hollow center — only render the outer shell

          const cube = new THREE.Mesh(boxGeometry, cubeMaterial);
          cube.position.set((ix - OFFSET) * SPACING, (iy - OFFSET) * SPACING, (iz - OFFSET) * SPACING);

          const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial);
          cube.add(edges);

          group.add(cube);
        }
      }
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.18);
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(4, 5, 5);
    const rim = new THREE.DirectionalLight(0x6ea8ff, 1.4);
    rim.position.set(-5, -2, -3);
    const warm = new THREE.PointLight(0xa070ff, 1.2, 15);
    warm.position.set(-2, 3, 4);
    scene.add(ambient, key, rim, warm);

    const clock = new THREE.Clock();
    let rafId = 0;

    function animate() {
      const dt = clock.getDelta();
      group.rotation.y += dt * 0.6;
      group.rotation.x += dt * 0.18;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(host);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      boxGeometry.dispose();
      edgesGeometry.dispose();
      cubeMaterial.dispose();
      edgeMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={ref} className="h-[520px] w-full" />;
}
