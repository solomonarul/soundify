import Soundify from "./main";
import { Listening } from "./listener";
import { App, PluginSettingTab, Setting } from "obsidian";

export class SerializableSetting {
	constructor() {
		this.type = "none";
		this.path = "";
		this.volume = 1.0;
	}
	type: string;
	path: string;
	volume: number;
}

interface PersistedSoundifySettings {
	sounds?: Record<string, SerializableSetting>;
}

export class SoundSetting extends Listening<SoundSetting> {
	data: SerializableSetting;
	actionText: string;
	mediaFolder: string;
	fileList: Array<string>;

	constructor(actionText: string) {
		super();
		this.data = new SerializableSetting();
		this.actionText = actionText;
	}

	async load(plugin: Soundify, mediaFolder: string) {
		this.mediaFolder = mediaFolder;
		const folderContents = await plugin.file.folderGetContents(
			plugin.file.getLocalPath(mediaFolder),
		);
		this.fileList = [];
		const mp3Files = folderContents.files.filter((f) => f.endsWith(".mp3"));
		for (const mp3 of mp3Files) {
			const mp3Name = mp3.split("/").pop();
			if (!mp3Name) continue;
			this.fileList.push(mp3Name);
		} // TODO: not only mp3s.
	}

	display(parent: SoundifySettingsTab) {
		new Setting(parent.containerEl).setName(this.actionText).addDropdown(async (dropdown) => {
			dropdown.addOption("none", "None").addOption("custom", "Custom");
			if (this.fileList)
				for (const mp3 of this.fileList) dropdown.addOption(mp3, mp3.replace(".mp3", "")); // TODO: not only mp3s
			dropdown.setValue(this.data.type);
			dropdown.onChange(async (value) => {
				const shouldRefresh: boolean =
					(this.data.type == "custom" && value != "custom") ||
					(this.data.type != "custom" && value == "custom");
				this.data.type = value;
				await parent.plugin.settings.save(parent.plugin);
				if (shouldRefresh) parent.display(); // Reload display menu on the fly.
				this.notify(this);
			});
		});

		if (this.data.type == "custom") {
			new Setting(parent.containerEl)
				.setName(`${this.actionText} Custom Path`)
				.addText((text) =>
					text.setValue(this.data.path).onChange(async (value) => {
						this.data.path = value;
						await parent.plugin.settings.save(parent.plugin);
						this.notify(this);
					}),
				);
		}

		new Setting(parent.containerEl).setName("Volume").addSlider(async (slider) => {
			slider.setLimits(0, 1, "any").setValue(this.data.volume).onChange(async (value) => {
				this.data.volume = value;
				await parent.plugin.settings.save(parent.plugin);
			}).setDynamicTooltip();
		})
	}

	isValid(): boolean {
		return this.data.type != "none";
	}

	getPath(): string {
		switch (this.data.type) {
			case "none":
				return "";
			case "custom":
				return this.data.path; // TODO: this is relative to plugin path, should be relative to vault path.
			default:
				return `${this.mediaFolder}/${this.data.type}`;
		}
	}
}

// TODO: replace strings with keys for a future localization.
export const DEFAULT_SETTING_NAMES: Record<string, string> = {
	startup: "Startup",
	bases_hover: "Card Hover",
	bases_click: "Card Click",
	file_open: "Open",
	key_down: "Key Pressed",
	key_up: "Key Released",
};

export class SoundifySettings {
	sounds: Record<string, SoundSetting> = {};

	async load(plugin: Soundify) {
		const data = (await plugin.loadData()) as PersistedSoundifySettings | undefined;
		this.sounds = {};
		for (const [key, text] of Object.entries(DEFAULT_SETTING_NAMES)) {
			const setting = new SoundSetting(text);
			if (data?.sounds?.[key]) {
				const serialized = data.sounds[key];
				setting.data = serialized;

				await setting.load(plugin, `media/${key}`);
				const path = setting.getPath();
				if (
					!(await plugin.file.exists(
						setting.data.type != "custom" ? plugin.file.getLocalPath(path) : path,
					))
				) {
					console.warn(
						`Sound of event with id: ${key} at path: ${path} doesn't exist, clearing...`,
					);
					setting.data = new SerializableSetting();
				}
			}
			this.sounds[key] = setting;
		}
	}

	async save(plugin: Soundify) {
		const serialized: Record<string, SerializableSetting> = {};
		for (const [key, setting] of Object.entries(this.sounds)) serialized[key] = setting.data;
		await plugin.saveData({ sounds: serialized });
	}
}

export class SoundifySettingsTab extends PluginSettingTab {
	plugin: Soundify;

	constructor(app: App, plugin: Soundify) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		if (!this.plugin.file) return;
		this.containerEl.empty();
		new Setting(this.containerEl).setName("Bases").setHeading();
		this.plugin.settings.sounds["bases_hover"].display(this);
		this.plugin.settings.sounds["bases_click"].display(this);
		new Setting(this.containerEl).setName("File").setHeading();
		this.plugin.settings.sounds["file_open"].display(this);
		new Setting(this.containerEl).setName("Keys").setHeading();
		this.plugin.settings.sounds["key_down"].display(this);
		this.plugin.settings.sounds["key_up"].display(this);
		new Setting(this.containerEl).setName("Others").setHeading();
		this.plugin.settings.sounds["startup"].display(this);
	}
}
