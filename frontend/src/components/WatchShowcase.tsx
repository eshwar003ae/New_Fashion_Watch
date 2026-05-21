import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";

function WatchModel() {
  return (
    <group rotation={[0.25, 0.6, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.12, 48]} />
        <meshStandardMaterial color="#8b7355" metalness={0.85} roughness={0.28} />
      </mesh>
      <mesh castShadow position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.48, 0.52, 0.08, 48]} />
        <meshStandardMaterial color="#f5f0eb" metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.04, 16, 48]} />
        <meshStandardMaterial color="#5c4033" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.32, 0.35]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.06, 0.12, 0.02]} />
        <meshStandardMaterial color="#b8860b" metalness={0.75} roughness={0.28} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <spotLight position={[4, 6, 4]} angle={0.35} penumbra={0.4} intensity={1.2} castShadow />
      <WatchModel />
      <ContactShadows position={[0, -0.55, 0]} opacity={0.45} scale={10} blur={2.5} far={4} />
      <Environment preset="city" />
      <OrbitControls enablePan={false} minDistance={2} maxDistance={5} />
    </>
  );
}

export function WatchShowcase() {
  return (
    <div className="canvas-wrap">
      <Canvas shadows camera={{ position: [2.2, 1.4, 2.6], fov: 42 }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
