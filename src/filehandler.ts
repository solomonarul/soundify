import { DataAdapter } from "obsidian";
import * as zip from "@zip.js/zip.js";

export class FileHandler {
	private adapter: DataAdapter;
	private pluginFolder: string;

	constructor(adapter: DataAdapter, appID: string) {
		this.adapter = adapter;
		this.pluginFolder = `.obsidian/plugins/${appID}`;
	}

	public getLocalResource(resource: string): string {
		return this.adapter.getResourcePath(this.getLocalPath(resource));
	}

	public getLocalPath(path: string): string {
		return [this.pluginFolder, path].join("/");
	}

	public async exists(path: string): Promise<boolean> {
		return this.adapter.exists(path);
	}

	public async folderCreate(path: string) {
		await this.adapter.mkdir(path);
	}

	public async folderExistsOrCreate(path: string): Promise<boolean> {
		if (!(await this.exists(path))) {
			await this.folderCreate(path);
			return false;
		}
		return true;
	}

	public async readBinary(path: string): Promise<ArrayBuffer> {
		return this.adapter.readBinary(path);
	}

	public async writeBinary(path: string, data: ArrayBuffer) {
		return this.adapter.writeBinary(path, data);
	}

	public async removeExtensionFromPath(path: string): Promise<string> {
		return path.replace(/\.[^/.]+$/, "");
	}

	public async unzipLocalToLocal(path: string, targetLocation?: string) {
		const targetPath = await (!targetLocation
			? this.removeExtensionFromPath(path)
			: this.removeExtensionFromPath(targetLocation));

		const localPath = this.getLocalPath(path);
		const localFolder = this.getLocalPath(targetPath);

		// Check if the target folder already exists.
		if (await this.folderExistsOrCreate(localFolder)) {
			console.info("Unarchived folder exists locally, skipping...");
			return;
		}

		const zipReader = new zip.ZipReader(
			new zip.BlobReader(
				new Blob([await this.adapter.readBinary(localPath)], {
					type: "application/octet-stream",
				}),
			),
		);

		// Create folder structure first.
		const entries = await zipReader.getEntries();
		for (const entry of entries.filter((e) => e.directory)) {
			const dirPath = this.getLocalPath(`media/${entry.filename}`);
			await this.folderExistsOrCreate(dirPath);
		}

		// Write the files second.
		for (const entry of entries.filter((e) => !e.directory)) {
			if (entry.directory) continue; // TODO: make the compiler not cry after removing this.
			const fileData = await entry.getData(new zip.BlobWriter("application/octet-stream"));

			const filePath = this.getLocalPath(`media/${entry.filename}`); // TODO: replace with normalized path if doesnt work.
			if (await this.exists(filePath)) continue; // TODO: override?
			await this.writeBinary(filePath, await fileData.arrayBuffer());
		}

		console.info("Unzipped media.zip.");
	}
}
