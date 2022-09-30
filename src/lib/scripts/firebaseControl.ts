// stores all the firebase information
import { writable } from "svelte/store";

import { getAuth, GoogleAuthProvider, type Auth } from "@firebase/auth";
import { getFirestore, type Firestore } from "@firebase/firestore";
import { initializeApp, type FirebaseApp } from "@firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "@firebase/app-check";
import type { FirebaseStore } from "./interfaces";

const firebaseConfig = {
	apiKey: "AIzaSyBju0BauM5mUkAZAHQpd49wRYJ9o_CxfJA",
	authDomain: "drivetransfercode.firebaseapp.com",
	projectId: "drivetransfercode",
	storageBucket: "drivetransfercode.appspot.com",
	messagingSenderId: "699674619494",
	appId: "1:699674619494:web:f2e1b8a22cd582d2f487a7",
	measurementId: "G-MJLB6X0X45"
};

const app: FirebaseApp = initializeApp(firebaseConfig);

let settingUpAuth = true;
while (settingUpAuth) {
	try {
		initializeAppCheck(app, {
			provider: new ReCaptchaV3Provider(
				"6LcMb-0hAAAAAMqwbbRT3JQsInSYCHkdParAitCm"
			),
			isTokenAutoRefreshEnabled: true
		});
		settingUpAuth = false;
	} catch (err) {
		// don't
	}
}

const firestore: Firestore = getFirestore(app);

const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();

provider.addScope("https://www.googleapis.com/auth/drive.file");

export default writable<FirebaseStore>({
	app: app,
	auth: auth,
	GoogleAuthProvider: provider,
	firestore: firestore,
	firebaseConfig: firebaseConfig
});
