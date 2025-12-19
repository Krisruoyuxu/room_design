
import React, { forwardRef, useMemo, useRef, useState, FC, Dispatch, SetStateAction, RefObject, ReactElement } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { Room, WallElement, Wall, PlacedFurniture } from '../types';

// Declare global JSX namespace augmentation for React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
      mesh: any;
      group: any;
      boxGeometry: any;
      cylinderGeometry: any;
      planeGeometry: any;
      torusGeometry: any;
      meshStandardMaterial: any;
      shadowMaterial: any;
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        [elemName: string]: any;
        mesh: any;
        group: any;
        boxGeometry: any;
        cylinderGeometry: any;
        planeGeometry: any;
        torusGeometry: any;
        meshStandardMaterial: any;
        shadowMaterial: any;
        ambientLight: any;
        directionalLight: any;
        pointLight: any;
      }
    }
  }
}

const calculateBounds = (furniture: PlacedFurniture, currentRoom: Room) => {
    const WALL_OFFSET = 0.01;

    const angleRad = (furniture.rotationY * Math.PI) / 180;
    const cosAngle = Math.abs(Math.cos(angleRad));
    const sinAngle = Math.abs(Math.sin(angleRad));
    
    const effectiveWidth = furniture.width * cosAngle + furniture.depth * sinAngle;
    const effectiveDepth = furniture.width * sinAngle + furniture.depth * cosAngle;

    const halfRoomWidth = currentRoom.width / 2;
    const halfRoomDepth = currentRoom.depth / 2;
    
    const halfEffectiveWidth = effectiveWidth / 2;
    const halfEffectiveDepth = effectiveDepth / 2;

    const minX = -halfRoomWidth + halfEffectiveWidth + WALL_OFFSET;
    const maxX = halfRoomWidth - halfEffectiveWidth - WALL_OFFSET;
    const minZ = -halfRoomDepth + halfEffectiveDepth + WALL_OFFSET;
    const maxZ = halfRoomDepth - halfEffectiveDepth - WALL_OFFSET;

    return {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
    };
};

interface WallData {
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number];
  wall: Wall;
}

interface DraggableElementProps {
  element: WallElement;
  room: Room;
  updateElement: (el: WallElement) => void;
  wallPlanes: RefObject<THREE.Mesh[]>;
  wallData: WallData[];
  setSnapLines: Dispatch<SetStateAction<{ start: THREE.Vector3; end: THREE.Vector3 }[]>>;
  onDragStart: () => void;
  onDragEnd: () => void;
  isSelected: boolean;
  onClick: () => void;
}

const DraggableElement: FC<DraggableElementProps> = ({ element, room, updateElement, wallPlanes, wallData, setSnapLines, onDragStart, onDragEnd, isSelected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [isDragging, setIsDragging] = useState(false);
  
  const { width, depth } = room;

  const rotation = useMemo<[number, number, number]>(() => {
    switch (element.wall) {
      case 'front':
        return [0, 0, 0];
      case 'back':
        return [0, Math.PI, 0];
      case 'left':
        return [0, Math.PI / 2, 0];
      case 'right':
        return [0, -Math.PI / 2, 0];
      default:
        return [0, 0, 0];
    }
  }, [element.wall]);

  const position = useMemo(() => {
    const pos = new THREE.Vector3();
    const halfW = width / 2;
    const halfD = depth / 2;

    switch (element.wall) {
      case 'front': pos.set(element.x - halfW, element.y, -halfD + 0.01); break;
      case 'back': pos.set(-(element.x - halfW), element.y, halfD - 0.01); break;
      case 'left': pos.set(-halfW + 0.01, element.y, -(element.x - halfD)); break;
      case 'right': pos.set(halfW - 0.01, element.y, element.x - halfD); break;
    }
    return pos;
  }, [element, width, depth]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';
    onDragStart();
  };
  
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if(isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setSnapLines([]);
      document.body.style.cursor = 'grab';
      onDragEnd();
    }
  };
  
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();

    const intersections = [];
    wallPlanes.current?.forEach((wallPlaneMesh, index) => {
      if (!wallPlaneMesh) return;

      const intersectionPoint = new THREE.Vector3();
      const plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 0, 1).applyQuaternion(wallPlaneMesh.quaternion),
        wallPlaneMesh.position
      );

      if (e.ray.intersectPlane(plane, intersectionPoint)) {
        const localPoint = wallPlaneMesh.worldToLocal(intersectionPoint.clone());
        const wallDimensions = wallData[index].args;
        if (Math.abs(localPoint.x) <= wallDimensions[0] / 2 && Math.abs(localPoint.y) <= wallDimensions[1] / 2) {
          intersections.push({
            wall: wallData[index].wall,
            point: intersectionPoint,
            distance: e.ray.origin.distanceTo(intersectionPoint),
            wallPlaneMesh: wallPlaneMesh,
          });
        }
      }
    });

    if (intersections.length === 0) {
       setSnapLines([]);
       return;
    }

    const closestIntersection = intersections.reduce((prev, curr) => (prev.distance < curr.distance ? prev : curr));
    const { wall, point, wallPlaneMesh } = closestIntersection;
    
    const localPoint = wallPlaneMesh.worldToLocal(point.clone());
    const wallWidth = (wall === 'front' || wall === 'back') ? room.width : room.depth;
    const wallHeight = room.height;

    let newX = localPoint.x + wallWidth / 2;
    let newY = localPoint.y + wallHeight / 2;
    
    const currentSnapLines: {start: THREE.Vector3, end: THREE.Vector3}[] = [];
    const snapThreshold = 0.1;

    if (Math.abs(newX - wallWidth / 2) < snapThreshold) {
      newX = wallWidth / 2;
      const lineStart = new THREE.Vector3(0, -wallHeight / 2, 0.02);
      const lineEnd = new THREE.Vector3(0, wallHeight / 2, 0.02);
      currentSnapLines.push({
        start: wallPlaneMesh.localToWorld(lineStart.clone()),
        end: wallPlaneMesh.localToWorld(lineEnd.clone())
      });
    }

    if (Math.abs(newY - wallHeight / 2) < snapThreshold) {
      newY = wallHeight / 2;
      const lineStart = new THREE.Vector3(-wallWidth / 2, 0, 0.02);
      const lineEnd = new THREE.Vector3(wallWidth / 2, 0, 0.02);
      currentSnapLines.push({
        start: wallPlaneMesh.localToWorld(lineStart.clone()),
        end: wallPlaneMesh.localToWorld(lineEnd.clone())
      });
    }
    setSnapLines(currentSnapLines);
    
    const halfElWidth = element.width / 2;
    const halfElHeight = element.height / 2;
    
    newX = THREE.MathUtils.clamp(newX, halfElWidth, wallWidth - halfElWidth);
    newY = THREE.MathUtils.clamp(newY, halfElHeight, wallHeight - halfElHeight);

    updateElement({ ...element, wall, x: newX, y: newY });
  };
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerEnter={() => !isDragging && (document.body.style.cursor = 'grab')}
      onPointerLeave={() => !isDragging && (document.body.style.cursor = 'auto')}
    >
      <boxGeometry args={[element.width, element.height, 0.05]} />
      <meshStandardMaterial
        color={element.type === 'door' ? '#a56a42' : '#87ceeb'}
        side={THREE.DoubleSide}
        emissive={isDragging || isSelected ? (element.type === 'door' ? '#3d2719' : '#325866') : '#000000'}
        emissiveIntensity={0.8}
      />
    </mesh>
  );
};

interface RotationHandleProps {
  furniture: PlacedFurniture;
  onRotate: (rotationY: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const RotationHandle: FC<RotationHandleProps> = ({ furniture, onRotate, onDragStart, onDragEnd }) => {
  const [isRotating, setIsRotating] = useState(false);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsRotating(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';
    onDragStart();
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (isRotating) {
      setIsRotating(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      document.body.style.cursor = 'auto';
      onDragEnd();
    }
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isRotating) return;
    e.stopPropagation();

    const intersectionPoint = new THREE.Vector3();
    if (e.ray.intersectPlane(floorPlane, intersectionPoint)) {
      // 0° rotation faces +Z. 90° rotation faces -X.
      const angleRad = Math.atan2(
        -(intersectionPoint.x - furniture.x),
        intersectionPoint.z - furniture.z
      );

      let angleDeg = THREE.MathUtils.radToDeg(angleRad);
      if (angleDeg < 0) {
        angleDeg += 360;
      }

      onRotate(angleDeg);
    }
  };

  const handleRadius = Math.max(furniture.width, furniture.depth) * 0.5 + 0.3;

  return (
    <group position={[furniture.x, 0, furniture.z]}>
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            onPointerEnter={() => !isRotating && (document.body.style.cursor = 'alias')}
            onPointerLeave={() => !isRotating && (document.body.style.cursor = 'auto')}
        >
            <torusGeometry args={[handleRadius, 0.05, 16, 64]} />
            <meshStandardMaterial
                color="#22d3ee"
                emissive="#22d3ee"
                emissiveIntensity={0.6}
                side={THREE.DoubleSide}
            />
        </mesh>
    </group>
  );
};

const renderFurnitureModel = (furniture: PlacedFurniture, material: ReactElement) => {
    const { name, width, depth, height } = furniture;
    
    const legSize = 0.05;
    const frameThickness = 0.02;

    switch (name) {
      // LIVING ROOM
      case 'Sofa':
      case 'Loveseat':
      case 'Armchair': {
        const baseHeight = height * 0.4;
        const armHeight = height * 0.25;
        const backHeight = height * 0.45;
        const cushionHeight = 0.15;
        const armWidth = Math.min(width * 0.1, 0.2);
        
        return (<group>
            {/* Base Frame */}
            <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, baseHeight, depth]} />{material}</mesh>
            {/* Back Frame */}
            <mesh position={[0, baseHeight + backHeight/2, -depth / 2 + 0.1]} castShadow receiveShadow><boxGeometry args={[width, backHeight, 0.2]} />{material}</mesh>
            {/* Arm Frames */}
            <mesh position={[-width / 2 + armWidth / 2, baseHeight + armHeight/2, 0]} castShadow receiveShadow><boxGeometry args={[armWidth, armHeight, depth * 0.9]} />{material}</mesh>
            <mesh position={[width / 2 - armWidth / 2, baseHeight + armHeight/2, 0]} castShadow receiveShadow><boxGeometry args={[armWidth, armHeight, depth * 0.9]} />{material}</mesh>
            {/* Seat Cushions */}
            <mesh position={[0, baseHeight + cushionHeight / 2, depth*0.05]} castShadow receiveShadow><boxGeometry args={[width - armWidth * 2, cushionHeight, depth * 0.8]} />{material}</mesh>
            {/* Back Cushions */}
            <mesh position={[0, baseHeight + cushionHeight + backHeight/2, -depth / 2 + 0.2 + cushionHeight/2]} castShadow receiveShadow><boxGeometry args={[width - armWidth * 2, backHeight - cushionHeight, cushionHeight]} />{material}</mesh>
        </group>);
      }
      case 'Coffee Table': {
        const tableTopHeight = 0.08;
        const legHeight = height - tableTopHeight;
        const legRadius = 0.04;
        const legX = width / 2 - legRadius * 2;
        const legZ = depth / 2 - legRadius * 2;
        return (<group>
          <mesh position={[0, legHeight + tableTopHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, tableTopHeight, depth]} />{material}</mesh>
          <mesh position={[legX, legHeight / 2, legZ]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
          <mesh position={[-legX, legHeight / 2, legZ]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
          <mesh position={[legX, legHeight / 2, -legZ]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
          <mesh position={[-legX, legHeight / 2, -legZ]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
        </group>);
      }
      case 'End Table': {
         const tableTopHeight = 0.05;
         const legHeight = height - tableTopHeight;
         const legRadius = 0.03;
         return (<group>
            <mesh position={[0, legHeight + tableTopHeight / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[width/2, width/2, tableTopHeight, 32]} />{material}</mesh>
            <mesh position={[0, legHeight / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
         </group>);
      }
      case 'Console Table':
      case 'TV Stand': {
        const topHeight = 0.05;
        const bodyHeight = height - topHeight;
        const legHeight = 0.1;
        const cabinetHeight = bodyHeight - legHeight;
        const legOffset = 0.05;
        return (<group>
          <mesh position={[0, cabinetHeight + legHeight + topHeight/2, 0]} castShadow receiveShadow><boxGeometry args={[width, topHeight, depth]} />{material}</mesh>
          <mesh position={[0, legHeight + cabinetHeight/2, 0]} castShadow receiveShadow><boxGeometry args={[width * 0.98, cabinetHeight, depth * 0.95]} />{material}</mesh>
          <mesh position={[width/2-legOffset, legHeight/2, depth/2-legOffset]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[-width/2+legOffset, legHeight/2, depth/2-legOffset]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[width/2-legOffset, legHeight/2, -depth/2+legOffset]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[-width/2+legOffset, legHeight/2, -depth/2+legOffset]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
        </group>);
      }
      case 'Bench': {
        const seatHeight = 0.1;
        const legHeight = height - seatHeight;
        const legX = width / 2 - 0.1;
        return (<group>
            <mesh position={[0, legHeight + seatHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, seatHeight, depth]} />{material}</mesh>
            <mesh position={[legX, legHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.08, legHeight, depth * 0.9]} />{material}</mesh>
            <mesh position={[-legX, legHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.08, legHeight, depth * 0.9]} />{material}</mesh>
        </group>);
      }
      case 'Ottoman':
        return <mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, height, depth]} />{material}</mesh>;

      case 'Floor Lamp': {
        const baseRadius = Math.min(width, depth) / 2;
        const baseHeight = 0.05;
        const poleRadius = 0.02;
        const poleHeight = height - baseHeight - 0.3;
        const shadeHeight = 0.25;
        const shadeRadius = baseRadius * 0.9;
        return (<group>
          <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[baseRadius, baseRadius, baseHeight, 32]} />{material}</mesh>
          <mesh position={[0, baseHeight + poleHeight / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[poleRadius, poleRadius, poleHeight, 16]} />{material}</mesh>
          <mesh position={[0, height - shadeHeight / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[shadeRadius * 0.8, shadeRadius, shadeHeight, 32]} />{material}</mesh>
        </group>);
      }
      
      // BEDROOM
      case 'King Bed':
      case 'Queen Bed': {
        const frameHeight = 0.25;
        const mattressHeight = height * 0.4;
        const headboardHeight = height;
        const headboardDepth = 0.1;
        return (<group>
          <mesh position={[0, frameHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, frameHeight, depth]} />{material}</mesh>
          <mesh position={[0, frameHeight + mattressHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[width * 0.98, mattressHeight, depth * 0.98]} />{material}</mesh>
          <mesh position={[0, headboardHeight / 2, -depth / 2 + headboardDepth / 2]} castShadow receiveShadow><boxGeometry args={[width, headboardHeight, headboardDepth]} />{material}</mesh>
        </group>);
      }
      case 'Nightstand':
      case 'Dresser': {
        const legHeight = 0.1;
        const bodyHeight = height - legHeight;
        const handleSize = 0.02;
        return (<group>
            <mesh position={[0, legHeight + bodyHeight/2, 0]} castShadow receiveShadow><boxGeometry args={[width, bodyHeight, depth]} />{material}</mesh>
            <mesh position={[width/2 - legSize, legHeight/2, depth/2 - legSize]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
            <mesh position={[-width/2 + legSize, legHeight/2, depth/2 - legSize]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
            <mesh position={[width/2 - legSize, legHeight/2, -depth/2 + legSize]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
            <mesh position={[-width/2 + legSize, legHeight/2, -depth/2 + legSize]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
            <mesh position={[0, height * 0.6, depth/2 + 0.001]}><boxGeometry args={[width*0.9, 0.01, 0.01]} /><meshStandardMaterial color="#000" emissive="#000" /></mesh>
            <mesh position={[0, height * 0.7, depth/2 + handleSize/2]}><boxGeometry args={[width * 0.2, handleSize, handleSize]} />{material}</mesh>
        </group>);
      }
      case 'Filing Cabinet':
         return <mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, height, depth]} />{material}</mesh>;

      case 'Wardrobe':
      case 'Pantry Cabinet': {
        const doorDepth = 0.02;
        const handleSize = 0.02;
        return (<group>
            <mesh position={[0, height/2, 0]} castShadow receiveShadow><boxGeometry args={[width, height, depth]} />{material}</mesh>
            <mesh position={[-width/4, height/2, depth/2 - doorDepth/2]} castShadow receiveShadow><boxGeometry args={[width/2 - 0.01, height, doorDepth]} />{material}</mesh>
            <mesh position={[width/4, height/2, depth/2 - doorDepth/2]} castShadow receiveShadow><boxGeometry args={[width/2 - 0.01, height, doorDepth]} />{material}</mesh>
            <mesh position={[-width/4 + 0.05, height/2, depth/2 + handleSize]}><boxGeometry args={[handleSize, height * 0.3, handleSize]} />{material}</mesh>
            <mesh position={[width/4 - 0.05, height/2, depth/2 + handleSize]}><boxGeometry args={[handleSize, height * 0.3, handleSize]} />{material}</mesh>
        </group>);
      }

      case 'Vanity Table': {
        const tableTopHeight = 0.08;
        const legHeight = 0.75 - tableTopHeight;
        const mirrorHeight = height - 0.75;
        const legX = width / 2 - legSize;
        const legZ = depth / 2 - legSize;
        return (<group>
          <mesh position={[0, legHeight + tableTopHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, tableTopHeight, depth]} />{material}</mesh>
          <mesh position={[legX, legHeight / 2, legZ]} castShadow receiveShadow><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[-legX, legHeight / 2, legZ]} castShadow receiveShadow><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[legX, legHeight / 2, -legZ]} castShadow receiveShadow><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[-legX, legHeight / 2, -legZ]} castShadow receiveShadow><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          {mirrorHeight > 0 && 
            <mesh position={[0, 0.75 + mirrorHeight/2, -depth/2 + 0.02]} castShadow receiveShadow>
                <boxGeometry args={[width * 0.7, mirrorHeight, 0.02]} />
                <meshStandardMaterial color="#a1c4d1" roughness={0} metalness={0.5} transparent opacity={0.5}/>
            </mesh>
          }
        </group>);
      }

      case 'Full Length Mirror': {
        const frame = 0.04;
        return (<group>
            <mesh position={[0, height/2, -depth/2 + 0.01]} castShadow receiveShadow>
                <boxGeometry args={[width - frame, height - frame, 0.01]} />
                <meshStandardMaterial color="#a1c4d1" roughness={0} metalness={0.5} transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, height/2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                {material}
            </mesh>
        </group>);
      }

      // KITCHEN / DINING
      case 'Kitchen Island':
      case 'Sideboard': {
        const counterOverhang = 0.03;
        const counterHeight = 0.05;
        const bodyHeight = height - counterHeight;
        return (<group>
            <mesh position={[0, bodyHeight, 0]} castShadow receiveShadow><boxGeometry args={[width, bodyHeight, depth]} />{material}</mesh>
            <mesh position={[0, height - counterHeight/2, 0]} castShadow receiveShadow><boxGeometry args={[width + counterOverhang, counterHeight, depth + counterOverhang]} />{material}</mesh>
        </group>);
      }
      case 'Bar Cabinet': {
        const legHeight = 0.15;
        const bodyHeight = height - legHeight;
        return (<group>
            <mesh position={[0, legHeight + bodyHeight/2, 0]} castShadow receiveShadow><boxGeometry args={[width, bodyHeight, depth]} />{material}</mesh>
            <mesh position={[width/2 - legSize, legHeight/2, depth/2 - legSize]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
            <mesh position={[-width/2 + legSize, legHeight/2, depth/2 - legSize]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
            <mesh position={[width/2 - legSize, legHeight/2, -depth/2 + legSize]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
            <mesh position={[-width/2 + legSize, legHeight/2, -depth/2 + legSize]}><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
        </group>);
      }
      
      case 'Dining Table':
      case 'Small Table':
      case 'Desk':
      case 'Large Desk': {
        const tableTopHeight = 0.1;
        const legHeight = height - tableTopHeight;
        const legX = width / 2 - legSize;
        const legZ = depth / 2 - legSize;
        return (<group>
          <mesh position={[0, legHeight + tableTopHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, tableTopHeight, depth]} />{material}</mesh>
          <mesh position={[legX, legHeight / 2, legZ]} castShadow receiveShadow><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[-legX, legHeight / 2, legZ]} castShadow receiveShadow><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[legX, legHeight / 2, -legZ]} castShadow receiveShadow><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
          <mesh position={[-legX, legHeight / 2, -legZ]} castShadow receiveShadow><boxGeometry args={[legSize, legHeight, legSize]} />{material}</mesh>
        </group>);
      }
      case 'Round Table': {
        const tableTopHeight = 0.08;
        const legHeight = height - tableTopHeight;
        const pedestalRadius = Math.min(width, depth) * 0.2;
        return (<group>
            <mesh position={[0, legHeight + tableTopHeight/2, 0]} castShadow receiveShadow><cylinderGeometry args={[width/2, width/2, tableTopHeight, 64]} />{material}</mesh>
            <mesh position={[0, legHeight/2, 0]} castShadow receiveShadow><cylinderGeometry args={[pedestalRadius, pedestalRadius, legHeight, 32]} />{material}</mesh>
        </group>);
      }
      
      case 'Stool': {
         const seatHeight = 0.06;
         const legHeight = height - seatHeight;
         const legRadius = 0.03;
         const legSpread = width / 4;
         return (<group>
            <mesh position={[0, legHeight + seatHeight / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[width/2, width/2, seatHeight, 32]} />{material}</mesh>
            <mesh position={[legSpread, legHeight / 2, legSpread]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
            <mesh position={[-legSpread, legHeight / 2, legSpread]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
            <mesh position={[legSpread, legHeight / 2, -legSpread]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
            <mesh position={[-legSpread, legHeight / 2, -legSpread]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]} />{material}</mesh>
         </group>);
      }
      case 'Dining Chair':
      case 'Visitor Chair': {
        const seatHeight = height * 0.5;
        const backHeight = height * 0.5;
        const seatThickness = 0.05;
        const legHeight = seatHeight - seatThickness;
        const legRadius = 0.03;
        const legX = width / 2 - legRadius;
        const legZ = depth / 2 - legRadius;
        return (<group>
            <mesh position={[0, seatHeight - seatThickness/2, 0]} castShadow receiveShadow><boxGeometry args={[width, seatThickness, depth]} />{material}</mesh>
            <mesh position={[0, seatHeight + backHeight/2, -depth/2 + 0.02]} castShadow receiveShadow><boxGeometry args={[width, backHeight, 0.04]} />{material}</mesh>
            <mesh position={[legX, legHeight/2, legZ]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]}/>{material}</mesh>
            <mesh position={[-legX, legHeight/2, legZ]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]}/>{material}</mesh>
            <mesh position={[legX, legHeight/2, -legZ]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]}/>{material}</mesh>
            <mesh position={[-legX, legHeight/2, -legZ]} castShadow receiveShadow><cylinderGeometry args={[legRadius, legRadius, legHeight, 16]}/>{material}</mesh>
        </group>);
      }
      case 'Office Chair': {
        const seatHeight = height * 0.5;
        const backHeight = height * 0.6;
        const poleHeight = seatHeight - 0.1;
        const poleRadius = 0.04;
        const feetLength = width / 2;
        return (<group>
            <mesh position={[0, seatHeight, 0]} castShadow receiveShadow><boxGeometry args={[width, 0.1, depth]} />{material}</mesh>
            <mesh position={[0, seatHeight + backHeight/2, -depth/2 + 0.05]} castShadow receiveShadow><boxGeometry args={[width, backHeight, 0.1]} />{material}</mesh>
            <mesh position={[0, poleHeight / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[poleRadius, poleRadius, poleHeight, 16]} />{material}</mesh>
            <mesh position={[0, 0.025, 0]}>
                <group>
                    <mesh rotation={[0,0,0]}><boxGeometry args={[feetLength, 0.05, 0.05]} />{material}</mesh>
                    <mesh rotation={[0, Math.PI / 2.5, 0]}><boxGeometry args={[feetLength, 0.05, 0.05]} />{material}</mesh>
                    <mesh rotation={[0, Math.PI / -2.5, 0]}><boxGeometry args={[feetLength, 0.05, 0.05]} />{material}</mesh>
                    <mesh rotation={[0, Math.PI / 1.25, 0]}><boxGeometry args={[feetLength, 0.05, 0.05]} />{material}</mesh>
                    <mesh rotation={[0, Math.PI / -1.25, 0]}><boxGeometry args={[feetLength, 0.05, 0.05]} />{material}</mesh>
                </group>
            </mesh>
        </group>);
      }
      
      case 'Fridge':
        return <mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, height, depth]} />{material}</mesh>;
        
      case 'Bar Cart': {
        const wheelRadius = 0.05;
        const legHeight = height - wheelRadius;
        const shelfHeight = 0.02;
        const legX = width/2 - frameThickness;
        const legZ = depth/2 - frameThickness;
        return (<group>
            <mesh position={[legX, legHeight/2 + wheelRadius, legZ]}><boxGeometry args={[frameThickness, legHeight, frameThickness]} />{material}</mesh>
            <mesh position={[-legX, legHeight/2 + wheelRadius, legZ]}><boxGeometry args={[frameThickness, legHeight, frameThickness]} />{material}</mesh>
            <mesh position={[legX, legHeight/2 + wheelRadius, -legZ]}><boxGeometry args={[frameThickness, legHeight, frameThickness]} />{material}</mesh>
            <mesh position={[-legX, legHeight/2 + wheelRadius, -legZ]}><boxGeometry args={[frameThickness, legHeight, frameThickness]} />{material}</mesh>
            <mesh position={[0, legHeight + wheelRadius - shelfHeight, 0]}><boxGeometry args={[width, shelfHeight, depth]} />{material}</mesh>
            <mesh position={[0, wheelRadius + legHeight*0.2, 0]}><boxGeometry args={[width, shelfHeight, depth]} />{material}</mesh>
            <mesh position={[legX, wheelRadius, legZ]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[wheelRadius, wheelRadius, 0.03, 16]} /><meshStandardMaterial color="#222" /></mesh>
            <mesh position={[-legX, wheelRadius, legZ]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[wheelRadius, wheelRadius, 0.03, 16]} /><meshStandardMaterial color="#222" /></mesh>
            <mesh position={[legX, wheelRadius, -legZ]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[wheelRadius, wheelRadius, 0.03, 16]} /><meshStandardMaterial color="#222" /></mesh>
            <mesh position={[-legX, wheelRadius, -legZ]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[wheelRadius, wheelRadius, 0.03, 16]} /><meshStandardMaterial color="#222" /></mesh>
        </group>);
      }
      case 'Baker\'s Rack': {
        const shelfHeight = 0.02;
        const numShelves = 4;
        const shelfSpacing = (height - shelfHeight) / (numShelves - 1 || 1);
        const legX = width / 2 - frameThickness / 2;
        const legZ = depth / 2 - frameThickness / 2;
        return (<group>
          <mesh position={[legX, height / 2, legZ]}><boxGeometry args={[frameThickness, height, frameThickness]} />{material}</mesh>
          <mesh position={[-legX, height / 2, legZ]}><boxGeometry args={[frameThickness, height, frameThickness]} />{material}</mesh>
          <mesh position={[legX, height / 2, -legZ]}><boxGeometry args={[frameThickness, height, frameThickness]} />{material}</mesh>
          <mesh position={[-legX, height / 2, -legZ]}><boxGeometry args={[frameThickness, height, frameThickness]} />{material}</mesh>
          {Array.from({ length: numShelves }).map((_, i) => (
            <mesh key={i} position={[0, i * shelfSpacing + shelfHeight/2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width - frameThickness*2, shelfHeight, depth - frameThickness*2]} />
                {material}
            </mesh>
          ))}
        </group>);
      }
      
      // OFFICE
      case 'Bookshelf':
      case 'Short Bookshelf':
      case 'Tall Bookshelf':
      case 'Display Cabinet': {
        const backThickness = 0.02;
        const frame = 0.05;
        const innerWidth = width - frame * 2;
        const numShelves = Math.max(1, Math.floor(height / 0.4));
        const shelfSpacing = (height-frame*2) / numShelves;
        return (<group>
          <mesh position={[0, height / 2, -depth/2 + backThickness/2]} castShadow receiveShadow><boxGeometry args={[width, height, backThickness]}/>{material}</mesh>
          <mesh position={[-width/2 + frame/2, height/2, 0]} castShadow receiveShadow><boxGeometry args={[frame, height, depth]}/>{material}</mesh>
          <mesh position={[width/2 - frame/2, height/2, 0]} castShadow receiveShadow><boxGeometry args={[frame, height, depth]}/>{material}</mesh>
          <mesh position={[0, frame/2, 0]} castShadow receiveShadow><boxGeometry args={[innerWidth, frame, depth-backThickness]}/>{material}</mesh>
          <mesh position={[0, height - frame/2, 0]} castShadow receiveShadow><boxGeometry args={[innerWidth, frame, depth-backThickness]}/>{material}</mesh>
          {Array.from({ length: numShelves - 1 }).map((_, i) => (
            <mesh key={i} position={[0, (i + 1) * shelfSpacing + frame/2, 0]} castShadow receiveShadow>
                <boxGeometry args={[innerWidth, frame, depth-backThickness]} />
                {material}
            </mesh>
          ))}
        </group>);
      }

      case 'Printer Stand':
        return <mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, height, depth]} />{material}</mesh>;

      // DINING ROOM
      case 'Plant Stand': {
        const topRadius = Math.min(width, depth) / 2;
        const baseRadius = topRadius * 1.2;
        const baseHeight = 0.05;
        const poleRadius = 0.025;
        const poleHeight = height - baseHeight - 0.02;
        return (<group>
            <mesh position={[0, height - 0.01, 0]} castShadow receiveShadow><cylinderGeometry args={[topRadius, topRadius, 0.02, 32]} />{material}</mesh>
            <mesh position={[0, baseHeight + poleHeight/2, 0]} castShadow receiveShadow><cylinderGeometry args={[poleRadius, poleRadius, poleHeight, 16]} />{material}</mesh>
            <mesh position={[0, baseHeight/2, 0]} castShadow receiveShadow><cylinderGeometry args={[baseRadius, baseRadius, baseHeight, 32]} />{material}</mesh>
        </group>);
      }

      default:
        return (<mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[width, height, depth]} />{material}</mesh>);
    }
};

interface DraggableFurnitureProps {
  item: PlacedFurniture;
  isSelected: boolean;
  onSelect: () => void;
  updateFurniture: (item: PlacedFurniture) => void;
  room: Room;
  setDragging: (dragging: boolean) => void;
}

const DraggableFurniture: FC<DraggableFurnitureProps> = ({ item, isSelected, onSelect, updateFurniture, room, setDragging }) => {
   const [isDraggingLocal, setIsDraggingLocal] = useState(false);
   const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
   
   const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
     e.stopPropagation();
     onSelect();
     setIsDraggingLocal(true);
     setDragging(true);
     (e.target as HTMLElement).setPointerCapture(e.pointerId);
     document.body.style.cursor = 'grabbing';
   };

   const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
     e.stopPropagation();
     if(isDraggingLocal){
        setIsDraggingLocal(false);
        setDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        document.body.style.cursor = 'grab';
     }
   };

   const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
     if(!isDraggingLocal) return;
     e.stopPropagation();
     const intersectionPoint = new THREE.Vector3();
     if (e.ray.intersectPlane(floorPlane, intersectionPoint)) {
        const bounds = calculateBounds(item, room);
        
        let newX = intersectionPoint.x;
        let newZ = intersectionPoint.z;

        // Clamp to room bounds
        newX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
        newZ = Math.max(bounds.minZ, Math.min(newZ, bounds.maxZ));

        updateFurniture({ ...item, x: newX, z: newZ });
     }
   }

   const material = <meshStandardMaterial 
        color={isSelected ? "#22d3ee" : "#cccccc"} 
        emissive={isSelected ? "#22d3ee" : "#000000"}
        emissiveIntensity={isSelected ? 0.2 : 0}
        roughness={0.7} 
        metalness={0.2} 
   />;

   return (
     <group>
         <group
            position={[item.x, 0, item.z]}
            rotation={[0, THREE.MathUtils.degToRad(item.rotationY), 0]}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            onPointerEnter={() => !isDraggingLocal && (document.body.style.cursor = 'grab')}
            onPointerLeave={() => !isDraggingLocal && (document.body.style.cursor = 'auto')}
         >
            {renderFurnitureModel(item, material)}
         </group>
         {isSelected && (
            <RotationHandle 
                furniture={item} 
                onRotate={(rot) => updateFurniture({...item, rotationY: rot})} 
                onDragStart={() => setDragging(true)}
                onDragEnd={() => setDragging(false)}
            />
         )}
     </group>
   );
}

export interface RoomCanvasProps {
    room: Room;
    elements: WallElement[];
    updateElement: (element: WallElement) => void;
    placedFurniture: PlacedFurniture[];
    updateFurniture: (furniture: PlacedFurniture) => void;
    selectedFurnitureId: string | null;
    setSelectedFurnitureId: (id: string | null) => void;
    selectedElementId: string | null;
    setSelectedElementId: (id: string | null) => void;
}

const RoomCanvas = forwardRef<HTMLCanvasElement, RoomCanvasProps>(({
    room, elements, updateElement, placedFurniture, updateFurniture,
    selectedFurnitureId, setSelectedFurnitureId, selectedElementId, setSelectedElementId
}, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const [snapLines, setSnapLines] = useState<{ start: THREE.Vector3; end: THREE.Vector3 }[]>([]);
    const wallPlanes = useRef<THREE.Mesh[]>([]);

    const wallData: WallData[] = useMemo(() => [
        { position: [0, room.height / 2, -room.depth / 2], rotation: [0, 0, 0], args: [room.width, room.height], wall: 'front' },
        { position: [0, room.height / 2, room.depth / 2], rotation: [0, Math.PI, 0], args: [room.width, room.height], wall: 'back' },
        { position: [-room.width / 2, room.height / 2, 0], rotation: [0, Math.PI / 2, 0], args: [room.depth, room.height], wall: 'left' },
        { position: [room.width / 2, room.height / 2, 0], rotation: [0, -Math.PI / 2, 0], args: [room.depth, room.height], wall: 'right' },
    ], [room]);

    return (
        <Canvas shadows camera={{ position: [0, room.height * 3, room.depth * 1.5], fov: 60 }} ref={ref as any}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            
            <Grid position={[0, 0.01, 0]} args={[room.width, room.depth]} cellSize={0.5} cellThickness={0.5} cellColor="#6b7280" sectionSize={1} sectionThickness={1} sectionColor="#9ca3af" fadeDistance={50} infiniteGrid />

            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); setSelectedFurnitureId(null); setSelectedElementId(null); }}>
                <planeGeometry args={[room.width, room.depth]} />
                <meshStandardMaterial color="#374151" side={THREE.DoubleSide} />
            </mesh>

            {/* Walls */}
            {wallData.map((data, index) => (
                <mesh
                    key={data.wall}
                    ref={(el) => (wallPlanes.current[index] = el!)}
                    position={new THREE.Vector3(...data.position)}
                    rotation={new THREE.Euler(...data.rotation)}
                    receiveShadow
                >
                    <planeGeometry args={[...data.args]} />
                    <meshStandardMaterial color="#4b5563" side={THREE.DoubleSide} transparent opacity={0.5} />
                    <Edges color="#9ca3af" />
                </mesh>
            ))}

            {/* Wall Elements */}
            {elements.map(el => (
                <DraggableElement
                    key={el.id}
                    element={el}
                    room={room}
                    updateElement={updateElement}
                    wallPlanes={wallPlanes}
                    wallData={wallData}
                    setSnapLines={setSnapLines}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                    isSelected={selectedElementId === el.id}
                    onClick={() => { setSelectedElementId(el.id); setSelectedFurnitureId(null); }}
                />
            ))}

            {/* Furniture */}
            {placedFurniture.map(item => (
                <DraggableFurniture
                    key={item.id}
                    item={item}
                    room={room}
                    updateFurniture={updateFurniture}
                    isSelected={selectedFurnitureId === item.id}
                    onSelect={() => { setSelectedFurnitureId(item.id); setSelectedElementId(null); }}
                    setDragging={setIsDragging}
                />
            ))}
            
            {/* Snap Lines */}
             {snapLines.map((line, i) => (
                <Line key={i} points={[line.start, line.end]} color="#ff0000" lineWidth={2} />
            ))}

            <OrbitControls enabled={!isDragging} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} />
        </Canvas>
    );
});

export default RoomCanvas;
