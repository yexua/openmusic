import { useEffect, useRef } from 'react';

import { useFrame, useThree } from '@react-three/fiber';

import * as THREE from 'three';

import type { RoomVisualPresetId } from '../../lib/roomVisualPreset';

import { roomVisualFxLive } from '../../lib/roomVisualFxLive';

import { resumeGalaxyAudioContext } from './lib/galaxyAudio';

import { tickGalaxyCinema } from './lib/galaxyCinema';

import {
  applyGalaxyOrbitCinema,
  setGalaxyOrbitPreset,
  updateGalaxyOrbitCamera,
} from './lib/galaxyOrbit';

import { galaxyOrbitRef } from './lib/galaxyOrbit';

interface Props {
  preset: RoomVisualPresetId;
}

export default function GalaxyCameraRig({ preset }: Props) {
  const { camera } = useThree();
  const cinemaTRef = useRef(0);
  const persp = camera as THREE.PerspectiveCamera;

  useEffect(() => {
    setGalaxyOrbitPreset(galaxyOrbitRef.current, preset);
  }, [preset]);

  useFrame((_state, delta) => {
    const fx = roomVisualFxLive.current;
    const orbit = galaxyOrbitRef.current;
    cinemaTRef.current += delta;

    resumeGalaxyAudioContext();
    const kick = tickGalaxyCinema(delta);
    applyGalaxyOrbitCinema(orbit, cinemaTRef.current, kick, fx.cinemaShake);

    updateGalaxyOrbitCamera(persp, orbit, kick, fx.cinemaShake, fx.cameraDistance);
  });

  return null;
}
