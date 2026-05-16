import { DataAdapter, ListedFiles, normalizePath } from "obsidian";
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
		await this.adapter.mkdir(normalizePath(path));
	}

	public async folderExistsOrCreate(path: string): Promise<boolean> {
		if (!(await this.exists(path))) {
			await this.folderCreate(path);
			return false;
		}
		return true;
	}

	public async folderDelete(path: string) {
		if (!(await this.exists(path))) return;
		await this.adapter.rmdir(path, true);
	}

	public async folderGetContents(path: string): Promise<ListedFiles> {
		return await this.adapter.list(path);
	}

	public async readBinary(path: string): Promise<ArrayBuffer> {
		return this.adapter.readBinary(path);
	}

	public async writeBinary(path: string, data: ArrayBuffer) {
		return this.adapter.writeBinary(path, data);
	}

	public async readString(path: string): Promise<string | null> {
		let result: string | null = null;
		try {
			result = await this.adapter.read(path);
		} catch {
			console.warn(`File at path ${path} doesn't exist.`);
		}
		return result;
	}

	public async writeString(path: string, contents: string) {
		const dirPath = path.substring(0, path.lastIndexOf("/"));
		if (dirPath) await this.adapter.mkdir(dirPath).catch(() => {});
		await this.adapter.write(path, contents);
	}

	public async fileFingerprint(path: string) {
		const stat = await this.adapter.stat(path);
		if (!stat) return "";
		return `${stat.size}:${stat.mtime}`;
	}

	public removeExtensionFromPath(path: string): string {
		return path.replace(/\.[^/.]+$/, "");
	}

	public async unzipLocalToLocal(path: string, targetLocation?: string) {
		const targetPath = !targetLocation
			? this.removeExtensionFromPath(path)
			: this.removeExtensionFromPath(targetLocation);

		const localPath = this.getLocalPath(path);
		const localFolder = this.getLocalPath(targetPath);

		if (!(await this.exists(localPath))) {
			console.error(`Archive at path ${localPath} doesn't exist.`);
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
		await this.folderExistsOrCreate(localFolder);
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
	}
}
