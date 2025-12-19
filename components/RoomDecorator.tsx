
import React, { useState, useCallback, useId, useEffect } from 'react';
import { Upload, Wand2, Image as ImageIcon, X } from 'lucide-react';
import { VIBES, ROOM_TYPES, PARTY_THEMES, DECORATION_ELEMENTS } from '../constants';
import { RoomType, FurnitureItem } from '../types';
import { decorateRoomFromImage, getFurnitureFromImage } from '../services/geminiService';
import GeneratedImage from './GeneratedImage';
import FurnitureList from './FurnitureList';

interface ImageFile {
  file: File;
  base64: string;
  base64Data: string;
}

const ImageUploader: React.FC<{ onUpload: (file: ImageFile) => void, title: string, description: string }> = ({ onUpload, title, description }) => {
  const uniqueId = useId();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onUpload({ file, base64, base64Data: base64.split(',')[1] });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <label htmlFor={`upload-${uniqueId}`} className="flex flex-col items-center justify-center w-full h-full border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
        <Upload className="w-8 h-8 mb-3 text-gray-400" />
        <p className="mb-2 text-sm text-gray-300 font-semibold">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <input id={`upload-${uniqueId}`} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </label>
  );
};


export default function RoomDecorator() {
    const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
    const [inspirationImage, setInspirationImage] = useState<ImageFile | null>(null);

    const [decorationPurpose, setDecorationPurpose] = useState<'Permanent' | 'Party'>('Permanent');
    const [vibe, setVibe] = useState<string>(VIBES[0].options[0].name);
    const [roomType, setRoomType] = useState<RoomType>(ROOM_TYPES[0]);
    const [budget, setBudget] = useState<number>(2500);
    const [selectedDecorations, setSelectedDecorations] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [furniture, setFurniture] = useState<FurnitureItem[] | null>(null);
    
    useEffect(() => {
        if (decorationPurpose === 'Party') {
            setVibe(PARTY_THEMES[0].options[0].name);
        } else {
            setVibe(VIBES[0].options[0].name);
        }
    }, [decorationPurpose]);

    const handleDecorationChange = (element: string) => {
        setSelectedDecorations(prev =>
            prev.includes(element) ? prev.filter(item => item !== element) : [...prev, element]
        );
    };

    const handleDecorate = useCallback(async () => {
        if (!originalImage) return;

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        setFurniture(null);

        try {
            const imageResult = await decorateRoomFromImage(
                originalImage.base64Data,
                originalImage.file.type,
                vibe,
                budget,
                roomType,
                decorationPurpose,
                selectedDecorations,
                inspirationImage?.base64Data,
                inspirationImage?.file.type,
            );
            setGeneratedImage(imageResult);
            
            if (imageResult) {
                const base64Data = imageResult.split(',')[1];
                if (base64Data) {
                    const furnitureResult = await getFurnitureFromImage(base64Data, vibe, budget);
                    setFurniture(furnitureResult);
                } else {
                    throw new Error("Could not extract image data from generation result.");
                }
            } else {
                throw new Error("Image generation did not return a result.");
            }
        } catch(e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [originalImage, inspirationImage, vibe, budget, roomType, decorationPurpose, selectedDecorations]);
    
    const handleDownload = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `decorated-room-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    const reset = () => {
        setOriginalImage(null);
        setInspirationImage(null);
        setGeneratedImage(null);
        setFurniture(null);
        setError(null);
        setIsLoading(false);
        setSelectedDecorations([]);
    };

    if (!originalImage) {
        return (
            <div className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <ImageUploader 
                        onUpload={setOriginalImage} 
                        title="Upload a photo of your room"
                        description="PNG, JPG, or WEBP. For best results, use a clear, well-lit photo."
                    />
                </div>
            </div>
        );
    }

    return (
    <main className="flex-grow flex flex-col p-4">
        <div className="flex flex-col lg:flex-row gap-4 flex-grow">
            <div className="w-full lg:w-[320px] shrink-0">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-6 h-full">
                    
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-green-400">1. Set Your Style</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Purpose of Decoration</label>
                            <select value={decorationPurpose} onChange={e => setDecorationPurpose(e.target.value as 'Permanent' | 'Party')} className="input-field w-full">
                                <option value="Permanent">Permanent Decor</option>
                                <option value="Party">Party / Event Decor</option>
                            </select>
                        </div>
                        {decorationPurpose === 'Permanent' && (
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Room Type</label>
                                <select value={roomType} onChange={e => setRoomType(e.target.value as RoomType)} className="input-field w-full">
                                {ROOM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                        )}
                        {decorationPurpose === 'Permanent' ? (
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
                        ) : (
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Party Theme</label>
                                <select value={vibe} onChange={e => setVibe(e.target.value)} className="input-field w-full">
                                {PARTY_THEMES.map(group => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.options.map(theme => <option key={theme.name} value={theme.name}>{theme.name}</option>)}
                                    </optgroup>
                                ))}
                                </select>
                            </div>
                        )}
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

                    {decorationPurpose === 'Party' && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg text-green-400">2. Decoration Elements</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {DECORATION_ELEMENTS.map(element => (
                                    <label key={element} className="flex items-center space-x-3 text-sm bg-gray-700/50 p-2 rounded-md cursor-pointer hover:bg-gray-700 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={selectedDecorations.includes(element)}
                                            onChange={() => handleDecorationChange(element)}
                                        />
                                        <span>{element}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                     <div>
                        <h3 className="font-bold text-lg text-green-400">{decorationPurpose === 'Party' ? '3.' : '2.'} Add Inspiration (Optional)</h3>
                        <div className="mt-2 h-40">
                            {inspirationImage ? (
                                <div className="relative w-full h-full">
                                    <img src={inspirationImage.base64} alt="Inspiration" className="rounded-md object-cover w-full h-full" />
                                    <button onClick={() => setInspirationImage(null)} className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white hover:bg-black/80">
                                        <X size={16}/>
                                    </button>
                                </div>
                            ) : (
                                <ImageUploader onUpload={setInspirationImage} title="Upload Inspiration" description="Add a style reference" />
                            )}
                        </div>
                     </div>
                    
                    <div className="mt-auto space-y-2 pt-4 border-t border-gray-700">
                        <button onClick={handleDecorate} disabled={isLoading} className="btn-primary w-full">
                            {isLoading ? 'Decorating...' : <><Wand2 size={18} /> Decorate My Room</>}
                        </button>
                         <button onClick={reset} disabled={isLoading} className="btn-secondary w-full">
                            <Upload size={16}/> Upload New Room
                        </button>
                    </div>

                </div>
            </div>
            
            <div className="flex-grow grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col min-h-[400px]">
                    <h3 className="font-bold text-lg text-cyan-400 mb-3 text-center">Original Room</h3>
                    <div className="flex-grow bg-gray-900/50 rounded-md flex items-center justify-center relative overflow-hidden">
                        <img src={originalImage.base64} alt="User's original room" className="w-full h-full object-contain" />
                    </div>
                </div>
                
                <div className="flex flex-col gap-4 min-w-0">
                    <div className="flex-grow">
                        <GeneratedImage 
                          image={generatedImage} 
                          isLoading={isLoading && !generatedImage} 
                          title="Generated Design" 
                          onDownload={handleDownload}
                        />
                    </div>
                    <div className="h-[300px] lg:h-auto lg:flex-grow">
                        <FurnitureList items={furniture} isLoading={isLoading && !!generatedImage} budget={budget}/>
                    </div>
                </div>
            </div>
        </div>
        {error && (
            <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-30 flex items-center gap-3">
            <p><strong>Error:</strong> {error}</p>
            <button onClick={() => setError(null)} className="p-1 rounded-full hover:bg-red-400"><X size={16}/></button>
            </div>
        )}
      <style>{`
        .btn-primary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background-image: linear-gradient(to right, #22d3ee, #a855f7); color: white; font-weight: bold; border-radius: 0.5rem; transition: all 0.2s; border: none; }
        .btn-primary:hover:not(:disabled) { box-shadow: 0 0 15px rgba(168, 85, 247, 0.5); transform: translateY(-2px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background-color: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid #4b5563; font-weight: 500; border-radius: 0.5rem; transition: background-color 0.2s; }
        .btn-secondary:hover:not(:disabled) { background-color: rgba(255,255,255,0.1); }
        .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
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
        .form-checkbox {
            -webkit-appearance: none; -moz-appearance: none; appearance: none;
            display: inline-block; vertical-align: middle;
            background-origin: border-box;
            user-select: none;
            flex-shrink: 0;
            height: 1rem; width: 1rem;
            color: #22d3ee;
            background-color: #374151;
            border-color: #4b5563;
            border-width: 1px;
            border-radius: 0.25rem;
        }
        .form-checkbox:checked {
            background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
            border-color: transparent;
            background-color: currentColor;
            background-size: 100% 100%;
            background-position: center;
            background-repeat: no-repeat;
        }
      `}</style>
    </main>
    );
}