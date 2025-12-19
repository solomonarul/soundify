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

	async unarchive_media(path: string) {
		await this.file.unzipLocalToLocal(path);
	}

	async onload() {
		const zipPath = this.file.getLocalPath("media.zip");
		const mediaPath = this.file.getLocalPath("media");
		const hashPath: string = this.file.getLocalPath("media/.hash");
		const readHash: string | null = await this.file.readString(hashPath);
		const zipHash: string = await this.file.fileFingerprint(zipPath);

		if (!(await this.file.exists(mediaPath)) || !readHash || readHash != zipHash) {
			await this.file.folderDelete(mediaPath);
			await this.file.folderCreate(mediaPath);
			await this.unarchive_media("media.zip");
			await this.file.writeString(hashPath, zipHash);
		}

		await this.settings.load(this);
		this.addSettingTab(new SoundifySettingsTab(this.app, this));

		// TODO: replace with scan of media/
		this.ensure_sound_loaded("bases_click");
		this.ensure_sound_loaded("bases_hover");
		this.ensure_sound_loaded("file_open");
		this.ensure_sound_loaded("startup");
		this.ensure_sound_loaded("key_down");
		this.ensure_sound_loaded("key_up");

		this.enableObserver();

		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				if (!this.sounds["file_open"]) return;

				// This ensures the sound doesn't play when the app starts with a loaded file and lets the startup sound take precedence.
				if (this.sounds["startup"] && this.sounds["startup"].state == AudioState.PLAYING)
					return;

				if (
					this.sounds["bases_click"] &&
					this.sounds["bases_click"].state == AudioState.PLAYING
				)
					return;

				this.sounds["file_open"].setPosition(0);
				this.sounds["file_open"].play();
			}),
		);

		if (this.sounds["startup"]) {
			this.sounds["startup"].setPosition(0);
			this.sounds["startup"].play();
		}

		document.addEventListener("keydown", (e) => {
			if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
			if (!this.sounds["key_down"]) return;
			this.sounds["key_down"].setPosition(0);
			this.sounds["key_down"].play();
		});

		document.addEventListener("keyup", (e) => {
			if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
			if (!this.sounds["key_up"]) return;
			this.sounds["key_up"].setPosition(0);
			this.sounds["key_up"].play();
		});
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
				_clickSoundHandler?: EventListener;
			};
			if (el._hoverSoundHandler) el.removeEventListener("mouseenter", el._hoverSoundHandler);
			el._hoverSoundHandler = () => {
				if (!this.sounds["bases_hover"]) return;
				this.sounds["bases_hover"].setPosition(0);
				this.sounds["bases_hover"].play();
			};
			el.addEventListener("mouseenter", el._hoverSoundHandler);

			if (el._clickSoundHandler) el.removeEventListener("mouseup", el._clickSoundHandler);
			el._clickSoundHandler = () => {
				if (!this.sounds["bases_click"]) return;
				this.sounds["bases_click"].setPosition(0);
				this.sounds["bases_click"].play();
			};
			el.addEventListener("mouseup", el._clickSoundHandler);
		});
	}
}
