
import React from 'react';
import { FurnitureItem } from '../types';
import { ShoppingCart, Loader2, ExternalLink } from 'lucide-react';

interface FurnitureListProps {
  items: FurnitureItem[] | null;
  isLoading: boolean;
  budget: number;
}

const FurnitureList: React.FC<FurnitureListProps> = ({ items, isLoading, budget }) => {
  const totalCost = items ? items.reduce((sum, item) => sum + item.price, 0) : 0;
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 h-full flex flex-col min-w-0">
      <h3 className="font-bold text-lg text-purple-400 mb-3 text-center">Shopping List</h3>
      <div className="flex-grow bg-gray-900/50 rounded-md p-3 overflow-y-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
            <Loader2 className="animate-spin text-purple-400" size={32} />
            <p className="text-gray-300 text-sm">Finding items...</p>
          </div>
        )}
        {items && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-700/50 p-3 rounded-md">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-gray-200 flex-1">{item.name}</h4>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-mono text-purple-300">${item.price.toFixed(2)}</p>
                    <a
                      href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.searchQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                      title={`Search for "${item.name}" on Google Shopping`}
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        ) : (
          !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ShoppingCart size={48} className="mx-auto" />
              <p className="mt-2 text-sm">Furniture items will appear here</p>
            </div>
          )
        )}
      </div>
       {items && items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700 text-right">
            <p className="text-sm text-gray-400">Estimated Total:</p>
            <p className="text-xl font-bold text-purple-300">${totalCost.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Budget: ${budget.toFixed(2)}</p>
          </div>
        )}
    </div>
  );
};

export default FurnitureList;