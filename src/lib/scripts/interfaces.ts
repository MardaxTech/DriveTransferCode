import type { FirebaseApp } from "@firebase/app";
import type { Firestore } from "@firebase/firestore";
import type { Auth, GoogleAuthProvider } from "@firebase/auth";

interface FirebaseConfig {
	apiKey: string;
	authDomain: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;
	appId: string;
	measurementId: string;
}

interface FirebaseStore {
	app: FirebaseApp;
	auth: Auth;
	GoogleAuthProvider: GoogleAuthProvider;
	firestore: Firestore;
	firebaseConfig: FirebaseConfig;
}

export type { FirebaseStore };
