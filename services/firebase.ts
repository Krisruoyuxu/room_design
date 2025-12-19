
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  ApplicationVerifier,
  UserCredential,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  ActionCodeSettings
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config for my Room-Design-AI project
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBjlhwF-vp8LiiGhZWObs--4FU73EHPFXI",
  authDomain: "room-design-ai-83d34.firebaseapp.com",
  projectId: "room-design-ai-83d34",
  storageBucket: "room-design-ai-83d34.firebasestorage.app",
  messagingSenderId: "240661022230",
  appId: "1:240661022230:web:b42ec3d9be28a535299737",
  measurementId: "G-JEKRVJHLPP"
};

// Initialize Firebase (single app instance for the whole project)
const app = initializeApp(firebaseConfig);

// Analytics removed due to import issues in some environments
// if (typeof window !== 'undefined') {
//   getAnalytics(app);
// }

// Export Auth instance and providers
export const auth = getAuth(app);
// Export Firestore (needed for saving designs in this app)
export const db = getFirestore(app);

// Google provider
export const googleProvider = new GoogleAuthProvider();

// Microsoft provider
export const microsoftProvider = new OAuthProvider("microsoft.com");

// Apple provider
export const appleProvider = new OAuthProvider("apple.com");

// Simple helper functions for sign-in / sign-out
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithMicrosoft(): Promise<User> {
  const result = await signInWithPopup(auth, microsoftProvider);
  return result.user;
}

export async function signInWithApple(): Promise<User> {
  const result = await signInWithPopup(auth, appleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// --- New Auth Methods ---

export async function registerWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

// Singleton for ReCAPTCHA
let phoneRecaptchaVerifier: RecaptchaVerifier | null = null;

export const getPhoneRecaptchaVerifier = (): RecaptchaVerifier => {
  if (!phoneRecaptchaVerifier) {
    phoneRecaptchaVerifier = new RecaptchaVerifier(auth, "phone-recaptcha-container", {
      size: "invisible",
    });
  }
  return phoneRecaptchaVerifier;
};

export async function startPhoneSignIn(phoneNumber: string): Promise<ConfirmationResult> {
  const appVerifier = getPhoneRecaptchaVerifier();
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

export const resetPhoneRecaptcha = () => {
  if (phoneRecaptchaVerifier) {
    phoneRecaptchaVerifier.clear();
    phoneRecaptchaVerifier = null;
  }
};

export async function confirmPhoneCode(confirmationResult: ConfirmationResult, code: string): Promise<UserCredential> {
  return confirmationResult.confirm(code);
}

// --- Email Link Auth Methods ---

const emailLinkActionCodeSettings: ActionCodeSettings = {
  // Always send users back to the same origin they started from.
  url: typeof window !== "undefined" ? window.location.origin : "",
  handleCodeInApp: true,
};

const EMAIL_FOR_SIGN_IN_KEY = "emailForSignIn";

export async function sendEmailLinkForSignIn(email: string): Promise<void> {
  if (!email) {
    throw new Error("Email is required");
  }
  if (typeof window === "undefined") {
    throw new Error("Email link sign-in is only supported in the browser.");
  }

  await sendSignInLinkToEmail(auth, email, emailLinkActionCodeSettings);
  window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
}

export function isEmailSignInLink(url: string): boolean {
  if (typeof window === "undefined") return false;
  return isSignInWithEmailLink(auth, url);
}

export async function completeSignInWithEmailLink(
  url: string
): Promise<User> {
  if (typeof window === "undefined") {
    throw new Error("Email link sign-in is only supported in the browser.");
  }

  let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
  if (!email) {
    email =
      window.prompt("Please confirm your email address to finish sign-in.") ||
      "";
  }
  if (!email) {
    throw new Error("Email is required to complete sign-in.");
  }

  const result = await signInWithEmailLink(auth, email, url);
  window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  return result.user;
}

export { RecaptchaVerifier };
export type { ConfirmationResult };
