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
	mediaFolder: string;
	actionText: string;

	constructor(mediaFolder: string, actionText: string) {
		super();
		this.data = new SerializableSetting();
		this.mediaFolder = mediaFolder;
		this.actionText = actionText;
	}

	async display(parent: SoundifySettingsTab): Promise<void> {
		const mp3Folder = parent.plugin.file.getLocalPath(this.mediaFolder);
		const folderContents = await parent.plugin.file.folderGetContents(mp3Folder);
		const mp3Files = folderContents.files.filter((f) => f.endsWith(".mp3")); // TODO: do not scan on every display.
		const mp3List: Array<string> = [];
		for (const mp3 of mp3Files) {
			mp3List.push(mp3.split("/").pop()!);
		} // TODO: not only mp3s.

		new Setting(parent.containerEl).setName(this.actionText).addDropdown(async (dropdown) => {
			dropdown.addOption("none", "None").addOption("custom", "Custom");
			for (const mp3 of mp3List) dropdown.addOption(mp3, mp3.replace(".mp3", "")); // TODO: not only mp3s
			dropdown.setValue(this.data.type);
			dropdown.onChange(async (value) => {
				const shouldRefresh: boolean =
					(this.data.type == "custom" && value != "custom") ||
					(this.data.type != "custom" && value == "custom");
				this.data.type = value;
				await parent.plugin.settings.save(parent.plugin);
				if (shouldRefresh) await parent.display(); // Reload display menu on the fly.
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
		startup: new SoundSetting("media/startup", "Startup"),
		bases_hover: new SoundSetting("media/basesHover", "Hover"),
		file_open: new SoundSetting("media/openFile", "Open"),
	},
};

export class SoundifySettings {
	sounds: Record<string, SoundSetting> = {};

	async load(plugin: Soundify): Promise<void> {
		const data = await plugin.loadData();
		this.sounds = {};
		for (const [key, defaultSetting] of Object.entries(DEFAULT_SETTINGS.sounds ?? {})) {
			const setting = new SoundSetting(defaultSetting.mediaFolder, defaultSetting.actionText);
			if (data?.sounds?.[key]) {
				const serialized = data.sounds[key] as SerializableSetting;
				setting.data = serialized;
			}
			this.sounds[key] = setting;
		}
	}

	async save(plugin: Soundify): Promise<void> {
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

	async display(): Promise<void> {
		if (!this.plugin.file) return;
		this.containerEl.empty();
		new Setting(this.containerEl).setName("General").setHeading();
		await this.plugin.settings.sounds["startup"].display(this);
		new Setting(this.containerEl).setName("Bases").setHeading();
		await this.plugin.settings.sounds["bases_hover"].display(this);
		new Setting(this.containerEl).setName("File").setHeading();
		await this.plugin.settings.sounds["file_open"].display(this);
	}
}
