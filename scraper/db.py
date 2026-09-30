import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./news.db")

def is_postgres():
    return DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")

def get_connection():
    if is_postgres():
        # Handle Render / Heroku postgres:// -> postgresql:// if needed
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(url)
        return conn
    else:
        # SQLite path extraction
        db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        if not db_path:
            db_path = "news.db"
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    if is_postgres():
        # PostgreSQL Schema
        cursor.execute("""
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
        """)
    else:
        # SQLite Schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clusters (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                keywords TEXT,
                article_count INTEGER DEFAULT 0,
                first_article_time TEXT,
                last_article_time TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                summary TEXT,
                content TEXT,
                url TEXT UNIQUE NOT NULL,
                source TEXT NOT NULL,
                published_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                cluster_id TEXT,
                FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE SET NULL
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ingestion_jobs (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                started_at TEXT DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                articles_fetched INTEGER DEFAULT 0,
                clusters_created INTEGER DEFAULT 0,
                error_message TEXT,
                logs TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_cluster_id ON articles(cluster_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);")

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
