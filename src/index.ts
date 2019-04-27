import chokidar from "chokidar";
import fs from "fs-extra";
import os from "os";
import path from "path";
import pino from "pino";
import Indexer from "./indexer";
import { startServer } from "./server";

const BLACKLIST = ["BOOTCAMP", "GoogleDrive"];

const main = async () => {
  const logger = pino({ level: "debug" });
  const cachePath = path.join(os.homedir(), ".spotlight-offline");

  try {
    await fs.stat(cachePath);
  } catch (e) {
    await fs.mkdir(cachePath);
  }

  const indexer = new Indexer(cachePath, BLACKLIST);

  let watchedDevices: string[] = [];

  chokidar.watch("/Volumes", { depth: 0 }).on("addDir", async volumePath => {
    await new Promise(res => setTimeout(res, 1000));
    const volumeLogger = logger.child({ volume: path.basename(volumePath) });
    if (volumePath.split("/").length !== 3) {
      return;
    }

    if (BLACKLIST.map(b => `/Volumes/${b}`).includes(volumePath)) {
      return;
    }

    volumeLogger.debug("Detected a new volume");

    await indexer.indexVolume(volumePath, volumeLogger);
    watchedDevices.push(volumePath);
  });

  startServer(logger.child({ component: "Server" }), cachePath);
};

main();
