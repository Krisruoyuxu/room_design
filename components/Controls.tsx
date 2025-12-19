
import React from 'react';
import { Room, WallElement, RoomType, PlacedFurniture, FurniturePiece, Wall } from '../types';
import { VIBES, ROOM_TYPES, FURNITURE_CATALOG } from '../constants';
import { Plus, Trash2, Upload, Wand2, Bookmark } from 'lucide-react';

interface ControlsProps {
  room: Room;
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
  elements: WallElement[];
  addElement: (type: 'door' | 'window') => void;
  deleteElement: (id: string) => void;
  vibe: string;
  setVibe: (vibe: string) => void;
  budget: number;
  setBudget: (budget: number) => void;
  refImage: { file: File; base64: string } | null;
  setRefImage: (image: { file: File; base64: string } | null) => void;
  onGenerate: () => void;
  onSaveDesign: () => void;
  onClearDesign: () => void;
  isLoading: boolean;
  roomType: RoomType;
  setRoomType: (type: RoomType) => void;
  placedFurniture: PlacedFurniture[];
  deleteFurniture: (id: string) => void;
  addFurniture: (piece: FurniturePiece) => void;
  updateFurniture: (piece: PlacedFurniture) => void;
  selectedFurnitureId: string | null;
  // New props for element selection and sizing
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  updateElement: (element: WallElement) => void;
}

const SliderControl: React.FC<{ label: string; value: number; onChange: (val: number) => void; min: number; max: number; step: number; unit: string }> = ({ label, value, onChange, min, max, step, unit }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400">{label}</label>
    <div className="flex items-center gap-2 mt-1">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        disabled={false}
      />
      <span className="text-xs font-mono bg-gray-700/50 px-2 py-1 rounded w-16 text-center truncate">{value.toFixed(1)}{unit}</span>
    </div>
  </div>
);


const Controls: React.FC<ControlsProps> = ({
  room, setRoom, elements, addElement, deleteElement, vibe, setVibe, budget, setBudget, refImage, setRefImage, onGenerate, onSaveDesign, onClearDesign, isLoading, roomType, setRoomType, placedFurniture, deleteFurniture, addFurniture, updateFurniture, selectedFurnitureId, selectedElementId, setSelectedElementId, updateElement
}) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRefImage({ file, base64: (event.target?.result as string).split(',')[1] });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const uniqueId = React.useId();
  const selectedFurniture = placedFurniture.find(f => f.id === selectedFurnitureId);
  const selectedElement = elements.find(el => el.id === selectedElementId);

  const calculateBounds = (furniture: PlacedFurniture | undefined, currentRoom: Room) => {
    if (!furniture) {
      return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    }
    const WALL_OFFSET = 0.01; // 1cm offset to prevent z-fighting with walls

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

  const furnitureBounds = React.useMemo(() => calculateBounds(selectedFurniture, room), [selectedFurniture, room]);
  
  const getWallDimensions = (wall: Wall) => {
      const wallWidth = (wall === 'front' || wall === 'back') ? room.width : room.depth;
      const wallHeight = room.height;
      return { wallWidth, wallHeight };
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-6 h-full overflow-y-auto">
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-cyan-400">1. Room Type</h3>
        <select value={roomType} onChange={e => setRoomType(e.target.value as RoomType)} className="input-field w-full">
          {ROOM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg text-cyan-400">2. Room Dimensions</h3>
        <SliderControl label="Width" value={room.width} onChange={v => setRoom(r => ({ ...r, width: v }))} min={2} max={10} step={0.1} unit="m" />
        <SliderControl label="Depth" value={room.depth} onChange={v => setRoom(r => ({ ...r, depth: v }))} min={2} max={10} step={0.1} unit="m" />
        <SliderControl label="Height" value={room.height} onChange={v => setRoom(r => ({ ...r, height: v }))} min={2} max={5} step={0.1} unit="m" />
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-lg text-cyan-400">3. Architecture</h3>
         <p className="text-xs text-gray-400">Click elements in list or 3D view to select.</p>
        <div className="flex gap-2">
          <button onClick={() => addElement('door')} className="btn-secondary flex-1">
            <Plus size={16} /> Door
          </button>
          <button onClick={() => addElement('window')} className="btn-secondary flex-1">
            <Plus size={16} /> Window
          </button>
        </div>
        
        {selectedElement && (
            <div className="bg-cyan-900/20 p-3 rounded-lg border border-cyan-800/50">
                <h4 className="font-bold text-cyan-400 text-sm mb-3 capitalize truncate">{selectedElement.type} on {selectedElement.wall}</h4>
                <div className="space-y-2">
                    <SliderControl
                        label="Width"
                        value={selectedElement.width}
                        min={0.5}
                        max={getWallDimensions(selectedElement.wall).wallWidth}
                        step={0.05}
                        unit="m"
                        onChange={(val) => updateElement({ ...selectedElement, width: val })}
                    />
                    <SliderControl
                        label="Height"
                        value={selectedElement.height}
                        min={0.5}
                        max={getWallDimensions(selectedElement.wall).wallHeight}
                        step={0.05}
                        unit="m"
                        onChange={(val) => updateElement({ ...selectedElement, height: val })}
                    />
                </div>
            </div>
        )}

        <div className="space-y-2 max-h-24 overflow-y-auto pr-2">
          {elements.map(el => (
            <div 
              key={el.id} 
              className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${el.id === selectedElementId ? 'bg-cyan-900/30 border border-cyan-800/50' : 'bg-gray-700/50 hover:bg-gray-700'}`}
              onClick={() => setSelectedElementId(el.id)}
            >
              <span className="capitalize text-sm">{el.type} on {el.wall}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="text-red-400 hover:text-red-300">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-lg text-cyan-400">4. Furniture</h3>
        <p className="text-xs text-gray-400">Click furniture to select, then drag or use sliders to move.</p>
        
        {selectedFurniture && (
            <div className="bg-cyan-900/20 p-3 rounded-lg border border-cyan-800/50">
                <h4 className="font-bold text-cyan-400 text-sm mb-3 truncate">{selectedFurniture.name}</h4>
                
                <div className="space-y-2">
                   <SliderControl
                      label="Position Left/Right"
                      value={selectedFurniture.x + room.width / 2}
                      min={furnitureBounds.minX + room.width / 2}
                      max={furnitureBounds.maxX + room.width / 2}
                      step={0.05}
                      unit="m"
                      onChange={(val) => updateFurniture({ ...selectedFurniture, x: val - room.width / 2 })}
                   />
                   <SliderControl
                      label="Position Front/Back"
                      value={room.depth / 2 - selectedFurniture.z}
                      min={room.depth / 2 - furnitureBounds.maxZ}
                      max={room.depth / 2 - furnitureBounds.minZ}
                      step={0.05}
                      unit="m"
                      onChange={(val) => updateFurniture({ ...selectedFurniture, z: room.depth / 2 - val })}
                   />
                   <SliderControl
                      label="Rotation"
                      value={selectedFurniture.rotationY}
                      min={0}
                      max={360}
                      step={15}
                      unit="°"
                      onChange={(val) => {
                        if (!selectedFurniture) return;
                        const newRotationFurniture = { ...selectedFurniture, rotationY: val };
                        const newBounds = calculateBounds(newRotationFurniture, room);
                        
                        const clampedX = Math.max(newBounds.minX, Math.min(selectedFurniture.x, newBounds.maxX));
                        const clampedZ = Math.max(newBounds.minZ, Math.min(selectedFurniture.z, newBounds.maxZ));

                        updateFurniture({ ...newRotationFurniture, x: clampedX, z: clampedZ });
                      }}
                   />
                </div>
            </div>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2">
            {FURNITURE_CATALOG[roomType].map(item => (
                <div
                    key={item.name}
                    onClick={() => addFurniture(item)}
                    className="bg-gray-700/50 p-2 rounded text-center text-sm cursor-pointer hover:bg-gray-700 transition-colors"
                    title={`${item.width}m x ${item.depth}m`}
                >
                    {item.name}
                </div>
            ))}
        </div>
         <div className="space-y-2 max-h-24 overflow-y-auto pr-2">
          {placedFurniture.map(item => (
            <div key={item.id} className={`flex justify-between items-center p-2 rounded ${item.id === selectedFurnitureId ? 'bg-cyan-900/30 border border-cyan-800/50' : 'bg-gray-700/50'}`}>
              <span className="capitalize text-sm truncate">{item.name}</span>
              <button onClick={() => deleteFurniture(item.id)} className="text-red-400 hover:text-red-300 shrink-0 ml-2">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-lg text-cyan-400">5. Style & Budget</h3>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Vibe / Aesthetic</label>
          <select value={vibe} onChange={e => setVibe(e.target.value)} className="input-field w-full">
            {VIBES.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`upload-${uniqueId}`} className="btn-secondary w-full cursor-pointer">
            <Upload size={16} /> {refImage ? "Change Image" : "Upload Reference"}
          </label>
          <input id={`upload-${uniqueId}`} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          {refImage && <p className="text-xs text-center mt-1 text-gray-400 truncate">{refImage.file.name}</p>}
        </div>
         <div>
          <label className="block text-sm font-medium text-gray-400">Budget</label>
           <div className="flex items-center gap-2 mt-1">
             <span className="text-lg font-mono text-gray-400">$</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value, 10))}
                className="input-field w-full"
                step="100"
              />
           </div>
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <button onClick={onGenerate} disabled={isLoading} className="btn-primary w-full">
          {isLoading ? 'Generating...' : <><Wand2 size={18} /> Generate Design</>}
        </button>
        <button onClick={onSaveDesign} disabled={isLoading} className="btn-secondary w-full">
          <Bookmark size={18} /> Save Design
        </button>
        <button onClick={onClearDesign} disabled={isLoading} className="btn-danger w-full">
          <Trash2 size={18} /> Clear Current Design
        </button>
      </div>

      <style>{`
        .btn-primary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background-image: linear-gradient(to right, #22d3ee, #a855f7); color: white; font-weight: bold; border-radius: 0.5rem; transition: all 0.2s; border: none; }
        .btn-primary:hover:not(:disabled) { box-shadow: 0 0 15px rgba(168, 85, 247, 0.5); transform: translateY(-2px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background-color: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid #4b5563; font-weight: 500; border-radius: 0.5rem; transition: background-color 0.2s, border-color 0.2s; }
        .btn-secondary:hover:not(:disabled) { background-color: rgba(255,255,255,0.1); }
        .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-danger { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background-color: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid #b91c1c; font-weight: 500; border-radius: 0.5rem; transition: all 0.2s; }
        .btn-danger:hover:not(:disabled) { background-color: rgba(239, 68, 68, 0.3); border-color: #ef4444; color: #f87171; }
        .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
        .input-field { background-color: #1f2937; border: 1px solid #4b5563; border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: white; }
        .input-field:focus { outline: 2px solid #22d3ee; border-color: transparent; }
        select.input-field {
          -webkit-appearance: none; -moz-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; background: #22d3ee; cursor: pointer; border-radius: 99px; margin-top: -5px; }
        input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; background: #22d3ee; cursor: pointer; border-radius: 99px; }
      `}</style>
    </div>
  );
};

export default Controls;
