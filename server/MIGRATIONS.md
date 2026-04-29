# Database Migrations

This server uses SQL migration files in `server/migrations`.

## Run migrations locally

From `server` directory:

```bash
npm run migrate
```

Optional custom DB path:

```bash
npm run migrate -- --db /absolute/path/to/moviedb.sqlite
```

## Production flow

1. Pull the new server code.
2. Run migrations against the production SQLite file.
3. Start/restart the server.

Example:

```bash
npm run migrate -- --db /path/to/prod/moviedb.sqlite
```

## Conventions

- One migration per schema/data change.
- Use incremental file names like `002_add_x.sql`.
- Never edit an already applied migration file.
- Add a new migration file for every new change.
