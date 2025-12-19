
import React, { useState, useEffect, useRef } from 'react';
import Homepage from './components/Homepage';
import RoomDesigner, { RoomDesignerHandle } from './components/RoomDesigner';
import RoomPainter from './components/RoomPainter';
import RoomDecorator from './components/RoomDecorator';
import MyDesigns from './components/MyDesigns';
import AssistantChat from './components/AssistantChat'; // Import the new widget
import { SavedDesign } from './services/designTypes';
import { Bookmark, LogIn, User as UserIcon, LogOut, X, Cloud, HardDrive, UserCog, Mail, Phone, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from './auth/AuthContext';

type Page = 'homepage' | 'designer' | 'painter' | 'decorator' | 'myDesigns';

// Reuse existing LoginModal
const LoginModal: React.FC<{ 
  onClose: () => void; 
  onGoogle: () => void;
  onMicrosoft: () => void;
  onApple: () => void;
  onGuest: () => void;
  onEmailSignUp: (e: string, p: string) => Promise<void>;
  onEmailSignIn: (e: string, p: string) => Promise<void>;
  onEmailLinkSignIn: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}> = ({ onClose, onGoogle, onMicrosoft, onApple, onGuest, onEmailSignUp, onEmailSignIn, onEmailLinkSignIn, isLoading, error }) => {
  
  const { 
    startPhoneLogin, 
    verifyPhoneCode, 
    phoneLoginStage, 
    phoneTargetNumber 
  } = useAuth();

  const [view, setView] = useState<'main' | 'email' | 'phone'>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailForLink, setEmailForLink] = useState('');
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [localPhone, setLocalPhone] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isSignUp) await onEmailSignUp(email, password);
    else await onEmailSignIn(email, password);
  };
  
  const handleEmailLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForLink || isLoading) return;
    await onEmailLinkSignIn(emailForLink);
    setEmailLinkSent(true);
  };

  const handleSendCode = async () => {
    if (!localPhone.trim()) { setLocalError("Please enter your phone number."); return; }
    setLocalError(null);
    await startPhoneLogin(localPhone);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) return;
    await verifyPhoneCode(verificationCode);
  };

  useEffect(() => { setLocalError(null); }, [view]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 w-full max-w-sm relative overflow-hidden">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10"><X size={20} /></button>
        {view !== 'main' && (
          <button onClick={() => setView('main')} className="absolute top-3 left-3 text-gray-400 hover:text-white z-10 flex items-center gap-1 text-sm"><ArrowLeft size={16} /> Back</button>
        )}
        <h3 className="text-2xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Welcome!</h3>
        <p className="text-gray-400 text-center mb-6">Sign in to sync &amp; back up your designs.</p>

        {view === 'main' && (
          <div className="space-y-3">
            <button onClick={onGoogle} disabled={isLoading} className="btn-primary w-full">{isLoading ? '...' : 'Continue with Google'}</button>
            <button onClick={onMicrosoft} disabled={isLoading} className="btn-microsoft w-full">{isLoading ? '...' : 'Continue with Microsoft'}</button>
            <button onClick={onApple} disabled={isLoading} className="btn-apple w-full">{isLoading ? '...' : 'Continue with Apple'}</button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setView('email')} disabled={isLoading} className="btn-secondary text-sm"><Mail size={16} /> Email</button>
              <button onClick={() => setView('phone')} disabled={isLoading} className="btn-secondary text-sm"><Phone size={16} /> Phone</button>
            </div>
            <div className="mt-4 border border-gray-700 rounded-lg p-3 bg-gray-900/40">
              <p className="text-sm text-gray-200 mb-2 text-center">Or sign in with an email link</p>
              <form onSubmit={handleEmailLinkSubmit} className="space-y-2">
                <input type="email" value={emailForLink} onChange={(e) => setEmailForLink(e.target.value)} placeholder="you@example.com" className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white" disabled={isLoading} required />
                <button type="submit" className="btn-secondary w-full justify-center" disabled={isLoading || !emailForLink}>{emailLinkSent ? "Resend link" : "Send link"}</button>
                {emailLinkSent && <p className="text-xs text-emerald-400 text-center">Link sent to {emailForLink}.</p>}
              </form>
            </div>
            <div className="flex items-center text-xs text-gray-500 my-3">
              <div className="flex-grow border-t border-gray-700"></div><span className="shrink-0 px-2">OR</span><div className="flex-grow border-t border-gray-700"></div>
            </div>
            <button onClick={onGuest} disabled={isLoading} className="btn-secondary w-full">Continue as Guest</button>
          </div>
        )}

        {view === 'email' && (
          <div className="space-y-4">
            <div className="flex justify-center gap-4 text-sm border-b border-gray-700 pb-2 mb-4">
              <button className={`pb-1 ${!isSignUp ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400'}`} onClick={() => setIsSignUp(false)}>Sign In</button>
              <button className={`pb-1 ${isSignUp ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400'}`} onClick={() => setIsSignUp(true)}>Create Account</button>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="Email" />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="Password" />
              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-4">{isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}</button>
            </form>
          </div>
        )}

        {view === 'phone' && (
          <div className="space-y-4">
             {phoneLoginStage === 'idle' ? (
               <div className="space-y-3">
                 <input type="tel" required value={localPhone} onChange={e => setLocalPhone(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="+1 555 123 4567" />
                 <button onClick={handleSendCode} disabled={isLoading} className="btn-primary w-full">Send Code</button>
               </div>
             ) : (
               <div className="space-y-3">
                  <p className="text-sm text-gray-400 text-center">Code sent to {phoneTargetNumber}</p>
                  <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-center tracking-widest" placeholder="123456" />
                  <button onClick={handleVerifyCode} disabled={isLoading} className="btn-primary w-full">Verify</button>
               </div>
             )}
          </div>
        )}
        {(error || localError) && <p className="mt-4 text-xs text-red-400 text-center bg-red-900/20 p-2 rounded border border-red-900/50">{localError || error}</p>}
      </div>
      <style>{`
        .btn-primary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background-image: linear-gradient(to right, #22d3ee, #a855f7); color: white; font-weight: bold; border-radius: 0.5rem; transition: all 0.2s; border: none; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); }
        .btn-secondary, .btn-microsoft, .btn-apple { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; color: white; font-weight: bold; border-radius: 0.5rem; transition: all 0.2s; border: 1px solid #4b5563; background-color: rgba(255,255,255,0.05); }
        .btn-secondary:hover:not(:disabled) { background-color: rgba(255,255,255,0.1); }
        .btn-microsoft { background-color: #0067b8; }
        .btn-apple { background-color: #333333; }
      `}</style>
    </div>
  );
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  primaryAction: { label: string; onClick: () => void; };
  secondaryAction?: { label: string; onClick: () => void; };
  type: 'warning' | 'info';
}> = ({ isOpen, onClose, title, message, primaryAction, secondaryAction, type }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-sm text-center relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white"><X size={20} /></button>
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
            <AlertTriangle size={24} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="space-y-3">
            <button onClick={primaryAction.onClick} className="btn-primary w-full justify-center">{primaryAction.label}</button>
            {secondaryAction && <button onClick={secondaryAction.onClick} className="btn-secondary w-full justify-center">{secondaryAction.label}</button>}
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-white mt-2">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [page, setPage] = useState<Page>('homepage');
  const { 
    user, 
    mode,
    isLoading: authIsLoading, 
    signOutCompletely, 
    signInWithGoogle, signInWithMicrosoft, signInWithApple, continueAsGuest, signUpWithEmail, signInWithEmail, sendEmailLinkSignIn,
    clearAuthError, authError 
  } = useAuth();
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Current design state for loading into Designer
  const [currentLoadedDesign, setCurrentLoadedDesign] = useState<SavedDesign | null>(null);
  
  // Navigation Guards
  const [designerHasUnsaved, setDesignerHasUnsaved] = useState(false);
  const [showGuestLeaveModal, setShowGuestLeaveModal] = useState(false);
  const [showCloudLeaveModal, setShowCloudLeaveModal] = useState(false);
  
  // Post-login action (for "Sign in & Save")
  const [postLoginAction, setPostLoginAction] = useState<(() => void) | null>(null);
  
  // Designer Ref for external save triggering
  const designerRef = useRef<RoomDesignerHandle | null>(null);

  // Feedback
  const [notification, setNotification] = useState<{msg: string, type: 'error' | 'success'} | null>(null);

  // --- Auth Handlers ---
  const handleOpenLoginModal = () => { clearAuthError(); setIsUserMenuOpen(false); setIsLoginModalOpen(true); };
  const handleCloseLoginModal = () => { clearAuthError(); setIsLoginModalOpen(false); };
  
  useEffect(() => {
    // If we are logged in and have a pending action, execute it
    if (user && postLoginAction) {
      // Close modal if open (it likely is)
      setIsLoginModalOpen(false);
      // Execute
      postLoginAction();
      setPostLoginAction(null);
    } else if (user && isLoginModalOpen) {
       // Just close if logged in without specific action
       setIsLoginModalOpen(false);
    }
  }, [user, postLoginAction, isLoginModalOpen]);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await signOutCompletely();
    setPage('homepage');
    setCurrentLoadedDesign(null);
    setDesignerHasUnsaved(false);
  };

  // --- Navigation Guard ---
  const handleLogoClick = () => {
    if (page !== 'designer') {
      setPage('homepage');
      return;
    }

    if (!designerHasUnsaved) {
      setPage('homepage');
      return;
    }

    if (mode === 'guest') {
      setShowGuestLeaveModal(true);
    } else {
      setShowCloudLeaveModal(true);
    }
  };

  const navigateToDesigner = (design?: SavedDesign) => {
    setCurrentLoadedDesign(design || null);
    setPage('designer');
  };

  // --- Render Page ---
  const renderPage = () => {
    switch (page) {
      case 'designer':
        return <RoomDesigner
          ref={designerRef}
          initialDesign={currentLoadedDesign?.state}
          initialDesignId={currentLoadedDesign?.id}
          onUnsavedChangesChange={setDesignerHasUnsaved}
          onNavigateHomeAfterSave={() => setPage('homepage')}
          onLoginRequest={handleOpenLoginModal}
          onError={(msg) => setNotification({msg, type: 'error'})}
          onSuccess={(msg) => setNotification({msg, type: 'success'})}
        />;
      case 'painter': return <RoomPainter />;
      case 'decorator': return <RoomDecorator />;
      case 'myDesigns':
        return <MyDesigns 
                  onLoadDesign={navigateToDesigner} 
                  onLoginRequest={handleOpenLoginModal}
                />;
      default:
        return <Homepage onNavigate={(p) => {
          if (p === 'designer') navigateToDesigner();
          else setPage(p);
        }} />;
    }
  };

  // --- Header & User Menu ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderAuthStatus = () => {
    if (authIsLoading) return <div className="w-24 h-8 bg-gray-700 rounded-lg animate-pulse"></div>;
    
    if (mode === 'guest') {
       return (
         <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-gray-300">
             <UserIcon size={20} />
             <div className="hidden sm:flex items-center gap-1.5">
                <span className="font-medium">Guest</span>
                <span className="text-gray-500">·</span>
                <span className="text-xs text-yellow-400 flex items-center gap-1"><HardDrive size={12}/> Local only</span>
            </div>
           </div>
           <button onClick={handleOpenLoginModal} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
              <LogIn size={18} /> <span className="hidden sm:inline">Sign In</span>
           </button>
         </div>
       );
    }
    
    return (
       <div className="relative" ref={userMenuRef}>
          <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="flex items-center gap-2 text-gray-300 bg-gray-700/50 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors">
             <UserCog size={20} />
             <div className="hidden sm:flex items-center gap-1.5">
                 <span className="font-medium truncate max-w-[120px]">Hi, {user?.displayName || user?.email || 'User'}</span>
                 <span className="text-gray-500">·</span>
                 <span className="text-xs text-blue-400 flex items-center gap-1"><Cloud size={12}/> Cloud Sync</span>
             </div>
          </button>
          {isUserMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-30">
              <div className="p-2 text-sm text-gray-400 border-b border-gray-700 truncate">{user?.email}</div>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2 rounded-b-lg">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
       </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 fixed top-0 left-0 right-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={handleLogoClick} className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 hover:opacity-80 transition-opacity">
            RoomDesign AI
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => setPage('myDesigns')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
              <Bookmark size={20} /><span className="hidden sm:inline">My Designs</span>
            </button>
            {renderAuthStatus()}
          </div>
        </div>
      </header>
      <div className="flex-grow flex flex-col pt-16">
        {renderPage()}
      </div>

      {/* Assistant Widget */}
      <AssistantChat />

      {/* Modals */}
      <ConfirmationModal
        isOpen={showGuestLeaveModal}
        onClose={() => setShowGuestLeaveModal(false)}
        title="Save before leaving?"
        message="You have changes that haven't been saved. To keep this room, sign in and save it to My Designs before leaving the designer."
        type="warning"
        primaryAction={{
            label: "Sign in & Save",
            onClick: () => {
                setShowGuestLeaveModal(false);
                setPostLoginAction(() => async () => {
                    if (designerRef.current) {
                        await designerRef.current.saveAndGoHomeFromOutside();
                    }
                });
                handleOpenLoginModal();
            }
        }}
        secondaryAction={{
            label: "Discard Changes",
            onClick: () => {
                setShowGuestLeaveModal(false);
                setDesignerHasUnsaved(false);
                setPage('homepage');
            }
        }}
      />

      <ConfirmationModal
        isOpen={showCloudLeaveModal}
        onClose={() => setShowCloudLeaveModal(false)}
        title="Save before leaving?"
        message="You have changes that haven't been saved to My Designs yet. Do you want to save this room before leaving the designer?"
        type="info"
        primaryAction={{
            label: "Save & Go Home",
            onClick: async () => {
                setShowCloudLeaveModal(false);
                if (designerRef.current) {
                    await designerRef.current.saveAndGoHomeFromOutside();
                }
            }
        }}
        secondaryAction={{
            label: "Discard Changes",
            onClick: () => {
                setShowCloudLeaveModal(false);
                setDesignerHasUnsaved(false);
                setPage('homepage');
            }
        }}
      />

      {isLoginModalOpen && (
        <LoginModal 
          onClose={handleCloseLoginModal} 
          onGoogle={signInWithGoogle} onMicrosoft={signInWithMicrosoft} onApple={signInWithApple} onGuest={continueAsGuest}
          onEmailSignUp={signUpWithEmail} onEmailSignIn={signInWithEmail} onEmailLinkSignIn={sendEmailLinkSignIn}
          isLoading={authIsLoading} error={authError}
        />
      )}
      
      {notification && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-fade-in-up`}>
          {notification.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          <p>{notification.msg}</p>
          <button onClick={() => setNotification(null)}><X size={16}/></button>
        </div>
      )}
      <div id="phone-recaptcha-container"></div>
      <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}
