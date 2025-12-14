import { AudioElement, AudioState } from "./audio";
import { FileHandler } from "./filehandler";
import { App, Plugin, PluginManifest } from "obsidian";
import { DEFAULT_SETTINGS, SoundifySettings, SoundifySettingsTab } from "./settings";

export default class Soundify extends Plugin {
	public file: FileHandler | null = null;
	public settings: SoundifySettings;
	private openFileAudio: AudioElement;
	private startupAudio: AudioElement;
	private basesHoverAudio: AudioElement;
	private observer: MutationObserver | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.file = new FileHandler(this.app.vault.adapter, manifest.id);
	}

	destructor() {
		this.observer?.disconnect();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); // NOTE: does only shallow copy.
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		if (!this.file) return;

		console.log("Unarchiving media.zip.");
		await this.file.unzipLocalToLocal("media.zip");

		await this.loadSettings();
		this.addSettingTab(new SoundifySettingsTab(this.app, this));

		this.openFileAudio = new AudioElement(
			this.file.getLocalResource("media/openFile/Aqua Pluck.mp3"),
		);
		this.startupAudio = new AudioElement(
			this.file.getLocalResource("media/startup/Breathy Startup.mp3"),
		);
		this.basesHoverAudio = new AudioElement(
			this.file.getLocalResource("media/basesHover/Abstract2.mp3"),
		);

		this.enableObserver();
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				if (this.startupAudio.state == AudioState.PLAYING) return;
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
