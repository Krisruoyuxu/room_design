import React, { useState, useRef, useCallback, useId } from 'react';
import { Upload, Palette, Loader2, X, RefreshCw, Shuffle, Undo2, Redo2, Wand2, Trash2, Download } from 'lucide-react';
import { paintWallInImage } from '../services/geminiService';

const PRESET_COLORS = ['#f3f4f6', '#d1d5db', '#9ca3af', '#6b7280', '#bbf7d0', '#99f6e4', '#a5f3fc', '#bae6fd', '#c7d2fe', '#e0e7ff', '#fbcfe8', '#fecaca'];

interface ImageFile {
  file: File;
  base64: string;
}

interface PendingPaint {
    id: string;
    position: { x: number; y: number; }; // Normalized
    displayPos: { top: string; left: string }; // For rendering dot on image
    color: string;
}

const ImageUploader: React.FC<{ onUpload: (file: ImageFile) => void }> = ({ onUpload }) => {
  const uniqueId = useId();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpload({ file, base64: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center">
      <label htmlFor={`upload-${uniqueId}`} className="flex flex-col items-center justify-center w-full max-w-lg h-80 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
        </div>
        <input id={`upload-${uniqueId}`} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </label>
    </div>
  );
};

const RoomPainter = () => {
  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedColor, setSelectedColor] = useState<string>('#99f6e4');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brushPreview, setBrushPreview] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [pendingPaints, setPendingPaints] = useState<PendingPaint[]>([]);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const uniqueColorId = useId();

  const activeImage = history[historyIndex];

  const handleImageUpload = useCallback(async (file: ImageFile) => {
    const img = new Image();
    img.onload = () => {
      const fullBase64 = `data:${file.file.type};base64,${file.base64.split(',')[1]}`;
      setOriginalImage({ ...file, base64: fullBase64 });
      setHistory([fullBase64]);
      setHistoryIndex(0);
      setPendingPaints([]);
      setError(null);
    }
    img.src = file.base64;
  }, []);
  
  const handleRandomColor = () => {
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    setSelectedColor(randomColor);
  };

  const handleApplyPaints = useCallback(async () => {
    if (isLoading || !activeImage || !originalImage || pendingPaints.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const base64Data = activeImage.split(',')[1];
      const mimeType = originalImage.file.type;
      const result = await paintWallInImage(base64Data, mimeType, pendingPaints);
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(result);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setPendingPaints([]);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to paint the wall.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeImage, originalImage, pendingPaints, history, historyIndex]);

  const handleInteraction = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !containerRef.current || !imageWrapperRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
        setBrushPreview({ x: mouseX, y: mouseY, visible: true });
        
        if (event.type === 'click' && !isLoading) {
            const img = imageRef.current;
            const imgRect = img.getBoundingClientRect();

            // Account for `object-contain` to get coordinates for the AI
            const { naturalWidth, naturalHeight } = img;
            const { width: displayWidth, height: displayHeight } = imgRect;

            const naturalRatio = naturalWidth / naturalHeight;
            const displayRatio = displayWidth / displayHeight;

            let renderedImageWidth, renderedImageHeight, offsetX, offsetY;

            if (naturalRatio > displayRatio) {
              renderedImageWidth = displayWidth;
              renderedImageHeight = displayWidth / naturalRatio;
              offsetX = 0;
              offsetY = (displayHeight - renderedImageHeight) / 2;
            } else {
              renderedImageHeight = displayHeight;
              renderedImageWidth = displayHeight * naturalRatio;
              offsetY = 0;
              offsetX = (displayWidth - renderedImageWidth) / 2;
            }

            const clickXInBox = event.clientX - imgRect.left;
            const clickYInBox = event.clientY - imgRect.top;

            const clickXOnImage = clickXInBox - offsetX;
            const clickYOnImage = clickYInBox - offsetY;

            // Get coordinates for the visual dot display
            const imageWrapper = imageWrapperRef.current;
            const wrapperRect = imageWrapper.getBoundingClientRect();
            const clickXInWrapper = event.clientX - wrapperRect.left;
            const clickYInWrapper = event.clientY - wrapperRect.top;


            // Check if the click is within the rendered image bounds
            if (clickXOnImage >= 0 && clickXOnImage <= renderedImageWidth &&
                clickYOnImage >= 0 && clickYOnImage <= renderedImageHeight) {

                const normalizedX = clickXOnImage / renderedImageWidth;
                const normalizedY = clickYOnImage / renderedImageHeight;
                
                const newPaint: PendingPaint = {
                    id: `paint-${Date.now()}-${Math.random()}`,
                    position: { x: normalizedX, y: normalizedY },
                    displayPos: {
                        left: `${(clickXInWrapper / wrapperRect.width) * 100}%`,
                        top: `${(clickYInWrapper / wrapperRect.height) * 100}%`,
                    },
                    color: selectedColor,
                };
                setPendingPaints(prev => [...prev, newPaint]);
            }
        }
    } else {
        setBrushPreview(prev => ({ ...prev, visible: false }));
    }
  };

  const handleRemovePendingPaint = (idToRemove: string) => {
    setPendingPaints(prev => prev.filter(p => p.id !== idToRemove));
  };

  const handleMouseLeave = () => {
    setBrushPreview(prev => ({ ...prev, visible: false }));
  };

  const handleUndo = () => setHistoryIndex(prev => Math.max(0, prev - 1));
  const handleRedo = () => setHistoryIndex(prev => Math.min(history.length - 1, prev + 1));
  const handleRevert = () => {
    setHistoryIndex(0);
    setPendingPaints([]);
  };
  const reset = () => {
      setOriginalImage(null);
      setHistory([]);
      setHistoryIndex(-1);
      setPendingPaints([]);
      setError(null);
  };
    
  const handleDownload = useCallback(() => {
    if (!activeImage) return;
    const link = document.createElement('a');
    link.href = activeImage;
    link.download = `painted-room-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activeImage]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  if (!originalImage) {
    return <ImageUploader onUpload={handleImageUpload} />;
  }

  const getInstructionText = () => {
    if (isLoading) return 'Applying paint...';
    if (pendingPaints.length > 0) return "Click 'Apply Paint' to see your changes, or keep adding more colors.";
    return 'Click on walls to add them to the paint queue.';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 flex-grow h-full">
      <div className="w-full lg:w-[320px] shrink-0 bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-6">
        <div>
            <h3 className="font-bold text-lg text-cyan-400 flex items-center gap-2 mb-3"><Palette size={20} /> Color Palette</h3>
            <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map(color => (
                <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-full h-10 rounded-md transition-transform duration-150 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-400 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: color }}
                title={color}
                />
            ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
            <label htmlFor={uniqueColorId} className="p-2 border-2 rounded-md cursor-pointer" style={{borderColor: selectedColor}}>
                <input
                id={uniqueColorId}
                type="color"
                value={selectedColor}
                onChange={e => setSelectedColor(e.target.value)}
                className="w-10 h-10 bg-transparent border-none cursor-pointer p-0"
                style={{'WebkitAppearance': 'none', 'MozAppearance': 'none', appearance: 'none'}}
                />
            </label>
            <div className="flex-grow">
                <p className="text-sm text-gray-400">Custom Color</p>
                <p className="font-mono text-lg">{selectedColor}</p>
            </div>
            <button onClick={handleRandomColor} title="Pick a random color" className="btn-secondary p-2">
                <Shuffle size={20}/>
            </button>
            </div>
        </div>
        
        <div className="space-y-3">
            <h3 className="font-bold text-lg text-cyan-400 flex items-center gap-2">Pending Changes</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                {pendingPaints.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No changes queued.</p>
                ) : (
                    pendingPaints.map(paint => (
                        <div key={paint.id} className="flex items-center gap-3 bg-gray-700/50 p-2 rounded">
                           <div className="w-6 h-6 rounded-sm border border-gray-500" style={{backgroundColor: paint.color}}></div>
                           <span className="font-mono text-sm flex-grow">{paint.color}</span>
                           <button onClick={() => handleRemovePendingPaint(paint.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={16} />
                           </button>
                        </div>
                    ))
                )}
            </div>
             <button onClick={handleApplyPaints} disabled={pendingPaints.length === 0 || isLoading} className="btn-primary w-full">
                {isLoading ? 'Applying...' : <><Wand2 size={18} /> Apply Paint</>}
             </button>
        </div>

        <div className="mt-auto space-y-3 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center flex items-start gap-2 min-h-[40px]">
             {getInstructionText()}
          </p>
           <div className="flex gap-2">
             <button onClick={handleUndo} disabled={!canUndo || isLoading} className="btn-secondary w-full">
                <Undo2 size={16}/> Undo
             </button>
             <button onClick={handleRedo} disabled={!canRedo || isLoading} className="btn-secondary w-full">
                <Redo2 size={16}/> Redo
             </button>
           </div>
           <button onClick={handleRevert} disabled={!canUndo || isLoading} className="btn-secondary w-full">
                <RefreshCw size={16}/> Revert to Original
           </button>
           <button onClick={reset} className="btn-secondary w-full">
             <Upload size={16}/> Upload New Image
           </button>
        </div>
      </div>
      <div className="flex-grow rounded-lg bg-gray-800/50 border border-gray-700 p-4 flex flex-col min-w-0">
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg text-cyan-400">Painted Room</h3>
            {historyIndex > 0 && !isLoading && (
                <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 text-slate-300 border border-slate-600 font-medium rounded-lg transition-colors hover:bg-white/10"
                    title="Download Image"
                >
                    <Download size={16} />
                    Download
                </button>
            )}
        </div>
        <div 
            ref={containerRef} 
            className="flex-grow flex items-center justify-center relative cursor-none min-w-0 bg-gray-900/50 rounded-md"
            onMouseMove={handleInteraction}
            onClick={handleInteraction}
            onMouseLeave={handleMouseLeave}
        >
            <div ref={imageWrapperRef} className="relative w-full h-full flex items-center justify-center">
                <img
                    ref={imageRef}
                    src={activeImage || ''}
                    alt="Room to be painted"
                    className="max-w-full max-h-full object-contain select-none pointer-events-none"
                    />
                
                {/* Render pending paint dots */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {pendingPaints.map(paint => (
                        <div
                            key={paint.id}
                            className="absolute w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2"
                            style={{
                                top: paint.displayPos.top,
                                left: paint.displayPos.left,
                                backgroundColor: paint.color,
                                boxShadow: '0 0 0 2px black',
                            }}
                        />
                    ))}
                </div>
            </div>

            {brushPreview.visible && !isLoading && (
                <div
                    className="fixed w-8 h-8 rounded-full border-2 border-white bg-opacity-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-lg"
                    style={{
                        left: brushPreview.x,
                        top: brushPreview.y,
                        backgroundColor: selectedColor,
                        boxShadow: '0 0 0 2px black',
                    }}
                />
            )}

            {isLoading && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10 rounded-md">
                <Loader2 className="animate-spin text-cyan-400" size={48} />
                <p className="text-gray-300">Applying paint...</p>
            </div>
            )}
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
        .btn-secondary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background-color: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid #4b5563; font-weight: 500; border-radius: 0.5rem; transition: background-color 0.2s, border-color 0.2s, color 0.2s; }
        .btn-secondary:hover:not(:disabled) { background-color: rgba(255,255,255,0.1); }
        .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0.25rem; }
        input[type="color"]::-moz-color-swatch { border: none; border-radius: 0.25rem; }
      `}</style>
    </div>
  );
};

export default RoomPainter;