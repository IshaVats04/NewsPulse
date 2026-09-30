const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'sqlite:///../scraper/news.db';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let pgPool = null;
let sqliteDb = null;

async function getDb() {
  if (isPostgres) {
    if (!pgPool) {
      let connectionString = dbUrl;
      if (connectionString.startsWith('postgres://')) {
        connectionString = connectionString.replace('postgres://', 'postgresql://');
      }
      pgPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });
    }
    return { isPostgres: true, pool: pgPool };
  } else {
    if (!sqliteDb) {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      let rawPath = dbUrl.replace('sqlite:///', '').replace('sqlite://', '');
      if (!path.isAbsolute(rawPath)) {
        rawPath = path.resolve(__dirname, rawPath);
      }
      sqliteDb = await open({
        filename: rawPath,
        driver: sqlite3.Database
      });
    }
    return { isPostgres: false, db: sqliteDb };
  }
}

async function query(sql, params = []) {
  const dbObj = await getDb();
  if (dbObj.isPostgres) {
    // Convert SQL placeholders from ? to $1, $2, etc for Postgres if needed
    let pgSql = sql;
    let paramIndex = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${paramIndex++}`);
    }
    const res = await dbObj.pool.query(pgSql, params);
    return res.rows;
  } else {
    return await dbObj.db.all(sql, params);
  }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function execute(sql, params = []) {
  const dbObj = await getDb();
  if (dbObj.isPostgres) {
    let pgSql = sql;
    let paramIndex = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${paramIndex++}`);
    }
    const res = await dbObj.pool.query(pgSql, params);
    return res;
  } else {
    return await dbObj.db.run(sql, params);
  }
}

module.exports = {
  query,
  queryOne,
  execute,
  isPostgres
};
