import express from "express";
import pino from "pino";
import { OutputItem } from "../types/alfred";
import { Search } from "./database";
import { formatRelative } from "date-fns";

const FOLDER_ICON =
  "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/AllMyFiles.icns";
const FILE_ICON =
  "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns";

export const startServer = (
  logger: pino.Logger,
  dbFolder: string,
  port = 19800,
) => {
  const app = express();
  const db = new Search(dbFolder);

  app.get("/alfred", (req, res) => {
    logger.debug({ query: req.query.query }, "Search query");

    if (!req.query.query) {
      return res.status(400).json({ error: "Missing 'query' parameter." });
    }

    const alfredResults: OutputItem[] = db.searchFiles(req.query.query).map(
      f =>
        ({
          title: f.name,
          subtitle: `${f.label} · Last seen: ${formatRelative(
            f.last_seen,
            Date.now(),
          )}`,
          arg: f.label,
          icon: {
            path: f.file_type === "File" ? FILE_ICON : FOLDER_ICON,
          },
          uid: f.file_id,
        } as OutputItem),
    );

    res.json({ items: alfredResults });
  });

  app.listen(port, "::1");
  logger.info({ port }, "Server is listening");

  return app;
};
