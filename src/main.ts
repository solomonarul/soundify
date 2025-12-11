import { Plugin } from "obsidian";

type PluginAudio = HTMLAudioElement | null;

export default class Soundify extends Plugin {

	private startupAudio: PluginAudio = null;
	private basesHoverAudio: PluginAudio = null;
	private observer: MutationObserver | null = null;

	private getLocalPath(resource: string) : string {
		return this.app.vault.adapter.getResourcePath(
			`.obsidian/plugins/${this.manifest.id}/${resource}`
		);
	}

	private createAudioElement(path: string) {
		var result = new Audio(this.getLocalPath(path));
		result.preload = "auto";
		return result;
	}

	async onload() {
		this.startupAudio = this.createAudioElement("media/startup.mp3");
		this.basesHoverAudio = this.createAudioElement("media/basesHover.mp3");
	
        this.enableObserver();

		this.startupAudio!.currentTime = 0;
		this.startupAudio!.play().catch(() => {});
	}

	onunload() {
		if (this.observer) this.observer.disconnect();
	}

	private enableObserver() {
		// Watch DOM updates to detect Bases cards
		this.observer = new MutationObserver(() => {
			this.attachBasesHoverListeners();
		});
		this.observer.observe(document.body, {
			childList: true,
			subtree: true
		});

		// Attach on startup
		this.attachBasesHoverListeners();
	}

	private attachBasesHoverListeners() {
		if (!this.basesHoverAudio) return;

		const cards = document.querySelectorAll(".bases-cards-item");

		cards.forEach(card => {
			// Prevent double-binding
			if ((card as any)._hoverSoundBound) return;
			(card as any)._hoverSoundBound = true;

			card.addEventListener("mouseenter", () => {
				this.basesHoverAudio!.currentTime = 0;
				this.basesHoverAudio!.play().catch(() => {});
			});
		});
	}
}