import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, SoundifySettings, SoundifySettingsTab } from "./settings";

type PluginAudio = HTMLAudioElement | null;

export default class Soundify extends Plugin {
	public settings: SoundifySettings;
	private openFileAudioWasPlayed = false;
	private openFileAudio: PluginAudio = null;
	private startupAudio: PluginAudio = null;
	private basesHoverAudio: PluginAudio = null;
	private observer: MutationObserver | null = null;

	private getLocalPath(resource: string): string {
		return this.app.vault.adapter.getResourcePath(
			`.obsidian/plugins/${this.manifest.id}/${resource}`,
		);
	}

	private createAudioElement(path: string) {
		const result = new Audio(this.getLocalPath(path));
		result.preload = "auto";
		return result;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); // NOTE: only shallow copy.
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SoundifySettingsTab(this.app, this));

		this.openFileAudio = this.createAudioElement("media/openFile/Aqua Pluck.mp3");
		this.startupAudio = this.createAudioElement("media/startup/Vista.mp3");
		this.basesHoverAudio = this.createAudioElement("media/basesHover/click.mp3");

		this.enableObserver();
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				if (!this.openFileAudioWasPlayed) {
					this.openFileAudioWasPlayed = true; // Workaround for this playing even on startup.
					return;
				}
				this.openFileAudio!.currentTime = 0;
				this.openFileAudio!.play().catch(() => {});
			}),
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
			subtree: true,
		});
		this.attachBasesHoverListeners();
	}

	private attachBasesHoverListeners() {
		document.querySelectorAll(".bases-cards-item").forEach((card) => {
			if ((card as any)._hoverSoundBound) return; // Prevent double-binding
			(card as any)._hoverSoundBound = true;
			card.addEventListener("mouseenter", () => {
				this.basesHoverAudio!.currentTime = 0;
				this.basesHoverAudio!.play().catch(() => {});
			});
		});
	}
}
