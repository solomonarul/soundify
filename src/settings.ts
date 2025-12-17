import Soundify from "./main";
import { Listening } from "./listener";
import { App, PluginSettingTab, Setting } from "obsidian";

export class SerializableSetting {
	constructor() {
		this.type = "none";
		this.path = "";
	}
	type: string;
	path: string;
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
	}

	isValid(): boolean {
		return this.data.type != "none";
	}

	getPath(): string {
		switch (this.data.type) {
			case "none":
				return "";
			case "custom":
				return this.data.path;
			default:
				return `${this.mediaFolder}/${this.data.type}`;
		}
	}
}

export const DEFAULT_SETTINGS: Partial<SoundifySettings> = {
	sounds: {
		startup: new SoundSetting("Startup"),
		bases_hover: new SoundSetting("Card Hover"),
		file_open: new SoundSetting("Open"),
	},
};

export class SoundifySettings {
	sounds: Record<string, SoundSetting> = {};

	async load(plugin: Soundify) {
		const data = await plugin.loadData();
		this.sounds = {};
		for (const [key, defaultSetting] of Object.entries(DEFAULT_SETTINGS.sounds ?? {})) {
			const setting = new SoundSetting(defaultSetting.actionText);
			if (data?.sounds?.[key]) {
				const serialized = data.sounds[key] as SerializableSetting;
				setting.data = serialized;
				if (!(await plugin.file.exists(setting.getPath())))
					setting.data = new SerializableSetting();
				setting.load(plugin, `media/${key}`);
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
		new Setting(this.containerEl).setName("File").setHeading();
		this.plugin.settings.sounds["file_open"].display(this);
		new Setting(this.containerEl).setName("Others").setHeading();
		this.plugin.settings.sounds["startup"].display(this);
	}
}
