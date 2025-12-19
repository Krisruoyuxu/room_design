
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Bot, Loader2 } from 'lucide-react';
import { sendAssistantMessage, AssistantMessage } from '../services/assistantService';

interface Message extends AssistantMessage {
  id: number;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: 'assistant',
    content: "Hi! I'm your RoomDesign Assistant. 🧚\u200d♀️"
  },
  {
    id: 2,
    role: 'assistant',
    content: "I can help you design your room, find furniture, or answer questions about the app. Try asking me something!"
  }
];

const AssistantChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const newUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: userText
    };

    // 1. Update UI immediately with user message
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      // 2. Call the AI service with the full history
      // We strip the IDs when passing to the service as it only expects role/content
      const historyForService: AssistantMessage[] = updatedMessages.map(({ role, content }) => ({ role, content }));
      
      const responseText = await sendAssistantMessage(historyForService);

      // 3. Append assistant response
      const newAssistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseText
      };
      setMessages(prev => [...prev, newAssistantMessage]);

    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Animation Styles */}
      <style>{`
        @keyframes float-sprite {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float-sprite 3s ease-in-out infinite;
        }
      `}</style>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 font-sans">
        
        {/* Chat Panel */}
        {isOpen && (
          <div className="w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[60vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right">
            
            {/* Header */}
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">RoomDesign Assistant</h3>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Online
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-900/95">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-cyan-600 text-white rounded-tr-none' 
                        : 'bg-gray-700 text-gray-100 rounded-tl-none border border-gray-600'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                   <div className="bg-gray-700 border border-gray-600 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                   </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-gray-800 border-t border-gray-700 shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isLoading}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-2 p-1.5 bg-cyan-500 text-white rounded-full hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 transition-colors"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Floating Sprite Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group ${
            isOpen ? 'bg-gray-700 rotate-90' : 'bg-gradient-to-r from-cyan-500 to-purple-600 animate-float'
          }`}
          aria-label={isOpen ? "Close chat" : "Open assistant"}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <>
              <Sparkles size={24} className="text-white absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-125" />
              <Bot size={28} className="text-white group-hover:opacity-0 transition-opacity duration-300" />
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default AssistantChat;
