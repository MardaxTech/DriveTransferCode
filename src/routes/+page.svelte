<script lang="ts">
	import firebaseControl from "$lib/scripts/firebaseControl";
	import { onAuthStateChanged } from "@firebase/auth";
	import { onMount } from "svelte";
	import type { Auth, AuthProvider, UserCredential } from "@firebase/auth";
	import type { FirebaseStore } from "$lib/scripts/interfaces";
	import changeView from "$lib/scripts/viewManager";
	import type { Analytics, AnalyticsCallOptions, Item } from "@firebase/analytics";
	import type { FirebaseApp } from "@firebase/app";

	let DownloadWCode: (files: FileList) => Promise<string>;
	let UploadWCode: () => Promise<string>;
	let UseCode: (inputCode: string, inputEmail: string) => Promise<unknown>;
	let signInWithPopup: (auth: Auth, provider: AuthProvider) => Promise<UserCredential>;
	let logEvent: (analyticsInstance: Analytics, eventName: string, eventParams?: {
		[key: string]: any;
		coupon?: string | undefined;
		currency?: string | undefined;
		items?: Item[] | undefined;
		payment_type?: string | undefined;
		value?: number | undefined;
	} | undefined, options?: AnalyticsCallOptions | undefined) => void;
	let getAnalytics: (app?: FirebaseApp | undefined) => Analytics;

	let charset: string;

	let inputCode: string = "";
	let inputEmail: string = "";

	const emailSize = 4;

	let darkmode = true;

	let code: string = "";

	let actionImage: string;

	let firebaseControlStore: FirebaseStore;

	firebaseControl.subscribe((data: FirebaseStore) => {
		firebaseControlStore = data;
	});

	let currectMenu: "signin" | "Signedin" | "code" | "download" | "loading" | "done" = "signin";

	let emailInput: HTMLElement | null;
	let codeInput: HTMLElement | null;

	function showSignIn() {
		changeView(["SignIn"]);
		currectMenu = "signin";
	}

	function showSignedIn() {
		changeView(["SignedIn", "Action"]);
		currectMenu = "Signedin";
		actionImage = "/SignOut.svg";
	}

	async function showCode() {
		changeView(["Code", "Action"]);
		currectMenu = "code";
		actionImage = "/Back.svg";
		if(!logEvent || !getAnalytics) {
		const analytics = (await import("@firebase/analytics"));
			logEvent = analytics.logEvent;
			getAnalytics = analytics.getAnalytics;
		}
		logEvent(getAnalytics(firebaseControlStore.app), "generated_code", {});
	}

	async function showDownload() {
		changeView(["Download", "Action"]);

		if (!charset) charset = (await import("$lib/scripts/UseGetCode")).charset;

		inputCode = "";
		inputEmail = firebaseControlStore.auth.currentUser?.email || "";

		if (emailInput) {
			emailInput.style.fontSize = `${emailSize - inputEmail.length/12.25}vw`;

			if (inputEmail) emailInput.style.outline = "2px solid green";
		}

		currectMenu = "download";

		actionImage = "/Back.svg";

		if(!logEvent || !getAnalytics) {
			const analytics = (await import("@firebase/analytics"));
			logEvent = analytics.logEvent;
			getAnalytics = analytics.getAnalytics;
		}
		logEvent(getAnalytics(firebaseControlStore.app), "opened_download", {});
	}

	function checkLoggedIn() {
		if(firebaseControlStore.auth.currentUser) showSignedIn();
		else showSignIn();
	}

	onMount(async () => {
		applyStoredTheme();

		onAuthStateChanged(firebaseControlStore.auth, () => {
			checkLoggedIn();
		});

		
		emailInput = document.getElementById("emailInput");
		codeInput = document.getElementById("codeInput");
	});

	function applyStoredTheme() {
		const stored = localStorage.getItem("theme") ?? "dark";
		darkmode = stored === "dark";

		if (stored === "dark") {
			window.document.body.classList.remove("dark-mode");
		} else {
			window.document.body.classList.add("dark-mode");
		}
	}

	async function toggle() {
		const stored = localStorage.getItem("theme") ?? "dark";

		localStorage.setItem("theme", stored === "dark" ? "light" : "dark");

		window.document.body.classList.toggle("dark-mode");

		if(!logEvent || !getAnalytics) {
			const analytics = (await import("@firebase/analytics"));
			logEvent = analytics.logEvent;
			getAnalytics = analytics.getAnalytics;
		}
		logEvent(getAnalytics(firebaseControlStore.app), "toggledTheme", {darkmode: stored === "dark" ? "light" : "dark"});
	}

	function ActionButton() {
		if (currectMenu === "Signedin") {
			firebaseControlStore.auth.signOut();
			localStorage.clear()
			showSignIn();
		} else {
			if (firebaseControlStore.auth.currentUser) showSignedIn();
			else showSignIn();
		}
	}

	let files: FileList
</script>

<div id="topBar">
	<img
		style="display:none"
		draggable="false"
		src={actionImage}
		id="Action"
		alt="action"
		on:click={ActionButton}
	/>
	<img
		src={darkmode ? "/DriveTransferCode-Dark.png" : "/DriveTransferCode-Light.png"}
		class="logo"
		alt="DriveTransferCode"
		draggable="false"
	/>
</div>

<div id="wrapper">
	<div id="SignIn" style="display:none">
		<button
		id="googleButton"
		on:click={async () => {
			let gettingCreds = true
			while (gettingCreds) {
				if (!signInWithPopup) signInWithPopup = (await import("@firebase/auth")).signInWithPopup
				const userCreds = (await signInWithPopup(firebaseControlStore.auth, firebaseControlStore.GoogleAuthProvider))
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				const token = userCreds._tokenResponse ?? null
				if (token) {
					localStorage.setItem("token", token.oauthAccessToken);
					localStorage.setItem("oauthExpireTime", new Date().getTime() / 1000 + token.oauthExpireIn);
					gettingCreds = false
				} else {
					alert("Error getting token, please try again")
				}
			}
		}}>
			<div id="google">
			</div>
			<h1>
				<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path fill-rule="evenodd" clip-rule="evenodd" d="M22.77 12.2614C22.77 11.4459 22.6968 10.6618 22.5609 9.90909H11.73V14.3575H17.9191C17.6525 15.795 16.8423 17.013 15.6243 17.8284V20.7139H19.3409C21.5154 18.7118 22.77 15.7636 22.77 12.2614Z" fill="#4285F4" />
					<path fill-rule="evenodd" clip-rule="evenodd" d="M11.7299 23.4998C14.8349 23.4998 17.4382 22.4702 19.3409 20.7139L15.6243 17.8284C14.5945 18.5184 13.2772 18.926 11.7299 18.926C8.73467 18.926 6.19944 16.903 5.29513 14.1848H1.45308V17.1644C3.34535 20.9228 7.23444 23.4998 11.7299 23.4998Z" fill="#34A853" />
					<path fill-rule="evenodd" clip-rule="evenodd" d="M5.29513 14.1848C5.06513 13.4948 4.93453 12.758 4.93453 12.0001C4.93453 11.2421 5.06521 10.5051 5.29521 9.81506V6.83552H1.45316C0.674299 8.38802 0.22998 10.1444 0.22998 12.0001C0.22998 13.8557 0.674217 15.6119 1.45308 17.1644L5.29513 14.1848Z" fill="#FBBC05" />
					<path fill-rule="evenodd" clip-rule="evenodd" d="M11.7299 5.07386C13.4183 5.07386 14.9342 5.65409 16.126 6.79364L19.4244 3.49523C17.4329 1.63955 14.8297 0.5 11.7299 0.5C7.23445 0.5 3.34544 3.07711 1.45316 6.83552L5.29521 9.81506C6.19953 7.09688 8.73467 5.07386 11.7299 5.07386Z" fill="#EA4335" />
				</svg>
				Signin with google
			</h1>
		</button>

		<button title="Use your code" on:click={showDownload} id="UseCodeButton">
			<h1>Use Code</h1>
		</button>
	</div>
	<div id="SignedIn" style="display:none">	
		<button title="Get a code that you can use on another device to upload a file to your google drive" on:click={async () => {
			if (!UploadWCode) UploadWCode = (await import("$lib/scripts/UseGetCode")).UploadWCode; 
			code = await UploadWCode();
			showCode();
			}} id="UploadCodeButton">
			<h1>Upload Code</h1>
		</button>
		<button id="DownloadCodeButton">
			<label for="file-input">
				<h1 style="cursor: pointer;" title="Get a code that you can use on another device to download the file you upload">Download Code</h1>
			</label>
		
			<input id="file-input" type="file" bind:files={files} on:change={async () => {
				if(files.length >= 1) {
					if (!DownloadWCode) DownloadWCode = (await import("$lib/scripts/UseGetCode")).DownloadWCode;
					code = await DownloadWCode(files);
					showCode();
				}
			}} style="display: none" multiple/>
		</button>
		<button title="Use your code" on:click={showDownload} id="UseCodeButton">
			<h1>Use Code</h1>
		</button>
	</div>
	<div id="Code" class="animate-bottom" style="display:none">
		<h1>{code}</h1>
	</div>
	<div id="Download" style="display:none">
		<input placeholder="john@doe.com" id="emailInput" type="email" bind:value={inputEmail} maxlength="28" on:input={() => {if (emailInput) {emailInput.style.fontSize = `${emailSize - inputEmail.length/12.25}vw`; emailInput.style.outline = RegExp(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/).test(inputEmail) ? "2px solid green" : "none"}}} />
		<input style="text-transform:uppercase" autocomplete="off" placeholder="code" id="codeInput" type="text" bind:value={inputCode} maxlength="8" on:input={() => {inputCode = inputCode.toUpperCase().replace(new RegExp(`[^${[charset].join('')}]`, 'g'), ''); if (codeInput) codeInput.style.outline = inputCode.length == 8 ? "2px solid green" : "none"}} />

		<img draggable="false" src="/Drive.png" alt="upload" title="Upload your file" on:click={async () => {
			if (!UseCode) UseCode = (await import("$lib/scripts/UseGetCode")).UseCode;
			const result = await UseCode(inputCode, inputEmail);
			if (result) { alert("Incorrect code or email"); }}} />
	</div>
	<div id="Loading" style="display:none">
	</div>
	<div id="Done" class="animate-bottom" style="display:none">
		<h1 id="FinischedText">Success!</h1>
	</div>
	<div id="Error" style="display:none"></div>
	<div id="fileInput" style="display:none">
		<h1 id="uploadTitle">Press to upload</h1>
		<button id="uploadFile">
			<label for="mobile-file-input">
				<img style="cursor: pointer;" draggable="false" src="/Drive.png" alt="upload" />
			</label>
		
			<input id="mobile-file-input" type="file" bind:files={files} style="display: none" multiple/>
		</button>
	</div>
</div>

<label class="switch">
	<input type="checkbox" bind:checked={darkmode} on:change={toggle} />
	<span class="slider round" />
</label>

<style lang="scss">
	$dark-background: #292929;
	$light-background: #ffffff;

	#fileInput {
		#uploadFile {
			background-color: transparent;
			border: none;
			margin: 0;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			height: 6vw;
		}
		#uploadTitle {
			font-size: 5vmin;
			color: white;
			text-align: center;
			margin: 0;
			position: absolute;
			top: 40%;
			left: 50%;
			transform: translate(-50%, -50%);
		}

		img {
			position: absolute;
			top: 15vmin;
			left: 50%;
			width: 35vmin;
			transform: translate(-50%, -50%);
			cursor: pointer;
		}
	}

	#Loading {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 1;
		width: 120px;
		height: 120px;
		margin: -76px 0 0 -76px;
		border: 16px solid #f3f3f3;
		border-radius: 50%;
		border-top: 16px solid #3498db;
		-webkit-animation: spin 2s linear infinite;
		animation: spin 2s linear infinite;
	}
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@-webkit-keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.logo {
		position: absolute;
		left: 50%;
		right: 50%;
		transform: translate(-50%, -50%);
		height: 7vw;
		margin-top: 7vh;
	}

	#Action {
		position: absolute;
		left: 6vw;
		right: 95%;
		transform: translate(-50%, -50%);
		height: 6vw;
		margin-top: 7vh;
		cursor: pointer;
	}

	#UploadCodeButton, #DownloadCodeButton, #UseCodeButton, #googleButton {
		box-shadow: 3px 3px 3px gray;
		border-radius: 4.84px;
		left: 50%;
		right: 50%;
		transform: translate(-50%, -50%);
		width: 40vmin;
		height: 10vmin;
		border: none;

		h1 {
			text-align: center;
			vertical-align: middle;
			line-height: 8%;
			user-select: none;
			margin: 0;
			font-size: 3.5vmin;
		}
	}

	#googleButton {
		cursor: pointer;
		position: absolute;
		top: 50%;
		bottom: 50%;
		width: 45vmin;
		height: 10vmin;

		h1 {
			text-align: right;
			vertical-align: middle;
			top: 40%;
			bottom: 50%;
			user-select: none;
			margin: 0;
			font-size: 3.5vmin;
			padding-right: 1%;

			svg {
				position: absolute;
				left: 10%;
				right: 40%;
				transform: translate(-50%, -50%);
				padding-left: 1%;
				width: 12%;
			}
		}
	}

	#UploadCodeButton {
		cursor: pointer;
		position: absolute;
		top: 30%;
		bottom: 70%;
	}

	#DownloadCodeButton {
		position: absolute;
		top: 50%;
		bottom: 50%;
	}

	#UseCodeButton {
		cursor: pointer;
		position: absolute;
		top: 70%;
		bottom: 40%;
	}

	#UploadCodeButton:hover, #DownloadCodeButton:hover, #UseCodeButton:hover, #googleButton:hover {
		opacity: 0.9;
		h1 {
			font-size: 3.7vmin;
		}
	}

	:global(body) {
		background-color: $dark-background;
		color: $light-background;
		transition: 0.2s;
		user-select: none;

		#UploadCodeButton, #DownloadCodeButton, #UseCodeButton, #googleButton {
			background-color: #575757;
			color: #ffffff;
		}

		#Action {
			-webkit-filter: invert(100%);
    		filter: invert(100%);
		}
	}

	:global(body.dark-mode) {
		display: block;
		background-color: $light-background;
		color: $dark-background;
		transition: 0.2s;

		#UploadCodeButton, #DownloadCodeButton, #UseCodeButton, #googleButton {
			background-color: #404040;
			color: #f1f1f1;
		}

		#Action {
			-webkit-filter: invert(0%);
    		filter: invert(0%);
		}

		#Done h1, #Code h1 {
			color: white;
		}
		
	}

	#Download {
		
		#codeInput, #emailInput {
			position: absolute;
			bottom: 45%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 50vw;
			height: 8vh;
			background-color: white;
			border-radius: 4.84px;
			text-align: center;
			vertical-align: middle;
			user-select: all;
			margin: 0;
			font-size: 3.5vw;
			color: black;
			outline: none;
		}

		#emailInput {
			bottom: 60%;
		}

		img {
			position: absolute;
			bottom: 30%;
			left: 50%;
			height: 10%;
			transform: translate(-50%, -50%);
			cursor: pointer;
		}
	}

	input:-webkit-autofill,
	input:-webkit-autofill:hover, 
	input:-webkit-autofill:focus, 
	input:-webkit-autofill:active{
		-webkit-box-shadow: 0 0 0px 1000px white inset;
		box-shadow: 0 0 0px 1000px white inset;
	}

	#Code, #Done {
		position: absolute;
		top: 50%;
		bottom: 50%;
		left: 50%;
		right: 50%;
		transform: translate(-50%, -50%);
		width: 400px;
		height: 97px;
		background-color: #575757;
		border-radius: 4.84px;
		font-size: 30px;
		
		h1 {
			text-align: center;
			vertical-align: middle;
			line-height: 97px;
			user-select: all;
			margin: 0;
		}
	}

	#Done h1{
		user-select: none;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 60px;
		height: 34px;

		position: fixed;
		left: 50%;
		bottom: 1vh;
		transform: translate(-50%, -50%);
		margin: 0 auto;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		-webkit-transition: 0.4s;
		transition: 0.4s;
		border-radius: 34px;
	}

	.slider:before {
		position: absolute;
		content: "";
		height: 26px;
		width: 26px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		-webkit-transition: 0.4s;
		transition: 0.4s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: #2196f3;
	}

	input:focus + .slider {
		box-shadow: 0 0 1px #2196f3;
	}

	input:checked + .slider:before {
		-webkit-transform: translateX(26px);
		-ms-transform: translateX(26px);
		transform: translateX(26px);
	}

	.animate-bottom {
		position: relative;
		-webkit-animation-name: animatebottom;
		-webkit-animation-duration: 1s;
		animation-name: animatebottom;
		animation-duration: 1s
	}

	@-webkit-keyframes animatebottom {
		from{ width:0px; height:0px; opacity:0; font-size: 0px; } 
		to{ width:400; height:97px; opacity:1; font-size: 30px; }
	}

	@keyframes animatebottom { 
		from{ width:0px; height:0px; opacity:0; font-size: 0px; } 
		to{ width:400; height:97px; opacity:1; font-size: 30px; }
	}
</style>
