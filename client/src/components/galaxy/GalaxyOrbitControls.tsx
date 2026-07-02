import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  applyParticleSpinDrag,
  setGalaxyPointerField,
  particlePointerSpin,
  particleSpin,
  resetParticleRotationTarget,
} from './lib/galaxyGestureRotation';
import {
  galaxyOrbitRef,
  recenterGalaxyOrbit,
  unlockGalaxyOrbitCenter,
  zoomGalaxyOrbit,
} from './lib/galaxyOrbit';

const CLICK_THRESHOLD = 6;

interface Props {
  preset: import('../../lib/roomVisualPreset').RoomVisualPresetId;
}

/** Mineradio 指针拖拽旋转粒子 + 滚轮缩放 + 双击回正 */
export default function GalaxyOrbitControls({ preset }: Props) {
  const { gl } = useThree();
  const presetRef = useRef(preset);
  const mouseDownAt = useRef({ x: 0, y: 0, hadDrag: false });

  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);

  useEffect(() => {
    const canvas = gl.domElement;
    const orbit = galaxyOrbitRef.current;

    const beginDrag = (e: PointerEvent) => {
      if (e.button === 2) return;
      orbit.rotating = true;
      orbit.last.x = e.clientX;
      orbit.last.y = e.clientY;
      particlePointerSpin.active = true;
      particlePointerSpin.lastX = e.clientX;
      particlePointerSpin.lastY = e.clientY;
      particlePointerSpin.lastT = performance.now();
      particleSpin.vx = 0;
      particleSpin.vy = 0;
      mouseDownAt.current = { x: e.clientX, y: e.clientY, hadDrag: false };
      unlockGalaxyOrbitCenter(orbit);
    };

    const updatePointerField = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const worldX = (nx - 0.5) * 5.0;
      const worldY = (0.5 - ny) * 3.2;
      setGalaxyPointerField(true, worldX, worldY);
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointerField(e);
      if (!orbit.rotating) return;
      const dx = e.clientX - orbit.last.x;
      const dy = e.clientY - orbit.last.y;
      if (particlePointerSpin.active) {
        const nowSpin = performance.now();
        const spinDt = Math.max(
          1 / 120,
          Math.min(0.08, (nowSpin - particlePointerSpin.lastT) / 1000 || 1 / 60),
        );
        applyParticleSpinDrag(dx, dy, spinDt);
        particlePointerSpin.lastX = e.clientX;
        particlePointerSpin.lastY = e.clientY;
        particlePointerSpin.lastT = nowSpin;
      }
      orbit.last.x = e.clientX;
      orbit.last.y = e.clientY;
      const totalDx = e.clientX - mouseDownAt.current.x;
      const totalDy = e.clientY - mouseDownAt.current.y;
      if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > CLICK_THRESHOLD) {
        mouseDownAt.current.hadDrag = true;
      }
      if (orbit.recentering) orbit.recentering = false;
    };

    const endDrag = () => {
      orbit.rotating = false;
      particlePointerSpin.active = false;
    };

    const onPointerLeave = () => {
      endDrag();
      setGalaxyPointerField(false, -999, -999);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      unlockGalaxyOrbitCenter(orbit);
      zoomGalaxyOrbit(orbit, e.deltaY);
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      recenterGalaxyOrbit(orbit);
      resetParticleRotationTarget(true);
    };

    canvas.addEventListener('pointerdown', beginDrag);
    canvas.addEventListener('pointermove', updatePointerField);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDblClick);

    return () => {
      canvas.removeEventListener('pointerdown', beginDrag);
      canvas.removeEventListener('pointermove', updatePointerField);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDblClick);
    };
  }, [gl]);

  return null;
}
