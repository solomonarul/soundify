import { App, Plugin, PluginManifest } from "obsidian";
import { AudioElement } from "./audio";
import { DEFAULT_SETTINGS, SoundifySettings, SoundifySettingsTab } from "./settings";
import { MediaHelper } from "./mediahelper";

export default class Soundify extends Plugin {
	public settings: SoundifySettings;
	private openFileAudioFlag: boolean;
	private openFileAudio: AudioElement;
	private startupAudio: AudioElement;
	private basesHoverAudio: AudioElement;
	private observer: MutationObserver | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}

	destructor() {
		this.observer?.disconnect();
	}

	private getLocalPath(resource: string): string {
		return this.app.vault.adapter.getResourcePath(
			`.obsidian/plugins/${this.manifest.id}/${resource}`,
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); // NOTE: does only shallow copy.
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SoundifySettingsTab(this.app, this));

		const mediaHelper = new MediaHelper(this);
		await mediaHelper.ensureMedia();

		this.openFileAudio = new AudioElement(this.getLocalPath("media/openFile/Aqua Pluck.mp3"));
		this.startupAudio = new AudioElement(
			this.getLocalPath("media/startup/Breathy Startup.mp3"),
		);
		this.basesHoverAudio = new AudioElement(
			this.getLocalPath("media/basesHover/Abstract2.mp3"),
		);

		this.enableObserver();
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				if (!this.openFileAudioFlag) {
					this.openFileAudioFlag = true;
					return;
				}
				this.openFileAudio.setPosition(0);
				this.openFileAudio.play();
			}),
		);

		this.startupAudio.setPosition(0);
		this.startupAudio.play();
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
			const cardObject = card as any;
			if (cardObject._hoverSoundBound) return;
			cardObject._hoverSoundBound = true;
			cardObject.addEventListener("mouseenter", () => {
				this.basesHoverAudio.setPosition(0);
				this.basesHoverAudio.play();
			});
		});
	}
}
