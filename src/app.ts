import electron from "electron";
import open from "open";
import path from "path";
import AutoLaunch from "auto-launch";
import { setup, BLACKLIST } from ".";
import Indexer from "./indexer";
import { startServer } from "./server";

const APP_NAME = "Spotlight Offline";

const app = electron.app;

var autoLauncher = new AutoLaunch({
  name: APP_NAME,
  mac: {
    useLaunchAgent: true,
  },
});

let trayStatus = "Starting...";
const buildMenu = async (devices: Set<string>, status: string = trayStatus) => (
  (trayStatus = status),
  electron.Menu.buildFromTemplate([
    {
      label: "Open at Login",
      type: "checkbox",
      checked: await autoLauncher.isEnabled(),
      click: ({ checked }) =>
        checked ? autoLauncher.enable() : autoLauncher.disable(),
    },
    { type: "separator" },
    {
      type: "normal",
      label: status,
      enabled: false,
    },
    { type: "separator" },
    ...Array.from(devices).map(
      d =>
        ({
          type: "normal",
          label: path.basename(d),
          click: () => open(d),
        } as electron.MenuItemConstructorOptions),
    ),
    { type: "separator" },
    { type: "normal", label: "Quit", click: () => app.quit() },
  ])
);

const selectIcon = (darkMode: boolean) =>
  darkMode ? "icons/icon-white@2x.png" : "icons/icon-black@2x.png";

app.on("ready", async () => {
  app.dock.hide();
  const tray = new electron.Tray(
    selectIcon(electron.systemPreferences.isDarkMode()),
  );

  tray.setToolTip(APP_NAME);
  tray.setPressedImage(selectIcon(true));
  tray.setContextMenu(await buildMenu(new Set()));

  electron.systemPreferences.subscribeNotification(
    "AppleInterfaceThemeChangedNotification",
    () => tray.setImage(selectIcon(electron.systemPreferences.isDarkMode())),
  );

  const { logger, cachePath } = await setup();

  const indexer = new Indexer(
    cachePath,
    BLACKLIST,
    logger.child({ module: "Indexer" }),
  );

  indexer.on("status", async status =>
    tray.setContextMenu(await buildMenu(indexer.watchedDevices, status)),
  );
  indexer.on("device-added", async (_, devices) =>
    tray.setContextMenu(await buildMenu(devices)),
  );
  indexer.on("device-removed", async (_, devices) =>
    tray.setContextMenu(await buildMenu(devices)),
  );

  startServer(logger.child({ module: "Server" }), cachePath);
  tray.setContextMenu(await buildMenu(indexer.watchedDevices, "Idle"));
});
