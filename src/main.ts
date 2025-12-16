import { MaybeAudioElement, AudioElement, AudioState } from "./audio";
import { FileHandler } from "./filehandler";
import { App, Plugin, PluginManifest } from "obsidian";
import { SoundifySettings, SoundifySettingsTab, SoundSetting } from "./settings";

export default class Soundify extends Plugin {
	public file: FileHandler;
	public settings: SoundifySettings;
	private sounds: Record<string, MaybeAudioElement>;
	private observer: MutationObserver | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.sounds = {};
		this.settings = new SoundifySettings();
		this.file = new FileHandler(this.app.vault.adapter, manifest.id);
	}

	destructor() {
		if (this.observer) this.observer.disconnect();
	}

	ensure_sound_loaded(sound: string): void {
		const updateAudio = (setting: SoundSetting) => {
			this.sounds[sound] = setting.isValid()
				? new AudioElement(this.file.getLocalResource(setting.getPath()))
				: null;
		};
		const setting = this.settings.sounds[sound];
		updateAudio(setting);
		setting.addListener(updateAudio);
	}

	async unarchive_media(path: string): Promise<void> {
		console.log(`Unarchiving ${path}.`);
		await this.file.unzipLocalToLocal(path);
	}

	async onload() {
		const zipPath = this.file.getLocalPath("media.zip");
		const mediaPath = this.file.getLocalPath("media");
		const hashPath: string = this.file.getLocalPath("media/.hash");
		const existingHash: string | null = await this.file.readString(hashPath);
		const zipFingerprint: string = await this.file.fileFingerprint(zipPath);

		if (!this.file.exists(mediaPath) || !existingHash || existingHash != zipFingerprint) {
			await this.file.folderDelete(mediaPath);
			await this.file.folderCreate(mediaPath);
			await this.unarchive_media("media.zip");
			await this.file.writeString(hashPath, zipFingerprint);
		} else {
			console.info("Media folder exists and is up to date.");
		}

		await this.settings.load(this);
		this.addSettingTab(new SoundifySettingsTab(this.app, this));

		this.ensure_sound_loaded("bases_hover");
		this.ensure_sound_loaded("file_open");
		this.ensure_sound_loaded("startup");

		this.enableObserver();
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				if (!this.sounds["file_open"]) return;
				if (this.sounds["startup"] && this.sounds["startup"].state == AudioState.PLAYING)
					return;
				this.sounds["file_open"].setPosition(0);
				this.sounds["file_open"].play();
			}),
		);

		if (this.sounds["startup"]) {
			this.sounds["startup"].setPosition(0);
			this.sounds["startup"].play();
		}
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
				if (!this.sounds["bases_hover"]) return;
				this.sounds["bases_hover"].setPosition(0);
				this.sounds["bases_hover"].play();
			};
			el.addEventListener("mouseenter", el._hoverSoundHandler);
		});
	}
}
