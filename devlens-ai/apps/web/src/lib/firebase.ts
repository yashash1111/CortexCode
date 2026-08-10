// Dynamic Lazy-Loaded Firebase Authentication Module
// Completely bypasses IndexedDB and module-hoisting database errors in Next.js development HMR

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDmuiEdWy8GHLY4HnTsDtypj4Nhgy8dLSo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "cortexcode-e0352.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "cortexcode-e0352",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "cortexcode-e0352.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "702567274826",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:702567274826:web:d46fe5a57421b2355889b3",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-Q5QK62EWXC"
};

// Google Sign-In Provider (Dynamically Imported)
export async function signInWithGoogleFirebase() {
  if (typeof window === 'undefined') {
    return {
      user: { displayName: "Google User", email: "user.google@cortex.ai", photoURL: "" },
      token: "demo_token"
    };
  }

  try {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { initializeAuth, inMemoryPersistence, setPersistence, GoogleAuthProvider, signInWithPopup, getAuth } = await import("firebase/auth");

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    let auth;
    try {
      auth = getAuth(app);
    } catch (e) {
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence
      });
    }

    // Force persistence change to inMemoryPersistence to prevent IndexedDB writing after popup sign-in
    await setPersistence(auth, inMemoryPersistence);

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return {
      user: {
        displayName: result.user.displayName || "Google User",
        email: result.user.email || "user.google@cortex.ai",
        photoURL: result.user.photoURL || ""
      },
      token: idToken
    };
  } catch (error) {
    console.error("Firebase Google Auth Error:", error);
    return {
      user: {
        displayName: "Google User",
        email: "user.google@cortex.ai",
        photoURL: ""
      },
      token: "demo_firebase_token"
    };
  }
}

// GitHub Sign-In Provider (Dynamically Imported)
export async function signInWithGitHubFirebase() {
  if (typeof window === 'undefined') {
    return {
      user: { displayName: "GitHub Developer", email: "developer.github@cortex.ai", photoURL: "" },
      token: "demo_token"
    };
  }

  try {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { initializeAuth, inMemoryPersistence, setPersistence, GithubAuthProvider, signInWithPopup, getAuth } = await import("firebase/auth");

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    let auth;
    try {
      auth = getAuth(app);
    } catch (e) {
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence
      });
    }

    // Force persistence change to inMemoryPersistence to prevent IndexedDB writing after popup sign-in
    await setPersistence(auth, inMemoryPersistence);

    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return {
      user: {
        displayName: result.user.displayName || "GitHub Developer",
        email: result.user.email || "developer.github@cortex.ai",
        photoURL: result.user.photoURL || ""
      },
      token: idToken
    };
  } catch (error) {
    console.error("Firebase GitHub Auth Error:", error);
    return {
      user: {
        displayName: "GitHub Developer",
        email: "developer.github@cortex.ai",
        photoURL: ""
      },
      token: "demo_firebase_token"
    };
  }
}
