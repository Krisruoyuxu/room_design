import React from 'react';
import { Box, Paintbrush, Wand2 } from 'lucide-react';

interface HomepageProps {
  onNavigate: (page: 'designer' | 'painter' | 'decorator') => void;
}

const Homepage: React.FC<HomepageProps> = ({ onNavigate }) => {
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-4 animate-fade-in-down">
        DESIGN YOUR DREAM SPACE
      </h2>
      <p className="text-lg md:text-xl text-gray-400 mb-12 animate-fade-in-up">
        Start from scratch or redesign an existing room.
      </p>

      <div className="flex flex-col md:flex-row gap-8 animate-fade-in">
        <ActionCard
          icon={<Box size={48} className="text-cyan-400" />}
          title="START NEW DESIGN"
          description="Create a new room from precise dimensions."
          buttonText="BUILD FROM SCRATCH"
          onClick={() => onNavigate('designer')}
          hoverColorClass="hover:border-cyan-400"
        />
        <ActionCard
          icon={<Paintbrush size={48} className="text-purple-400" />}
          title="AI ROOM PAINTER"
          description="Upload a photo and instantly try new wall colors."
          buttonText="PAINT YOUR ROOM"
          onClick={() => onNavigate('painter')}
          hoverColorClass="hover:border-purple-400"
        />
        <ActionCard
          icon={<Wand2 size={48} className="text-green-400" />}
          title="AI ROOM DECORATOR"
          description="Upload your room, AI redesigns with new furniture & styles."
          buttonText="DECORATE MY ROOM"
          onClick={() => onNavigate('decorator')}
          hoverColorClass="hover:border-green-400"
        />
      </div>
      <style>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-down { animation: fade-in-down 0.8s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out 0.2s forwards; }
        .animate-fade-in { animation: fade-in 1s ease-out 0.4s forwards; opacity: 0; }
        .btn-primary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background-image: linear-gradient(to right, #22d3ee, #a855f7); color: white; font-weight: bold; border-radius: 0.5rem; transition: all 0.2s; border: none; }
        .btn-primary:hover:not(:disabled) { box-shadow: 0 0 15px rgba(168, 85, 247, 0.5); transform: translateY(-2px); }
      `}</style>
    </main>
  );
};

const ActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  hoverColorClass?: string;
}> = ({ icon, title, description, buttonText, onClick, hoverColorClass = "hover:border-cyan-400" }) => {
  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-8 flex flex-col items-center w-full max-w-sm ${hoverColorClass} transition-all duration-300 transform hover:-translate-y-2`}>
      <div className="mb-6">{icon}</div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 mb-8 flex-grow">{description}</p>
      <button onClick={onClick} className="btn-primary w-full">
        {buttonText}
      </button>
    </div>
  );
};

export default Homepage;
