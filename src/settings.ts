import Soundify from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface SoundifySettings {
	bases_on_hover: string;
	bases_on_hover_custom_path: string;
}

export const DEFAULT_SETTINGS: Partial<SoundifySettings> = {
	bases_on_hover: "none",
	bases_on_hover_custom_path: "",
};

export class SoundifySettingsTab extends PluginSettingTab {
	plugin: Soundify;

	constructor(app: App, plugin: Soundify) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		if (!this.plugin.file) return;

		const { containerEl: container } = this;

		container.empty();

		const mp3Folder = this.plugin.file.getLocalPath("media/basesHover");
		const folderContents = await this.plugin.file.folderGetContents(mp3Folder);
		const mp3Files = folderContents.files.filter((f) => f.endsWith(".mp3"));
		const mp3List: Array<string> = [];
		for (const mp3 of mp3Files) {
			mp3List.push(mp3.split("/").pop()!);
		}

		new Setting(container).setName("Bases").setHeading();
		new Setting(container).setName("On Hover").addDropdown(async (dropdown) => {
			dropdown.addOption("none", "None").addOption("custom", "Custom");
			for (const mp3 of mp3List) dropdown.addOption(mp3, mp3.replace(".mp3", ""));
			dropdown.setValue(this.plugin.settings.bases_on_hover);
			dropdown.onChange(async (value) => {
				this.plugin.settings.bases_on_hover = value;
				await this.plugin.saveSettings();
				this.display();
			});
		});

		if (this.plugin.settings.bases_on_hover == "custom") {
			new Setting(container).setName("On Hover Custom Path").addText((text) =>
				text
					.setValue(this.plugin.settings.bases_on_hover_custom_path)
					.onChange(async (value) => {
						this.plugin.settings.bases_on_hover_custom_path = value;
						await this.plugin.saveSettings();
					}),
			);
		}
	}
}
