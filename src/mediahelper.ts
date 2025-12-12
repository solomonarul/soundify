import { normalizePath, App } from "obsidian";
import * as zip from "@zip.js/zip.js";

export class MediaHelper {
    app: App;
    pluginId: string;

    constructor(app: App, pluginId: string) {
        this.app = app;
        this.pluginId = pluginId;
    }

    checkOrCreateFolder = async (path: string) => {
        if (!(await this.app.vault.adapter.exists(path))) {
            await this.app.vault.adapter.mkdir(path);
        }
    };

    unzip = async (zipFilePath: string, targetFolder?: string) => {
        const folder = targetFolder
            ? normalizePath(targetFolder)
            : normalizePath(
                  [
                      this.app.vault.configDir,
                      "plugins",
                      this.pluginId,
                      "media",
                  ].join("/")
              );

        await this.checkOrCreateFolder(folder);

        const zipBlob = new Blob([await this.app.vault.adapter.readBinary(zipFilePath)], {
            type: "application/octet-stream",
        });

        const entries = await new zip.ZipReader(new zip.BlobReader(zipBlob)).getEntries();

        // First create directories
        for (const entry of entries.filter((e) => e.directory)) {
            const dirPath = normalizePath([folder, entry.filename].join("/"));
            await this.checkOrCreateFolder(dirPath);
        }

        // Then write files
        for (const entry of entries.filter((e) => !e.directory)) {
            const filePath = normalizePath([folder, entry.filename].join("/"));
            if (await this.app.vault.adapter.exists(filePath)) continue;
            if (!entry.getData) continue;

            const fileData = await entry.getData(new zip.BlobWriter("application/octet-stream"));
            const arrayBuffer = await fileData.arrayBuffer();
            await this.app.vault.adapter.writeBinary(filePath, arrayBuffer);
        }
    };

    ensureMedia = async () => {
        const pluginFolder = normalizePath([this.app.vault.configDir, "plugins", this.pluginId].join("/"));
        const zipPath = normalizePath([pluginFolder, "media.zip"].join("/"));

        await this.checkOrCreateFolder(pluginFolder);

        if (await this.app.vault.adapter.exists(zipPath)) {
            await this.unzip(zipPath);
        }
    };
}
