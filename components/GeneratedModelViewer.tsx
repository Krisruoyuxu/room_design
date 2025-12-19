
import React, { useMemo, FC, ReactElement, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Room, PlacedFurniture, StyleGuide, WallElement, Wall } from '../types';
import { Plus, Minus } from 'lucide-react';

// Declare global JSX namespace augmentation for React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      boxGeometry: any;
      cylinderGeometry: any;
      planeGeometry: any;
      shapeGeometry: any;
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
        mesh: any;
        group: any;
        boxGeometry: any;
        cylinderGeometry: any;
        planeGeometry: any;
        shapeGeometry: any;
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

const WallElementFrame: FC<{ element: WallElement, room: Room }> = ({ element, room }) => {
    const { width: roomWidth, depth: roomDepth } = room;
    const { width: elWidth, height: elHeight } = element;
    const frameThickness = 0.05;

    const position = useMemo(() => {
        const pos = new THREE.Vector3();
        const halfW = roomWidth / 2;
        const halfD = roomDepth / 2;

        switch (element.wall) {
          case 'front': pos.set(element.x - halfW, element.y, -halfD); break;
          case 'back': pos.set(-(element.x - halfW), element.y, halfD); break;
          case 'left': pos.set(-halfW, element.y, -(element.x - halfD)); break;
          case 'right': pos.set(halfW, element.y, element.x - halfD); break;
        }
        return pos;
    }, [element, roomWidth, roomDepth]);

    const rotation = useMemo<[number, number, number]>(() => {
        switch (element.wall) {
          case 'front': return [0, 0, 0];
          case 'back': return [0, Math.PI, 0];
          case 'left': return [0, Math.PI / 2, 0];
          case 'right': return [0, -Math.PI / 2, 0];
          default: return [0, 0, 0];
        }
    }, [element.wall]);

    const frameColor = "#f0f0f0";
    const doorMaterial = <meshStandardMaterial transparent opacity={0.2} color="#cccccc" roughness={0.1} metalness={0.2} side={THREE.DoubleSide} />;
    const windowMaterial = <meshStandardMaterial transparent opacity={0.1} color="#a1c4d1" roughness={0} metalness={0.5} side={THREE.DoubleSide} />;

    return (
        <group position={position} rotation={rotation}>
            {/* Transparent fill */}
            <mesh>
                <boxGeometry args={[elWidth, elHeight, 0.02]} />
                {element.type === 'door' ? doorMaterial : windowMaterial}
            </mesh>
            {/* Outline */}
            <mesh position={[0, elHeight / 2 - frameThickness / 2, 0]}>
                <boxGeometry args={[elWidth, frameThickness, frameThickness]} />
                <meshStandardMaterial color={frameColor} />
            </mesh>
            <mesh position={[0, -elHeight / 2 + frameThickness / 2, 0]}>
                <boxGeometry args={[elWidth, frameThickness, frameThickness]} />
                <meshStandardMaterial color={frameColor} />
            </mesh>
            <mesh position={[-elWidth / 2 + frameThickness / 2, 0, 0]}>
                <boxGeometry args={[frameThickness, elHeight - 2 * frameThickness, frameThickness]} />
                <meshStandardMaterial color={frameColor} />
            </mesh>
            <mesh position={[elWidth / 2 - frameThickness / 2, 0, 0]}>
                <boxGeometry args={[frameThickness, elHeight - 2 * frameThickness, frameThickness]} />
                <meshStandardMaterial color={frameColor} />
            </mesh>
        </group>
    );
};

const StyledRoomVisuals: FC<{ room: Room; styleGuide: StyleGuide; wallTextureUrl: string; floorTextureUrl: string; elements: WallElement[]; }> = ({ room, styleGuide, wallTextureUrl, floorTextureUrl, elements }) => {
  const { width, depth, height } = room;
  const [wallTex, floorTex] = useTexture([wallTextureUrl, floorTextureUrl]);

  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;

  const createWallShape = (wall: Wall) => {
    const wallWidth = (wall === 'front' || wall === 'back') ? width : depth;
    const wallHeight = height;

    const shape = new THREE.Shape();
    // Create main wall rectangle
    shape.moveTo(-wallWidth / 2, -wallHeight / 2);
    shape.lineTo(wallWidth / 2, -wallHeight / 2);
    shape.lineTo(wallWidth / 2, wallHeight / 2);
    shape.lineTo(-wallWidth / 2, wallHeight / 2);
    shape.closePath();

    // Find elements for this wall and create holes
    const wallElements = elements.filter(el => el.wall === wall);
    wallElements.forEach(el => {
      const hole = new THREE.Path();
      const holeCenterX = el.x - wallWidth / 2;
      const holeCenterY = el.y - wallHeight / 2;

      const startX = holeCenterX - el.width / 2;
      const startY = holeCenterY - el.height / 2;

      hole.moveTo(startX, startY);
      hole.lineTo(startX + el.width, startY);
      hole.lineTo(startX + el.width, startY + el.height);
      hole.lineTo(startX, startY + el.height);
      hole.closePath();

      shape.holes.push(hole);
    });

    return shape;
  };

  const frontWallShape = useMemo(() => createWallShape('front'), [width, height, elements]);
  const backWallShape = useMemo(() => createWallShape('back'), [width, height, elements]);
  const leftWallShape = useMemo(() => createWallShape('left'), [depth, height, elements]);
  const rightWallShape = useMemo(() => createWallShape('right'), [depth, height, elements]);


  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={floorTex} map-repeat={[width / 2, depth / 2]} />
      </mesh>
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={styleGuide.ceilingColor} />
      </mesh>
      {/* Walls */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <shapeGeometry args={[frontWallShape]} />
        <meshStandardMaterial map={wallTex} map-repeat={[width / 2, height / 2]} side={THREE.DoubleSide}/>
      </mesh>
      <mesh position={[0, height / 2, depth / 2]} rotation={[0, Math.PI, 0]}>
        <shapeGeometry args={[backWallShape]} />
        <meshStandardMaterial map={wallTex} map-repeat={[width / 2, height / 2]} side={THREE.DoubleSide}/>
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <shapeGeometry args={[leftWallShape]} />
        <meshStandardMaterial map={wallTex} map-repeat={[depth / 2, height / 2]} side={THREE.DoubleSide}/>
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <shapeGeometry args={[rightWallShape]} />
        <meshStandardMaterial map={wallTex} map-repeat={[depth / 2, height / 2]} side={THREE.DoubleSide}/>
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

const FurniturePieceStyled: FC<{ furniture: PlacedFurniture; color: string }> = ({ furniture, color }) => {
  const material = <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />;
  return (
    <group
      position={[furniture.x, 0, furniture.z]}
      rotation={[0, THREE.MathUtils.degToRad(furniture.rotationY), 0]}
    >
      {renderFurnitureModel(furniture, material)}
    </group>
  );
};

interface GeneratedModelViewerProps {
  room: Room;
  elements: WallElement[];
  placedFurniture: PlacedFurniture[];
  styleGuide: StyleGuide;
  wallTexture: string;
  floorTexture: string;
}

const GeneratedModelViewer: FC<GeneratedModelViewerProps> = ({ room, elements, placedFurniture, styleGuide, wallTexture, floorTexture }) => {
  const [isHovered, setIsHovered] = useState(false);
  const orbitControlsRef = useRef<any>(null!);

  const handleZoom = (direction: 'in' | 'out') => {
    const controls = orbitControlsRef.current;
    if (!controls) return;

    const scale = 1.2;
    if (direction === 'in') {
      controls.dollyIn(scale);
    } else {
      controls.dollyOut(scale);
    }
    controls.update();
  };

  return (
    <div
      className="relative w-full h-full"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <Canvas shadows camera={{ position: [room.width, room.height * 4, room.depth * 2], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.0} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <pointLight position={[-5, room.height - 1, -room.depth/2 + 1]} intensity={0.6} color="#ffeedd" />
        <StyledRoomVisuals room={room} styleGuide={styleGuide} wallTextureUrl={wallTexture} floorTextureUrl={floorTexture} elements={elements}/>
        {elements.map(el => <WallElementFrame key={el.id} element={el} room={room} />)}
        {placedFurniture.map(item => {
          const camelCaseName = item.name.replace(/\s+/g, '');
          const color = styleGuide.furnitureColors[camelCaseName] || '#cccccc';
          return <FurniturePieceStyled key={item.id} furniture={item} color={color} />;
        })}
        <OrbitControls ref={orbitControlsRef} enabled={isHovered} minDistance={1} maxDistance={20} target={[0, room.height/3, 0]} />
      </Canvas>
       <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button 
          onClick={() => handleZoom('in')} 
          className="bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Zoom in"
          title="Zoom In"
        >
          <Plus size={20} />
        </button>
        <button 
          onClick={() => handleZoom('out')} 
          className="bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Zoom out"
          title="Zoom Out"
        >
          <Minus size={20} />
        </button>
      </div>
    </div>
  );
};

export default GeneratedModelViewer;
