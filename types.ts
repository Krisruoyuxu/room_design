

export type ElementType = 'door' | 'window';
export type Wall = 'front' | 'back' | 'left' | 'right';

export interface WallElement {
  id: string;
  type: ElementType;
  wall: Wall;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Room {
  width: number;
  depth: number;
  height: number;
}

export interface Vibe {
  name: string;
  description: string;
}

export interface VibeGroup {
  label: string;
  options: Vibe[];
}

export interface FurnitureItem {
  name:string;
  description: string;
  price: number;
  searchQuery: string;
}

export type RoomType = 'Living Room' | 'Bedroom' | 'Kitchen' | 'Office' | 'Dining Room';

export interface FurniturePiece {
  name: string;
  width: number;
  depth: number;
  height: number;
}

export interface PlacedFurniture {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  x: number; // position on floor, center of room is 0,0
  z: number; // position on floor
  rotationY: number; // in degrees
}

export interface StyleGuide {
  wallTexturePrompt: string;
  floorTexturePrompt: string;
  ceilingColor: string;
  furnitureColors: Record<string, string>;
}

export interface User {
  name: string;
  username: string;
}

export interface DesignState {
  room: Room;
  elements: WallElement[];
  roomType: RoomType;
  placedFurniture: PlacedFurniture[];
  vibe: string;
  budget: number;
  // Extended fields for full save/load fidelity
  furnitureItems: FurnitureItem[] | null;
  styleGuide: StyleGuide | null;
  wallTexture: string | null;
  floorTexture: string | null;
  generatedPhotorealisticImage: string | null;
  designName: string;
}