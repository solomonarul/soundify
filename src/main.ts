import { Plugin } from "obsidian";

type PluginAudio = HTMLAudioElement | null;

export default class Soundify extends Plugin {

	private openFileAudioWasPlayed: boolean = false;
	private openFileAudio: PluginAudio = null;
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
		this.openFileAudio = this.createAudioElement("media/openFile.mp3");
		this.startupAudio = this.createAudioElement("media/startup.mp3");
		this.basesHoverAudio = this.createAudioElement("media/basesHover.mp3");
	
        this.enableObserver();
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				if(!this.openFileAudioWasPlayed) {
					this.openFileAudioWasPlayed = true;	// Workaround for this playing even on startup.
					return;
				}
				this.openFileAudio!.currentTime = 0;
				this.openFileAudio!.play().catch(() => {});
			})
		);

		this.startupAudio!.currentTime = 0;
		this.startupAudio!.play().catch(() => {});
	}

	onunload() {
		if (this.observer) this.observer.disconnect();
	}

	private enableObserver() {
		this.observer = new MutationObserver(() => {
			this.attachBasesHoverListeners();
		});
		this.observer.observe(document.body, {
			childList: true,
			subtree: true
		});
		this.attachBasesHoverListeners();
	}

	private attachBasesHoverListeners() {
		document.querySelectorAll(".bases-cards-item").forEach(card => {
			if ((card as any)._hoverSoundBound) return; // Prevent double-binding
			(card as any)._hoverSoundBound = true;
			card.addEventListener("mouseenter", () => {
				this.basesHoverAudio!.currentTime = 0;
				this.basesHoverAudio!.play().catch(() => {});
			});
		});		
	}
}