'use client';

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Center } from "@react-three/drei";
import { Suspense } from "react";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function CameraLogger() {
  const { camera } = useThree();
  
  useFrame(() => {
    console.log('Camera position:', [camera.position.x, camera.position.y, camera.position.z]);
  });
  
  return null;
}

export default function ModelViewer({ cameraPosition = [-6.661936355581104, 3.5398395943360152, -7.321302282484476] as [number, number, number] }: { cameraPosition?: [number, number, number] }) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ position: cameraPosition, fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <Center>
            <Model url="/models/assembly_line.glb" />
          </Center>
        </Suspense>

        <OrbitControls enableDamping />
        <CameraLogger />
      </Canvas>
    </div>
  );
}