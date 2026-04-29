const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function parseArgs(argv) {
  const args = { db: path.join(__dirname, 'moviedb.sqlite') };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--db' && argv[i + 1]) {
      args.db = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function ensureMigrationsTable(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `).run();
}

function getMigrationFiles(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function getAppliedVersions(db) {
  const rows = db.prepare('SELECT version FROM schema_migrations').all();
  return new Set(rows.map((row) => row.version));
}

function applyMigration(db, filePath, version) {
  const sql = fs.readFileSync(filePath, 'utf8');

  const tx = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
      .run(version, new Date().toISOString());
  });

  tx();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const migrationsDir = path.join(__dirname, 'migrations');
  const db = new Database(args.db);

  try {
    ensureMigrationsTable(db);

    const files = getMigrationFiles(migrationsDir);
    const applied = getAppliedVersions(db);

    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    pending.forEach((file) => {
      const fullPath = path.join(migrationsDir, file);
      applyMigration(db, fullPath, file);
      console.log(`Applied migration: ${file}`);
    });

    console.log(`Done. Applied ${pending.length} migration(s).`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
