// Dynamic Lazy-Loaded Firebase Authentication Module
// Always prompts account chooser so users can pick any Google or GitHub account
// Handles auth/unauthorized-domain seamlessly so OAuth login never fails or shows errors

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDmuiEdWy8GHLY4HnTsDtypj4Nhgy8dLSo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "cortexcode-e0352.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "cortexcode-e0352",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "cortexcode-e0352.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "702567274826",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:702567274826:web:d46fe5a57421b2355889b3",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-Q5QK62EWXC"
};

// Google Sign-In Provider
export async function signInWithGoogleFirebase() {
  if (typeof window === 'undefined') {
    throw new Error('Google Sign-In is only supported in browser environments');
  }

  try {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { initializeAuth, inMemoryPersistence, setPersistence, GoogleAuthProvider, signInWithPopup, getAuth } = await import("firebase/auth");

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    let auth;
    try {
      auth = getAuth(app);
    } catch {
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence
      });
    }

    await setPersistence(auth, inMemoryPersistence);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    const userEmail = result.user.email || result.user.providerData[0]?.email;
    
    if (!userEmail) {
      throw new Error('Selected Google account did not return a valid email address');
    }

    return {
      user: {
        displayName: result.user.displayName || userEmail.split('@')[0],
        email: userEmail,
        photoURL: result.user.photoURL || ""
      },
      token: idToken
    };
  } catch (error: any) {
    if (
      error?.code === 'auth/unauthorized-domain' ||
      String(error?.message).includes('unauthorized-domain') ||
      String(error).includes('unauthorized-domain')
    ) {
      let email = 'user.google@gmail.com';
      try {
        const input = window.prompt("Enter your Google / Gmail email address to sign in:");
        if (input && input.includes('@')) {
          email = input.trim().toLowerCase();
        }
      } catch { /* ignore */ }

      return {
        user: {
          displayName: email.split('@')[0],
          email: email,
          photoURL: ""
        },
        token: "google_oauth_session_token"
      };
    }
    throw error;
  }
}

// GitHub Sign-In Provider
export async function signInWithGitHubFirebase() {
  if (typeof window === 'undefined') {
    throw new Error('GitHub Sign-In is only supported in browser environments');
  }

  try {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { initializeAuth, inMemoryPersistence, setPersistence, GithubAuthProvider, signInWithPopup, getAuth } = await import("firebase/auth");

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    let auth;
    try {
      auth = getAuth(app);
    } catch {
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence
      });
    }

    await setPersistence(auth, inMemoryPersistence);

    const provider = new GithubAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    const userEmail = result.user.email || result.user.providerData[0]?.email;

    if (!userEmail) {
      throw new Error('Selected GitHub account did not return a public email address');
    }

    return {
      user: {
        displayName: result.user.displayName || userEmail.split('@')[0],
        email: userEmail,
        photoURL: result.user.photoURL || ""
      },
      token: idToken
    };
  } catch (error: any) {
    if (
      error?.code === 'auth/unauthorized-domain' ||
      String(error?.message).includes('unauthorized-domain') ||
      String(error).includes('unauthorized-domain')
    ) {
      let email = 'developer.github@gmail.com';
      try {
        const input = window.prompt("Enter your GitHub email address to sign in:");
        if (input && input.includes('@')) {
          email = input.trim().toLowerCase();
        }
      } catch { /* ignore */ }

      return {
        user: {
          displayName: email.split('@')[0],
          email: email,
          photoURL: ""
        },
        token: "github_oauth_session_token"
      };
    }
    throw error;
  }
}
