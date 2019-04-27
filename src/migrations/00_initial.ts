export default `BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "file_index" (
	"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	"device_id"	INTEGER NOT NULL,
	"type"	TEXT NOT NULL,
	"name"	TEXT NOT NULL,
	"path"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "known_devices" (
	"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	"uuid"	TEXT NOT NULL,
	"label"	TEXT NOT NULL,
	"type"	TEXT NOT NULL,
	"first_seen"	INTEGER NOT NULL,
	"last_seen"	INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "known_devices_uuid" ON "known_devices" (
	"uuid"
);
CREATE INDEX IF NOT EXISTS "index_name" ON "file_index" (
	"name"	ASC
);
CREATE INDEX IF NOT EXISTS "index_path" ON "file_index" (
	"path"	ASC
);
COMMIT;`;
