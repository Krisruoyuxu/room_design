import React from 'react';
import { Image as ImageIcon, Loader2, Download } from 'lucide-react';

interface GeneratedImageProps {
  image: string | null;
  isLoading: boolean;
  title: string;
  onDownload?: () => void;
}

const GeneratedImage: React.FC<GeneratedImageProps> = ({ image, isLoading, title, onDownload }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 h-full flex flex-col min-w-0">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg text-purple-400">{title}</h3>
        {image && onDownload && !isLoading && (
            <button
                onClick={onDownload}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 text-slate-300 border border-slate-600 font-medium rounded-lg transition-colors hover:bg-white/10"
                title="Download Image"
            >
                <Download size={16} />
                Download
            </button>
        )}
      </div>
      <div className="flex-grow bg-gray-900/50 rounded-md flex items-center justify-center relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
            <Loader2 className="animate-spin text-purple-400" size={48} />
            <p className="text-gray-300">Styling your room...</p>
          </div>
        )}
        {image ? (
          <img
            src={image}
            alt="AI-generated room design"
            className="w-full h-full object-contain"
            draggable="false"
          />
        ) : (
          !isLoading && (
            <div className="text-center text-gray-500">
              <ImageIcon size={64} className="mx-auto" />
              <p className="mt-2">Your design will appear here</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default GeneratedImage;