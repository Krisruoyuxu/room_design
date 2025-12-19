
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  auth, 
  signInWithGoogle as googleSignIn,
  signInWithMicrosoft as microsoftSignIn,
  signInWithApple as appleSignIn,
  signOutUser,
  registerWithEmailAndPassword,
  loginWithEmailAndPassword,
  startPhoneSignIn,
  confirmPhoneCode,
  resetPhoneRecaptcha,
  ConfirmationResult,
  sendEmailLinkForSignIn,
  isEmailSignInLink,
  completeSignInWithEmailLink,
} from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

export type AuthMode = "guest" | "cloud";

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  mode: AuthMode;
  isLoading: boolean;
  continueAsGuest: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOutCompletely: () => Promise<void>;
  
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  startPhoneLogin: (fullPhoneNumber: string) => Promise<void>;
  verifyPhoneCode: (code: string) => Promise<void>;
  
  phoneLoginStage: "idle" | "code-sent" | "verifying";
  phoneTargetNumber: string | null;

  authError: string | null;
  clearAuthError: () => void;
  refreshKey: number;
  
  sendEmailLinkSignIn: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<AuthMode>("guest");
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // State for phone auth
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);
  const [phoneLoginStage, setPhoneLoginStage] = useState<"idle" | "code-sent" | "verifying">("idle");
  const [phoneTargetNumber, setPhoneTargetNumber] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const appUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName ?? "Unnamed user",
          email: firebaseUser.email ?? "",
        };
        setUser(appUser);
        setMode("cloud"); // Enforce cloud mode when user exists
      } else {
        setUser(null);
        // Only default to guest if we aren't already explicitly set to guest via user action,
        // but for simplicity, logged out = guest.
        setMode("guest");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Effect for handling email link sign-in on mount
  useEffect(() => {
    const maybeCompleteEmailLinkSignIn = async () => {
      try {
        if (typeof window === "undefined") return;
  
        const url = window.location.href;
        if (!isEmailSignInLink(url)) return;
  
        setIsLoading(true);
        setAuthError(null);
  
        await completeSignInWithEmailLink(url);
        setRefreshKey((prev) => prev + 1);
     } catch (error: any) {
        console.error("[Auth] Error completing email link sign-in", error);
        setAuthError(
          error?.message ?? "Email link sign-in failed. You can request a new link."
        );
      } finally {
        setIsLoading(false);
      }
    };
  
    maybeCompleteEmailLinkSignIn();
  }, []);

  const continueAsGuest = () => {
    setAuthError(null);
    if (mode === 'cloud') {
      signOutCompletely();
    } else {
      setUser(null);
      setMode("guest");
    }
  };

  const handleAuthAction = async (authFunction: () => Promise<any>) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await authFunction();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error(`[Auth] Sign-in error`, error);
      let message = "Sign-in failed. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') message = 'Sign-in cancelled.';
      else if (error.code === 'auth/email-already-in-use') message = 'That email is already in use.';
      else if (error.code === 'auth/wrong-password') message = 'Invalid password.';
      else if (error.code === 'auth/user-not-found') message = 'User not found.';
      else if (error.message) message = error.message;
      
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const signInWithGoogle = () => handleAuthAction(googleSignIn);
  const signInWithMicrosoft = () => handleAuthAction(microsoftSignIn);
  const signInWithApple = () => handleAuthAction(appleSignIn);

  const signUpWithEmail = (email: string, password: string) => 
    handleAuthAction(() => registerWithEmailAndPassword(email, password));

  const signInWithEmail = (email: string, password: string) => 
    handleAuthAction(() => loginWithEmailAndPassword(email, password));
    
  const sendEmailLinkSignIn = async (email: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await sendEmailLinkForSignIn(email);
    } catch (error: any) {
      console.error("[Auth] Email link send error", error);
      setAuthError(error?.message ?? "Failed to send sign-in link.");
    } finally {
      setIsLoading(false);
    }
  };

  const startPhoneLogin = async (fullPhoneNumber: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const confirmation = await startPhoneSignIn(fullPhoneNumber);
      setPhoneConfirmation(confirmation);
      setPhoneTargetNumber(fullPhoneNumber);
      setPhoneLoginStage("code-sent");
    } catch (error: any) {
      console.error("[Auth] Phone sign-in error", error);
      setAuthError(error?.message ?? "Failed to send verification code.");
      resetPhoneRecaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneCode = async (code: string) => {
    if (!phoneConfirmation) {
      setAuthError("Please request a verification code first.");
      return;
    }
    setAuthError(null);
    setIsLoading(true);
    setPhoneLoginStage("verifying");
    try {
      await confirmPhoneCode(phoneConfirmation, code);
      setPhoneLoginStage("idle");
      setPhoneConfirmation(null);
      resetPhoneRecaptcha();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error("[Auth] Phone code verification error", error);
      setAuthError(error?.message ?? "Invalid verification code.");
      setPhoneLoginStage("code-sent");
    } finally {
      setIsLoading(false);
    }
  };

  const signOutCompletely = async () => {
    setAuthError(null);
    setIsLoading(true);
    try {
      await signOutUser();
    } catch (error) {
      console.error("[Auth] Error during sign-out", error);
    } finally {
      setUser(null);
      setMode("guest");
      setRefreshKey(prev => prev + 1);
      setIsLoading(false);
      setPhoneConfirmation(null);
      setPhoneLoginStage("idle");
      resetPhoneRecaptcha();
    }
  };

  const value: AuthContextValue = {
    user,
    mode,
    isLoading,
    continueAsGuest,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithApple,
    signOutCompletely,
    signUpWithEmail,
    signInWithEmail,
    startPhoneLogin,
    verifyPhoneCode,
    phoneLoginStage,
    phoneTargetNumber,
    authError,
    clearAuthError: () => setAuthError(null),
    refreshKey,
    sendEmailLinkSignIn
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
