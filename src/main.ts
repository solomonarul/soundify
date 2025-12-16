import { AudioElement, AudioState } from "./audio";
import { FileHandler } from "./filehandler";
import { App, Plugin, PluginManifest } from "obsidian";
import { SoundifySettings, SoundifySettingsTab } from "./settings";

export default class Soundify extends Plugin {
	public file: FileHandler;
	public settings: SoundifySettings;
	private openFileAudio: AudioElement;
	private startupAudio: AudioElement;
	private basesHoverAudio: AudioElement;
	private observer: MutationObserver | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.settings = new SoundifySettings();
		this.file = new FileHandler(this.app.vault.adapter, manifest.id);
	}

	destructor() {
		if (this.observer) this.observer.disconnect();
	}

	async onload() {
		console.log("Unarchiving media.zip.");
		await this.file.unzipLocalToLocal("media.zip");

		await this.settings.load(this);
		this.addSettingTab(new SoundifySettingsTab(this.app, this));

		this.openFileAudio = new AudioElement(
			this.file.getLocalResource(this.settings.sounds["file_open"].getPath()),
		);
		this.startupAudio = new AudioElement(
			this.file.getLocalResource(this.settings.sounds["startup"].getPath()),
		);
		this.basesHoverAudio = new AudioElement(
			this.file.getLocalResource(this.settings.sounds["bases_hover"].getPath()),
		);
		// TODO: these should change on the fly.

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
