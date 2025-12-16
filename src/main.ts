import { MaybeAudioElement, AudioElement, AudioState } from "./audio";
import { FileHandler } from "./filehandler";
import { App, Plugin, PluginManifest } from "obsidian";
import { SoundifySettings, SoundifySettingsTab } from "./settings";

export default class Soundify extends Plugin {
	public file: FileHandler;
	public settings: SoundifySettings;
	private openFileAudio: MaybeAudioElement;
	private startupAudio: MaybeAudioElement;
	private basesHoverAudio: MaybeAudioElement;
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
		this.settings.sounds["file_open"].addListener((s) => {
			this.openFileAudio = new AudioElement(
				this.file.getLocalResource(this.settings.sounds["file_open"].getPath()),
			);
		});
		this.startupAudio = new AudioElement(
			this.file.getLocalResource(this.settings.sounds["startup"].getPath()),
		);
		this.settings.sounds["startup"].addListener((s) => {
			this.startupAudio = new AudioElement(
				this.file.getLocalResource(this.settings.sounds["startup"].getPath()),
			);
		});
		this.basesHoverAudio = new AudioElement(
			this.file.getLocalResource(this.settings.sounds["bases_hover"].getPath()),
		);
		this.settings.sounds["bases_hover"].addListener((s) => {
			this.basesHoverAudio = new AudioElement(
				this.file.getLocalResource(this.settings.sounds["bases_hover"].getPath()),
			);
			this.attachBasesHoverListeners();
		});
		// TODO: this is kinda ugly.

		this.enableObserver();
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				if (!this.openFileAudio) return;
				if (this.startupAudio && this.startupAudio.state == AudioState.PLAYING) return;
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
			const el = card as HTMLElement & {
				_hoverSoundHandler?: EventListener;
			};
			if (el._hoverSoundHandler) el.removeEventListener("mouseenter", el._hoverSoundHandler);
			el._hoverSoundHandler = () => {
				if (!this.basesHoverAudio) return;
				this.basesHoverAudio.setPosition(0);
				this.basesHoverAudio.play();
			};
			el.addEventListener("mouseenter", el._hoverSoundHandler);
		});
	}
}
