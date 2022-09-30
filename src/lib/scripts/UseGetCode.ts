import type { Auth, AuthProvider, UserCredential } from "@firebase/auth";
import type { FirebaseStore } from "./interfaces";
import type { CollectionReference, DocumentData, DocumentReference, DocumentSnapshot, Firestore, QuerySnapshot } from "@firebase/firestore";
import firebaseControl from "./firebaseControl";
import changeView from "$lib/scripts/viewManager";
import type { Analytics, AnalyticsCallOptions, Item } from "@firebase/analytics";
import type { FirebaseApp } from "@firebase/app";

let firebaseControlStore: FirebaseStore;

firebaseControl.subscribe((data: FirebaseStore) => {
	firebaseControlStore = data;
});

// imported functions
let signInWithPopup: (auth: Auth, provider: AuthProvider) => Promise<UserCredential>;
let deleteDoc: (docRef: DocumentReference) => Promise<void>;
let collection: (firestore: Firestore, collectionPath: string) => CollectionReference<DocumentData>;
let getDocs: (query: CollectionReference<DocumentData>) => Promise<QuerySnapshot<DocumentData>>;
let serverTimestamp: () => unknown;
let setDoc: (docRef: DocumentReference, data: unknown) => Promise<void>;
let doc: (firestore: Firestore, path: string, ...pathSegments: string[]) => DocumentReference<DocumentData>;
let getDoc: (reference: DocumentReference<unknown>) => Promise<DocumentSnapshot<unknown>>;
let logEvent: (analyticsInstance: Analytics, eventName: string, eventParams?: {
	[key: string]: unknown;
	coupon?: string | undefined;
	currency?: string | undefined;
	items?: Item[] | undefined;
	payment_type?: string | undefined;
	value?: number | undefined;
} | undefined, options?: AnalyticsCallOptions | undefined) => void;
let getAnalytics: (app?: FirebaseApp | undefined) => Analytics;
let sha512: (message: string) => string;

async function getAnalyticsInstance() {
	if(!logEvent || !getAnalytics) {
		const analytics = (await import("@firebase/analytics"));
		logEvent = analytics.logEvent;
		getAnalytics = analytics.getAnalytics;
	}
}

const loadingScreen = ["Loading"];
const SignedIn = [
	"SignedIn", "Action"
];
const SignIn = ["SignIn"];
const Finished = [
	"Done", "Action"
];

const FinishedTimeOut = 3000;
const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@&/-"; // 41 characters

function finishLoading(message?: string) {
	changeView(Finished);

	if(message) {
		const FinischedText = document.getElementById("FinischedText");
		if (FinischedText) FinischedText.innerHTML = message;
	}

	setTimeout(() => {
		firebaseControlStore.auth.currentUser
			? changeView(SignedIn)
			: changeView(SignIn);
	}, FinishedTimeOut);
}

// generates 8 character base41 code (41 characters, 41^8 = 7.984.925.229.121 possible codes)
function generateCode(): string {
	let code = "";

	for (let i = 0, n = charset.length; i < 8; ++i) {
		code += charset.charAt(Math.floor(Math.random() * n));
	}

	return code;
}

// if the token is valid enough, it will be accepted. if not the user will have to sign in again
async function getToken() {

	// Oauth token still valid enough?
	if (parseInt(localStorage.getItem("oauthExpireTime") ?? "0") - new Date().getTime() / 1000 >= 65) {
		return localStorage.getItem("token");
	} else {
		if (!signInWithPopup) signInWithPopup = (await import("@firebase/auth")).signInWithPopup;

		try {
			const userCreds = (await signInWithPopup(firebaseControlStore.auth, firebaseControlStore.GoogleAuthProvider));

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			const token = userCreds._tokenResponse;

			if (token) {
				localStorage.setItem("token", token.oauthAccessToken);
				localStorage.setItem("oauthExpireTime", (new Date().getTime() / 1000 + token.oauthExpireIn));

				return token.oauthAccessToken;
			} else {
				throw new Error("No token in userCreds");
			}
		} catch (e) {
			console.log(e);
			changeView(SignIn);
			firebaseControlStore.auth.signOut();
			alert("Unable to authenticate with Google. Please try again.");
			return null;
		}
	}
}

// clear all codes from the database
async function clearCodes(email: string) {
	const deleteDocTemp = import("@firebase/firestore");
	if (!collection) collection = (await import("@firebase/firestore")).collection;
	if (!getDocs) getDocs = (await import("@firebase/firestore")).getDocs;

	const user = collection(firebaseControlStore.firestore, `keys/${email}/tokens`);
	const tokens = getDocs(user);

	deleteDoc = (await deleteDocTemp).deleteDoc;

	(await tokens).forEach(tokenDoc => {
		deleteDoc(tokenDoc.ref);
	});
}

// renames a file on google drive by its id
async function renameFile(fileId: string, newName: string, token: string) {
	const optionsRename = {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + token
		},
		body: `{name: "${newName}"}`
	};

	await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, optionsRename)
		.catch(err => { console.error(err); alert("Error naming you file, you should be able to find in under the name 'Untitled'"); });
}

// returns a code that the user can use to upload a file to google drive form another device
async function UploadWCode(): Promise<string> {
	changeView(loadingScreen);
	const code = generateCode();

	const token = await getToken();
	const email = firebaseControlStore.auth.currentUser?.email;

	try {
		if (!token || !email) { // not signed in
			firebaseControlStore.auth.signOut();
			window.location.reload();
		} else {
			await clearCodes(email);

			if (!doc) doc = (await import("@firebase/firestore")).doc;
			if (!sha512) sha512 = (await import("js-sha512")).sha512;

			const file = doc(firebaseControlStore.firestore, `keys/${email}/tokens/${sha512(code)}`);

			if (!serverTimestamp) serverTimestamp = (await import("@firebase/firestore")).serverTimestamp;
			if (!setDoc) setDoc = (await import("@firebase/firestore")).setDoc;

			setDoc(file, {
				uploadTime: serverTimestamp(),
				token: token
			});

			await getAnalyticsInstance();
			logEvent(getAnalytics(firebaseControlStore.app), "uploadWCode", {});
		}
	} catch {
		window.location.reload();
	}

	try {
		navigator.clipboard.writeText(code);
	} catch {
		console.log("Unable to copy code to clipboard");
	}

	return code;
}

// returns download code that the user can use to download the uploaded file with
async function DownloadWCode(files: FileList): Promise<string> {
	changeView(loadingScreen);
	const code = generateCode();
	const email = firebaseControlStore.auth.currentUser?.email;

	if (!email) { // can't be logged in
		firebaseControlStore.auth.signOut();
		window.location.reload();
		return "";
	}

	const token = await getToken();
	if (!token) return ""; // can't be logged in

	const urls: string[] = [];
	const filenames: string[] = [];

	for (let i = 0; i < files.length; i++) {
		if(files[i]) {
			const file = files[i];

			const optionsUpload = {
				method: 'POST',
				headers: {
					'Content-Type': file.type ?? 'application/octet-stream',
					'Content-Length': file.size.toString(),
					Authorization: 'Bearer ' + token,
				},
				body: file
			};

			let fileId = "";

			await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', optionsUpload)
				.then(async response => {
					fileId = (await response.json()).id;

					await clearCodes(email);

					urls.push(`https://www.googleapis.com/drive/v2/files/${fileId}?alt=media&source=downloadUrl`);

					filenames.push(file.name);

					if (file.name !== "Untitled") {
						renameFile(fileId, file.name, token);
					}
				})
				.catch(err => { console.error(err); alert("Something went wrong, please try again later.");});
		}
		await getAnalyticsInstance();

		logEvent(getAnalytics(firebaseControlStore.app), "downloadWCode", {});
	}

	if (!doc) doc = (await import("@firebase/firestore")).doc;
	if (!serverTimestamp) serverTimestamp = (await import("@firebase/firestore")).serverTimestamp;
	if (!setDoc) setDoc = (await import("@firebase/firestore")).setDoc;

	if (!sha512) sha512 = (await import("js-sha512")).sha512;
	await setDoc(doc(firebaseControlStore.firestore, `keys/${firebaseControlStore.auth.currentUser?.email}/tokens/${sha512(code)}`), {
		uploadTime: serverTimestamp(),
		urls: urls,
		options: {
			method: 'GET',
			headers: {
				Authorization: 'Bearer ' + token
			}
		},
		filenames: filenames
	});

	try {
		navigator.clipboard.writeText(code);
	} catch {
		console.log("Unable to copy code to clipboard");
	}

	return code;
}

// takes the code and email and either downloads the file or prompts the user to upload a file
async function UseCode(inputCode: string, inputEmail: string) {
	await getAnalyticsInstance();

	logEvent(getAnalytics(firebaseControlStore.app), "usedCode", {});

	inputCode = inputCode.toUpperCase().replace(new RegExp(`[^${[charset].join('')}]`, 'g'), '');

	// validate input
	if(inputCode.length !== 8 || inputCode === "" || inputEmail === "") { // invalid input
	    if (inputCode.length !== 8) {
			const codeInput = document.getElementById("codeinput");
			if (codeInput) codeInput.style.outline = "2px solid red";
			alert("Invalid code");
			return;
		} if (!(RegExp(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/).test(inputEmail))) {
	    	const emailinput = document.getElementById("emailInput");
	    	if (emailinput) emailinput.style.outline = "2px solid red";
	    } else {
	    	alert("Invalid email");
			return;
	    }
		alert("Invalid email or code");
		return;
	} else { // valid input
		try {
			if (!getDoc) getDoc = (await import("@firebase/firestore")).getDoc;
			if (!deleteDoc) deleteDoc = (await import("@firebase/firestore")).deleteDoc;
			if (!doc) doc = (await import("@firebase/firestore")).doc;
			if (!sha512) sha512 = (await import("js-sha512")).sha512;
			const file = doc(firebaseControlStore.firestore, `keys/${inputEmail}/tokens/${sha512(inputCode)}`);
			const data = (await getDoc(file)).data();

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			if(!data.token) { // download code
				changeView(loadingScreen);
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				const urls = data?.urls;
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				const options = data?.options;
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				const fileNames = data?.filenames;

				if (urls.length !== fileNames.length) alert("Upload corrupted, please try re-uploading it.");

				for (let index = 0; index < urls.length; index++) {
					const fileName = fileNames[index];
					const url = urls[index];

					if(!url || !options || !fileName) {
						alert("Invalid code");
						return;
					} else {
						fetch(url, options)
							.then(response => response.blob())
							.then(async blob => {
								const link = document.createElement("a");
								link.href = window.URL.createObjectURL(blob);
								link.setAttribute("download", fileName);
								document.body.appendChild(link);
								link.click();
								link.remove();
								finishLoading();
								return;
							})
							.catch(err => console.error(err
							));
					}
				}
			} else { // upload code
				let fileInput: HTMLInputElement;
				if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) { // mobile
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					fileInput = document.getElementById("mobile-file-input");

					changeView(["fileInput"]);
				} else { // desktop
					fileInput = document.createElement('input');
					fileInput.type = 'file';
					fileInput.multiple = true;
					fileInput.click();
				}

				fileInput.onchange = async e => {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					if (!e.target?.files[0]) {alert("Please select a file to upload");}
					else {
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						const files: FileList = e.target?.files;
						for (let i = 0; i < files.length; i++) {
							const file = files[i];

							changeView(loadingScreen);

							const optionsUpload = {
								method: 'POST',
								headers: {
									'Content-Type': file.type ?? 'application/octet-stream',
									'Content-Length': file.size.toString(),
									// eslint-disable-next-line @typescript-eslint/ban-ts-comment
									// @ts-ignore
									Authorization: 'Bearer ' + data.token,
								},
								body: file
							};

							fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', optionsUpload)
								.then(async response => {
									if (file.name !== "Untitled") {
										const fileId = (await response.json()).id ?? "";

										// eslint-disable-next-line @typescript-eslint/ban-ts-comment
										// @ts-ignore

										await renameFile(fileId, file.name, data.token);

										finishLoading();
										return;
									}
								})
								.catch(err => { console.error(err); alert("Something went wrong, please try again later");});
						}
					}
				};
			}

			try {
				deleteDoc(file);
			} catch {
				return;
			}
		} catch (Error) {
			return Error;
		}
	}
}

export { UploadWCode, DownloadWCode, UseCode, charset };