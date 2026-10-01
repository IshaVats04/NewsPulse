const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'sqlite:///../scraper/news.db';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let pgPool = null;
let sqliteDb = null;
let pgSchemaInitialized = false;

async function initPgSchema(pool) {
  if (pgSchemaInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clusters (
        id VARCHAR(64) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        keywords TEXT,
        article_count INT DEFAULT 0,
        first_article_time TIMESTAMP WITH TIME ZONE,
        last_article_time TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(64) PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        url TEXT UNIQUE NOT NULL,
        source VARCHAR(100) NOT NULL,
        published_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        cluster_id VARCHAR(64) REFERENCES clusters(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS ingestion_jobs (
        id VARCHAR(64) PRIMARY KEY,
        status VARCHAR(30) NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        articles_fetched INT DEFAULT 0,
        clusters_created INT DEFAULT 0,
        error_message TEXT,
        logs TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
      CREATE INDEX IF NOT EXISTS idx_articles_cluster_id ON articles(cluster_id);
      CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
    `);
    pgSchemaInitialized = true;
    console.log('PostgreSQL database schema initialized successfully');
  } catch (err) {
    console.error('Error initializing PostgreSQL schema:', err);
  }
}

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
      await initPgSchema(pgPool);
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
