import Database from "better-sqlite3";
import path from "path";

import { Device, IndexedFile } from "../indexer";

type SearchResult = IndexedFile &
  Device & { file_id: string; file_type: string };

export class Search {
  database: Database.Database;

  constructor(dbFolder: string) {
    this.database = new Database(path.join(dbFolder, "index.db"));
  }

  generateScore(result: SearchResult, query: string) {
    return result.name.toLowerCase().indexOf(query.toLowerCase());
  }

  searchFiles(query: string): SearchResult[] {
    return this.database
      .prepare(
        `SELECT *, file_index.id AS file_id, file_index.type AS file_type FROM file_index
         LEFT JOIN known_devices AS d ON device_id = d.id
         WHERE name LIKE ?`,
      )
      .all(`%${query}%`)
      .sort(
        (a: SearchResult, b: SearchResult) =>
          this.generateScore(a, query) - this.generateScore(b, query),
      );
  }
}
