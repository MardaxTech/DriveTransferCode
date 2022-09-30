

// takes list of divs to show and it will hide all other divs
export default function changeView(views: string[]) {
	const actionElement = document.getElementById("Action") ?? {} as HTMLElement;

	Array.from(document.querySelector("#wrapper")?.children ?? []).forEach((child: Element) => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		views.includes(child.id) ? child.style.display = "block" : child.style.display = "none";
		views.includes("Action") ? actionElement.style.display = "block" : actionElement.style.display = "none";
	});
}