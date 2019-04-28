import chokidar from "chokidar";
import fs from "fs-extra";
import os from "os";
import path from "path";
import pino from "pino";
import Indexer from "./indexer";
import { startServer } from "./server";

export const BLACKLIST = ["Macintosh HD", "BOOTCAMP", "GoogleDrive"];

export const setup = async () => {
  const logger = pino({ level: "debug" });
  const cachePath = path.join(os.homedir(), ".spotlight-offline");

  try {
    await fs.stat(cachePath);
  } catch (e) {
    await fs.mkdir(cachePath);
  }

  return { logger, cachePath };
};

const main = async () => {
  const { logger, cachePath } = await setup();
  new Indexer(cachePath, BLACKLIST, logger);
  startServer(logger.child({ component: "Server" }), cachePath);
};

// Run the daemon when called via CLI
if (require.main === module) {
  main();
}
