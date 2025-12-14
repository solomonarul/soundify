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

	display(): void {
		const { containerEl: container } = this;

		container.empty();

		new Setting(container).setName("Bases").setHeading();
		new Setting(container).setName("On Hover").addDropdown((dropdown) =>
			dropdown
				.addOption("none", "None")
				.addOption("custom", "Custom")
				.addOption("Abstract2.mp3", "Abstract2")
				.addOption("Click.mp3", "Click")
				.setValue(this.plugin.settings.bases_on_hover)
				.onChange(async (value) => {
					this.plugin.settings.bases_on_hover = value;
					await this.plugin.saveSettings();
					this.display();
				}),
		);

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
