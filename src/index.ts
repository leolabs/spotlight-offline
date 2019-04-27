import chokidar from "chokidar";
import legacyFs from "fs";
import os from "os";
import uuid from "node-uuid";
import path from "path";
import Database from "better-sqlite3";
import systeminformation from "systeminformation";
import { spawn } from "child_process";

const fs = legacyFs.promises;

interface Device {
  id?: number;
  uuid: string;
  type: string;
  label: string;
  first_seen: number;
  last_seen: number;
}

interface IndexedFile {
  id?: number;
  device_id: number;
  type: "File" | "Folder";
  name: string;
  path: string;
}

interface DeviceMeta {
  uuid: string;
  label: string;
  type: string;
}

const BLACKLIST = ["BOOTCAMP", "GoogleDrive"];
const ONLY_BLOCK_DEVICES = true;

class Indexer {
  database: Database.Database;

  queryDevice = (uuid: string): Device | null =>
    this.database
      .prepare("SELECT * FROM known_devices WHERE uuid = ?")
      .get(uuid);

  insertDevice = (uuid: string, label: string, type: string) =>
    this.database
      .prepare(
        "INSERT INTO known_devices (uuid, label, type, first_seen, last_seen) VALUES (@uuid, @label, @type, @now, @now)",
      )
      .run({ uuid, label, type, now: Date.now() });

  updateDevice = (uuid: string) =>
    this.database
      .prepare("UPDATE known_devices SET last_seen = ? WHERE uuid = ?")
      .run(Date.now(), uuid);

  insertFile = (deviceId: number, file: IndexedFile) =>
    this.database
      .prepare(
        "INSERT INTO file_index (device_id, type, name, path) VALUES (@deviceId, @type, @name, @path)",
      )
      .run({ ...file, deviceId });

  deteleAllFiles = (deviceId: number) =>
    this.database
      .prepare("DELETE FROM file_index WHERE device_id = ?")
      .run(deviceId);

  insertIndex = (
    deviceId: number,
  ): ((files: IndexedFile[]) => Database.Transaction) =>
    this.database.transaction(items => {
      this.deteleAllFiles(deviceId);
      for (const item of items) {
        this.insertFile(deviceId, item);
      }
    });

  constructor(dbFolder: string) {
    this.database = new Database(path.join(dbFolder, "index.db"));

    this.database.exec(
      legacyFs
        .readFileSync(path.join(__dirname, "migrations/00_initial.sql"))
        .toString(),
    );
  }

  async querySpotlight(
    rootPath: string,
    query = "kMDItemDisplayName == *",
  ): Promise<string[]> {
    return new Promise((res, rej) => {
      let files: string[] = [];

      const process = spawn("mdfind", ["-onlyin", rootPath, query]);
      process.stdout.on("data", (m: Buffer) => {
        files = files.concat(
          m
            .toString()
            .split("\n")
            .filter(s => s.trim().length),
        );
      });
      process.on("exit", code => {
        if (code !== 0) {
          return rej(code);
        } else {
          return res(files);
        }
      });
    });
  }

  async getDeviceMeta(volumePath: string): Promise<DeviceMeta> {
    let disk = (await systeminformation.blockDevices()).find(
      d => d.mount === volumePath,
    );

    if (disk) {
      return {
        label: disk.label,
        uuid: disk.uuid,
        type: `${disk.protocol} ${disk.physical}`,
      };
    }

    const metaFilePath = path.join(volumePath, ".spotlight-offline-meta.json");

    try {
      await fs.stat(metaFilePath);
      const data = JSON.parse((await fs.readFile(metaFilePath)).toString());
      return data;
    } catch (e) {
      const meta = {
        label: path.basename(volumePath),
        uuid: uuid.v1(),
        type: `Other`,
      };
      await fs.writeFile(metaFilePath, JSON.stringify(meta));
      return meta;
    }
  }

  async indexVolume(volumePath: string) {
    console.log("Indexing", volumePath);

    const disk = await this.getDeviceMeta(volumePath);

    const device = this.queryDevice(disk.uuid);
    let deviceId: number;

    if (!device) {
      const insert = this.insertDevice(disk.uuid, disk.label, disk.type);
      deviceId = Number(insert.lastInsertRowid);
    } else {
      this.updateDevice(disk.uuid);
      deviceId = device.id!;
    }

    const files = await this.querySpotlight(
      volumePath,
      "kMDItemKind != Folder",
    );
    const folders = await this.querySpotlight(
      volumePath,
      "kMDItemKind == Folder",
    );

    const data = [
      ...files.map(
        f =>
          ({
            device_id: deviceId,
            name: path.basename(f),
            path: f.substr(volumePath.length),
            type: "File",
          } as IndexedFile),
      ),
      ...folders.map(
        f =>
          ({
            device_id: deviceId,
            name: path.basename(f),
            path: f.substr(volumePath.length),
            type: "Folder",
          } as IndexedFile),
      ),
    ].filter(f => f.path);

    this.insertIndex(deviceId)(data);
  }

  async indexAllVolumes() {
    return Promise.all(
      (await systeminformation.blockDevices())
        .filter(
          d =>
            d.mount !== "/" &&
            d.mount.startsWith("/Volumes/") &&
            !BLACKLIST.map(b => `/Volumes/${b}`).includes(d.mount),
        )
        .map(d => (this.indexVolume(d.mount), d)),
    );
  }
}

const main = async () => {
  const cachePath = path.join(os.homedir(), ".spotlight-offline");

  try {
    await fs.stat(cachePath);
  } catch (e) {
    await fs.mkdir(cachePath);
  }

  const indexer = new Indexer(cachePath);

  let watchedDevices: string[] = [];

  chokidar.watch("/Volumes", { depth: 0 }).on("addDir", async volumePath => {
    if (volumePath.split("/").length !== 3) {
      return;
    }

    if (!BLACKLIST.map(b => `/Volumes/${b}`).includes(volumePath)) {
      return;
    }

    console.log("Detected", volumePath);
    await indexer.indexVolume(volumePath);
    watchedDevices.push(volumePath);
  });
};

main();
