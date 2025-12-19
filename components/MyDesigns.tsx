
import React, { useState, useEffect } from 'react';
import { SavedDesign } from '../services/designTypes';
import { LayoutGrid, Trash2, Box, LogIn, Loader2, Cloud } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { loadUserDesigns, deleteDesign } from '../services/designStorage';

interface MyDesignsProps {
  onLoadDesign: (design: SavedDesign) => void;
  onLoginRequest: () => void;
}

const MyDesigns: React.FC<MyDesignsProps> = ({ onLoadDesign, onLoginRequest }) => {
  const { user, isLoading: authLoading, refreshKey } = useAuth();
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(true);

  useEffect(() => {
    const fetchDesigns = async () => {
      if (user) {
        setIsLoadingDesigns(true);
        try {
          const designs = await loadUserDesigns(user.uid);
          setSavedDesigns(designs);
        } catch (error) {
          console.error("Failed to fetch designs:", error);
          setSavedDesigns([]);
        } finally {
          setIsLoadingDesigns(false);
        }
      } else {
        setSavedDesigns([]);
        setIsLoadingDesigns(false);
      }
    };

    if (!authLoading) {
      fetchDesigns();
    }
  }, [user, authLoading, refreshKey]);

  const handleDelete = async (id: string) => {
    if (user && confirm('Are you sure you want to delete this design? This cannot be undone.')) {
        try {
          await deleteDesign(user.uid, id);
          setSavedDesigns(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            console.error("Failed to delete design:", error);
            alert("Could not delete the design. Please try again.");
        }
    }
  };
  
  if (authLoading || isLoadingDesigns) {
      return (
          <div className="text-center py-20 bg-gray-800/50 rounded-lg">
              <Loader2 size={64} className="mx-auto text-gray-500 animate-spin" />
              <p className="mt-4 text-lg text-gray-400">Loading Designs...</p>
          </div>
      );
  }
  
  if (!user) {
      return (
         <div className="text-center py-20 bg-gray-800/50 rounded-lg">
          <LogIn size={64} className="mx-auto text-gray-500" />
          <p className="mt-4 text-lg text-gray-400">Please Log In</p>
          <p className="text-gray-500 mb-6">Log in to view your saved designs.</p>
          <button onClick={onLoginRequest} className="btn-primary">
            Sign in to view designs
          </button>
        </div>
      );
  }

  if (savedDesigns.length === 0) {
      return (
        <div className="flex-grow p-4">
           <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-6 flex items-center gap-3">
                  <LayoutGrid size={28}/> My Saved Designs
              </h2>
              <div className="bg-blue-900/30 border-blue-700 text-blue-300 text-sm rounded-lg p-3 mb-8 flex items-start gap-3">
                <div className="mt-0.5 shrink-0"><Cloud size={20} /></div>
                <p>Your designs are saved securely in the cloud.</p>
              </div>
              <div className="text-center py-20 bg-gray-800/50 rounded-lg">
                <Box size={64} className="mx-auto text-gray-500" />
                <p className="mt-4 text-lg text-gray-400">You haven't saved any designs yet.</p>
                <p className="text-gray-500">Go to the designer to create and save your first room!</p>
              </div>
           </div>
        </div>
      );
  }

  return (
    <div className="flex-grow p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-6 flex items-center gap-3">
            <LayoutGrid size={28}/> My Saved Designs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {savedDesigns.map(design => (
            <div key={design.id} className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden flex flex-col group transition-all duration-300 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="w-full h-40 bg-gray-700 overflow-hidden relative">
                 {design.previewImage ? (
                   <img src={design.previewImage} alt={`Preview of ${design.name}`} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-500"><Box size={32}/></div>
                 )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-lg truncate group-hover:text-cyan-400 transition-colors">{design.name}</h3>
                <p className="text-xs text-gray-400 mb-4">Last saved: {new Date(design.savedAt).toLocaleDateString()}</p>
                <div className="mt-auto flex gap-2">
                  <button onClick={() => onLoadDesign(design)} className="btn-primary flex-grow">
                    Load
                  </button>
                  <button onClick={() => handleDelete(design.id)} className="p-2 bg-red-800/50 text-red-300 hover:bg-red-800/80 rounded-lg transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .btn-primary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem; background-image: linear-gradient(to right, #22d3ee, #a855f7); color: white; font-weight: bold; border-radius: 0.5rem; transition: all 0.2s; border: none; font-size: 0.875rem; }
        .btn-primary:hover:not(:disabled) { box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); transform: translateY(-1px); }
      `}</style>
    </div>
  );
};

export default MyDesigns;
