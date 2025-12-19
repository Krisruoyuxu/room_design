
import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Loader2, Shuffle, Layout, Eye } from 'lucide-react';
import { 
  Room, WallElement, RoomType, PlacedFurniture, FurniturePiece, 
  StyleGuide, FurnitureItem, DesignState 
} from '../types';
import Controls from './Controls';
import RoomCanvas from './RoomCanvas';
import GeneratedModelViewer from './GeneratedModelViewer';
import FurnitureList from './FurnitureList';
import GeneratedImage from './GeneratedImage';
import { generateStyleGuide, generateTextureImage, generateShoppingList, generatePhotorealisticImage } from '../services/geminiService';
import { useAuth } from '../auth/AuthContext';
import { saveDesignToCloud } from '../services/designStorage';
import { INITIAL_ROOM_DIMENSIONS, VIBES, ROOM_TYPES } from '../constants';

export interface RoomDesignerHandle {
  saveAndGoHomeFromOutside: () => Promise<void>;
  getPreviewImage: () => string | null;
}

interface RoomDesignerProps {
  initialDesign?: DesignState | null;
  initialDesignId?: string; // Loaded from Firestore
  onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
  onNavigateHomeAfterSave?: () => void;
  onLoginRequest: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

const RoomDesigner = forwardRef<RoomDesignerHandle, RoomDesignerProps>(({
  initialDesign,
  initialDesignId,
  onUnsavedChangesChange,
  onNavigateHomeAfterSave,
  onLoginRequest,
  onError,
  onSuccess
}, ref) => {
  const { user, mode } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Centralized State ---
  const [designId, setDesignId] = useState<string | undefined>(initialDesignId);
  const [designName, setDesignName] = useState<string>("");
  
  // Design Atoms
  const [room, setRoom] = useState<Room>(INITIAL_ROOM_DIMENSIONS);
  const [elements, setElements] = useState<WallElement[]>([]);
  const [roomType, setRoomType] = useState<RoomType>(ROOM_TYPES[0]);
  const [placedFurniture, setPlacedFurniture] = useState<PlacedFurniture[]>([]);
  const [vibe, setVibe] = useState<string>(VIBES[0].options[0].name);
  const [budget, setBudget] = useState<number>(2000);
  
  const [furnitureItems, setFurnitureItems] = useState<FurnitureItem[] | null>(null);
  const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
  const [wallTexture, setWallTexture] = useState<string | null>(null);
  const [floorTexture, setFloorTexture] = useState<string | null>(null);
  const [generatedPhotorealisticImage, setGeneratedPhotorealisticImage] = useState<string | null>(null);
  
  const [refImage, setRefImage] = useState<{ file: File; base64: string } | null>(null);
  
  // UI State
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'blueprint' | 'styled'>('blueprint');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Dirty tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Helper to mark changes
  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    onUnsavedChangesChange?.(true);
  }, [onUnsavedChangesChange]);

  // --- Initialization ---
  useEffect(() => {
    if (initialDesign) {
      setRoom(initialDesign.room);
      setElements(initialDesign.elements);
      setRoomType(initialDesign.roomType);
      setPlacedFurniture(initialDesign.placedFurniture);
      setVibe(initialDesign.vibe);
      setBudget(initialDesign.budget);
      setFurnitureItems(initialDesign.furnitureItems);
      setStyleGuide(initialDesign.styleGuide);
      setWallTexture(initialDesign.wallTexture);
      setFloorTexture(initialDesign.floorTexture);
      setGeneratedPhotorealisticImage(initialDesign.generatedPhotorealisticImage);
      setDesignName(initialDesign.designName || "");
      // After load, clean slate for unsaved changes
      setHasUnsavedChanges(false);
      onUnsavedChangesChange?.(false);
    } else {
        // Resetting to defaults handled by initial state, but ensure tracking is reset
        setHasUnsavedChanges(false);
        onUnsavedChangesChange?.(false);
    }
    setDesignId(initialDesignId);
  }, [initialDesign, initialDesignId, onUnsavedChangesChange]);

  // --- State Wrappers for Dirty Tracking ---
  const updateRoom = (val: React.SetStateAction<Room>) => { setRoom(val); markDirty(); };
  const updateElements = (val: React.SetStateAction<WallElement[]>) => { setElements(val); markDirty(); };
  const updateRoomType = (val: React.SetStateAction<RoomType>) => { setRoomType(val); markDirty(); };
  const updatePlacedFurniture = (val: React.SetStateAction<PlacedFurniture[]>) => { setPlacedFurniture(val); markDirty(); };
  const updateVibe = (val: React.SetStateAction<string>) => { setVibe(val); markDirty(); };
  const updateBudget = (val: React.SetStateAction<number>) => { setBudget(val); markDirty(); };
  const updateRefImage = (val: React.SetStateAction<{ file: File; base64: string } | null>) => { setRefImage(val); markDirty(); };

  // --- Save Logic ---
  const handleSaveDesign = async (opts?: { goHomeAfterSave?: boolean }) => {
    if (mode !== 'cloud' || !user) {
      // Should be caught by navigation guard logic, but strictly enforce here
      throw new Error('Cannot save design while in guest mode.');
    }

    let previewImage = "";
    if (canvasRef.current) {
      previewImage = canvasRef.current.toDataURL('image/webp', 0.8);
    }

    const currentDesignState: DesignState = {
      room, elements, roomType, placedFurniture, vibe, budget,
      furnitureItems, styleGuide, wallTexture, floorTexture,
      generatedPhotorealisticImage, designName
    };

    try {
      const result = await saveDesignToCloud(currentDesignState, {
        userId: user.uid,
        existingDesignId: designId,
        explicitName: designName,
        roomType,
        previewImage
      });

      setDesignId(result.designId);
      if (result.name !== designName) {
        setDesignName(result.name);
      }

      setHasUnsavedChanges(false);
      onUnsavedChangesChange?.(false);
      onSuccess("Design saved successfully!");

      if (opts?.goHomeAfterSave && onNavigateHomeAfterSave) {
        onNavigateHomeAfterSave();
      }
    } catch (error) {
      console.error('Failed to save design', error);
      onError('Error: Failed to save design. Please try again.');
      throw error;
    }
  };

  useImperativeHandle(ref, () => ({
    saveAndGoHomeFromOutside: async () => {
      await handleSaveDesign({ goHomeAfterSave: true });
    },
    getPreviewImage: () => canvasRef.current?.toDataURL() || null
  }));

  // --- Handlers ---
  const handleClearDesign = () => {
    if (confirm('Are you sure you want to clear the current design? All unsaved progress will be lost.')) {
      setRoom(INITIAL_ROOM_DIMENSIONS);
      setElements([]);
      setPlacedFurniture([]);
      setFurnitureItems(null);
      setStyleGuide(null);
      setWallTexture(null);
      setFloorTexture(null);
      setGeneratedPhotorealisticImage(null);
      setDesignName("");
      setRefImage(null);
      setDesignId(undefined);
      
      setSelectedFurnitureId(null);
      setSelectedElementId(null);
      setViewMode('blueprint');
      
      setHasUnsavedChanges(false);
      onUnsavedChangesChange?.(false);
    }
  };

  const addElement = (type: 'door' | 'window') => {
    const width = type === 'window' ? 1.2 : 0.9;
    const height = type === 'window' ? 1 : 2.1;
    const newElement: WallElement = {
      id: `${type}-${Date.now()}`,
      type,
      wall: 'front',
      x: 1.5, 
      y: type === 'window' ? 1.7 : height / 2,
      width,
      height,
    };
    updateElements(prev => [...prev, newElement]);
  };

  const updateElementWrapper = (updatedElement: WallElement) => {
    // Logic for clamping etc
    const wallWidth = (updatedElement.wall === 'front' || updatedElement.wall === 'back') ? room.width : room.depth;
    const wallHeight = room.height;
    const clampedWidth = Math.max(0.2, Math.min(updatedElement.width, wallWidth));
    const clampedHeight = Math.max(0.2, Math.min(updatedElement.height, wallHeight));
    const halfElWidth = clampedWidth / 2;
    const halfElHeight = clampedHeight / 2;
    const clampedX = Math.max(halfElWidth, Math.min(updatedElement.x, wallWidth - halfElWidth));
    const clampedY = Math.max(halfElHeight, Math.min(updatedElement.y, wallHeight - halfElHeight));
    const finalElement = { ...updatedElement, width: clampedWidth, height: clampedHeight, x: clampedX, y: clampedY };
    
    setElements(prev => {
        const next = prev.map(el => el.id === finalElement.id ? finalElement : el);
        return next;
    });
    markDirty();
  };
  
  const deleteElement = (id: string) => {
    updateElements(prev => prev.filter(el => el.id !== id));
    if(selectedElementId === id) setSelectedElementId(null);
  };

  const addFurniture = (piece: FurniturePiece) => {
    const newFurniture: PlacedFurniture = {
      ...piece,
      id: `${piece.name}-${Date.now()}`,
      x: 0,
      z: 0,
      rotationY: 0,
    };
    updatePlacedFurniture(prev => [...prev, newFurniture]);
    setSelectedFurnitureId(newFurniture.id);
    setSelectedElementId(null);
  };

  const updateFurnitureWrapper = (updatedPiece: PlacedFurniture) => {
    setPlacedFurniture(prev => {
        const next = prev.map(p => p.id === updatedPiece.id ? updatedPiece : p);
        return next;
    });
    markDirty();
  };
  
  const deleteFurniture = (id: string) => {
    updatePlacedFurniture(prev => prev.filter(p => p.id !== id));
    if (selectedFurnitureId === id) setSelectedFurnitureId(null);
  };

  const handleGenerate = async (isShuffle: boolean = false) => {
    setIsLoading(true);
    if (!isShuffle) {
      setFurnitureItems(null);
      setStyleGuide(null);
      setWallTexture(null);
      setFloorTexture(null);
      setGeneratedPhotorealisticImage(null);
    }

    try {
      const furnitureNames: string[] = Array.from(new Set(placedFurniture.map(f => f.name))) as string[];
      setLoadingMessage('1/3: Generating style guide...');
      const guide = await generateStyleGuide(vibe, roomType, budget, furnitureNames);
      
      setLoadingMessage('2/3: Generating visuals & list...');
      const [wallTex, floorTex, items, photo] = await Promise.all([
        generateTextureImage(guide.wallTexturePrompt),
        generateTextureImage(guide.floorTexturePrompt),
        generateShoppingList(placedFurniture, vibe, roomType, budget),
        generatePhotorealisticImage({ room, elements, roomType, placedFurniture, vibe }),
      ]);
      
      setLoadingMessage('3/3: Finalizing...');
      setStyleGuide(guide);
      setWallTexture(wallTex);
      setFloorTexture(floorTex);
      setFurnitureItems(items);
      setGeneratedPhotorealisticImage(photo);
      setViewMode('styled');
      markDirty(); // Generation updates design state
    } catch (e) {
      console.error(e);
      onError(e instanceof Error ? e.message : 'Generation failed.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const onManualSave = () => {
    if (mode === 'guest') {
      onLoginRequest();
    } else {
      handleSaveDesign();
    }
  };

  return (
    <main className="flex-grow flex flex-col p-4">
      <div className="flex flex-col lg:flex-row gap-4 flex-grow">
        <div className="w-full lg:w-[320px] shrink-0">
          <Controls
            room={room}
            setRoom={updateRoom}
            elements={elements}
            addElement={addElement}
            deleteElement={deleteElement}
            vibe={vibe}
            setVibe={updateVibe}
            budget={budget}
            setBudget={updateBudget}
            refImage={refImage}
            setRefImage={updateRefImage}
            onGenerate={() => handleGenerate(false)}
            onSaveDesign={onManualSave}
            onClearDesign={handleClearDesign}
            isLoading={isLoading}
            roomType={roomType}
            setRoomType={updateRoomType}
            placedFurniture={placedFurniture}
            deleteFurniture={deleteFurniture}
            addFurniture={addFurniture}
            updateFurniture={updateFurnitureWrapper}
            selectedFurnitureId={selectedFurnitureId}
            selectedElementId={selectedElementId}
            setSelectedElementId={(id) => { setSelectedElementId(id); if(id) setSelectedFurnitureId(null); }}
            updateElement={updateElementWrapper}
          />
        </div>

        <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
          <div className="lg:col-span-2 flex flex-col min-h-[400px] lg:min-h-0 rounded-lg bg-gray-800/50 border border-gray-700 p-4">
            <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-4">
                 <h3 className="font-bold text-lg text-cyan-400">
                   {viewMode === 'blueprint' ? 'Blueprint' : 'Styled 3D View'}
                 </h3>
                 {viewMode === 'styled' && styleGuide && (
                   <button onClick={() => handleGenerate(true)} disabled={isLoading} className="flex items-center gap-1.5 text-xs bg-gray-700/50 hover:bg-gray-700 px-2 py-1 rounded-md text-gray-300 transition-colors">
                       <Shuffle size={14} /> Shuffle
                   </button>
                 )}
               </div>
               <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-lg">
                 <button onClick={() => setViewMode('blueprint')} className={`p-2 rounded-md ${viewMode === 'blueprint' ? 'bg-cyan-500/80 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                     <Layout size={16} />
                 </button>
                 <button onClick={() => setViewMode('styled')} disabled={!styleGuide} className={`p-2 rounded-md ${viewMode === 'styled' ? 'bg-cyan-500/80 text-white' : 'text-gray-400 hover:bg-gray-700'} disabled:opacity-50`}>
                     <Eye size={16} />
                 </button>
               </div>
            </div>
            <div className="flex-grow relative bg-gray-900/50 rounded-md overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                    <Loader2 className="animate-spin text-purple-400" size={48} />
                    <p className="text-gray-300">{loadingMessage || 'Generating...'}</p>
                </div>
              )}
              <div className="absolute inset-0" style={{ visibility: viewMode === 'blueprint' ? 'visible' : 'hidden', pointerEvents: viewMode === 'blueprint' ? 'auto' : 'none' }}>
                <RoomCanvas 
                  ref={canvasRef}
                  room={room} 
                  elements={elements} 
                  updateElement={updateElementWrapper}
                  placedFurniture={placedFurniture}
                  updateFurniture={updateFurnitureWrapper}
                  selectedFurnitureId={selectedFurnitureId}
                  setSelectedFurnitureId={(id) => { setSelectedFurnitureId(id); if(id) setSelectedElementId(null); }}
                  selectedElementId={selectedElementId}
                  setSelectedElementId={(id) => { setSelectedElementId(id); if(id) setSelectedFurnitureId(null); }}
                />
              </div>
              <div className="absolute inset-0" style={{ visibility: viewMode === 'styled' ? 'visible' : 'hidden', pointerEvents: viewMode === 'styled' ? 'auto' : 'none' }}>
                {styleGuide && wallTexture && floorTexture ? (
                    <GeneratedModelViewer room={room} elements={elements} placedFurniture={placedFurniture} styleGuide={styleGuide} wallTexture={wallTexture} floorTexture={floorTexture} />
                ) : (
                    !isLoading && <div className="w-full h-full flex flex-col items-center justify-center text-gray-500"><Eye size={64} className="mx-auto" /><p className="mt-2">Styled model will appear here</p></div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-4 min-w-0">
              <div className="flex-1 min-h-0">
                  <GeneratedImage image={generatedPhotorealisticImage} isLoading={isLoading && !generatedPhotorealisticImage} title="Render" />
              </div>
              <div className="flex-1 min-h-0">
                  <FurnitureList items={furnitureItems} isLoading={isLoading && !furnitureItems} budget={budget} />
              </div>
          </div>
        </div>
      </div>
    </main>
  );
});

RoomDesigner.displayName = 'RoomDesigner';

export default RoomDesigner;
