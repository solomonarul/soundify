import { normalizePath, App } from "obsidian";
import * as zip from "@zip.js/zip.js";
import Soundify from "./main";

export class MediaHelper {
	plugin: Soundify;

	constructor(plugin: Soundify) {
		this.plugin = plugin;
	}

	checkOrCreateFolder = async (path: string) => {
		if (!(await this.plugin.app.vault.adapter.exists(path)))
			await this.plugin.app.vault.adapter.mkdir(path);
	};

	unzip = async (zipFilePath: string, targetFolder?: string) => {
		const folder = targetFolder
			? normalizePath(targetFolder)
			: normalizePath(
					[
						this.plugin.app.vault.configDir,
						"plugins",
						this.plugin.manifest.id,
						"media",
					].join("/"),
				);

		await this.checkOrCreateFolder(folder);

		const zipBlob = new Blob([await this.plugin.app.vault.adapter.readBinary(zipFilePath)], {
			type: "application/octet-stream",
		});

		const zipReader = new zip.ZipReader(new zip.BlobReader(zipBlob));
		const entries = await zipReader.getEntries();
		for (const entry of entries.filter((e) => e.directory)) {
			const dirPath = normalizePath([folder, entry.filename].join("/"));
			await this.checkOrCreateFolder(dirPath);
		}

		for (const entry of entries) {
			if (entry.directory) continue;

			const fileData = await entry.getData(new zip.BlobWriter("application/octet-stream"));

			const arrayBuffer = await fileData.arrayBuffer();
			const filePath = normalizePath([folder, entry.filename].join("/"));

			if (await this.plugin.app.vault.adapter.exists(filePath)) continue;

			await this.plugin.app.vault.adapter.writeBinary(filePath, arrayBuffer);
		}
	};

	ensureMedia = async () => {
		const pluginFolder = normalizePath(
			[this.plugin.app.vault.configDir, "plugins", this.plugin.manifest.id].join("/"),
		);
		const zipPath = normalizePath([pluginFolder, "media.zip"].join("/"));

		await this.checkOrCreateFolder(pluginFolder);

		if (await this.plugin.app.vault.adapter.exists(zipPath)) {
			await this.unzip(zipPath);
		}
	};
}
