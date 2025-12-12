import Soundify from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface SoundifySettings {
	sampleValue: string;
}

export const DEFAULT_SETTINGS: Partial<SoundifySettings> = {
	sampleValue: "Lorem ipsum",
};

export class SoundifySettingsTab extends PluginSettingTab {
	plugin: Soundify;

	constructor(app: App, plugin: Soundify) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Default value").addText((text) =>
			text
				.setPlaceholder("Lorem ipsum")
				.setValue(this.plugin.settings.sampleValue)
				.onChange(async (value) => {
					this.plugin.settings.sampleValue = value;
					await this.plugin.saveSettings();
				}),
		);
	}
}
