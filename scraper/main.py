import sys
import os
import uuid
import traceback
from datetime import datetime, timezone

from db import get_connection, init_db, is_postgres
from extractor import fetch_articles_from_feeds, fetch_full_text
from clustering import cluster_articles_tfidf

import random

def run_pipeline(job_id=None, target_date=None):
    """Main ingestion and clustering pipeline runner."""
    if not job_id:
        job_id = f"job_{uuid.uuid4().hex[:10]}"

    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    log_messages = []
    def log(msg):
        print(msg)
        log_messages.append(f"[{datetime.now(timezone.utc).isoformat()}] {msg}")

    log(f"Starting News Pulse pipeline run (Job ID: {job_id}, Target Date: {target_date or 'Live/Current'})...")

    # Record job in DB
    try:
        if is_postgres():
            cursor.execute("""
                INSERT INTO ingestion_jobs (id, status, started_at, logs)
                VALUES (%s, %s, CURRENT_TIMESTAMP, %s)
                ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, logs = EXCLUDED.logs
            """, (job_id, 'running', "\n".join(log_messages)))
        else:
            cursor.execute("""
                INSERT INTO ingestion_jobs (id, status, started_at, logs)
                VALUES (?, ?, CURRENT_TIMESTAMP, ?)
                ON CONFLICT(id) DO UPDATE SET status = excluded.status, logs = excluded.logs
            """, (job_id, 'running', "\n".join(log_messages)))
        conn.commit()
    except Exception as e:
        print(f"Warning: failed to write initial job record: {e}")

    articles_fetched_count = 0
    clusters_created_count = 0

    try:
        # Step 1: Ingest RSS Feeds
        log("Step 1: Ingesting articles from RSS feeds...")
        raw_articles = fetch_articles_from_feeds(max_per_feed=15)
        log(f"Fetched {len(raw_articles)} candidate articles from RSS feeds.")

        # If target_date is specified, assign published_at timestamps to target_date
        if target_date:
            log(f"Target date specified ({target_date}). Indexing articles for date {target_date}...")
            for i, art in enumerate(raw_articles):
                hour = (i * 2 + 6) % 24
                minute = (i * 17) % 60
                art['published_at'] = f"{target_date}T{hour:02d}:{minute:02d}:00.000Z"
                # Update article ID so url on target date is unique
                art['id'] = generate_article_id(f"{art['url']}_{target_date}")

        # Step 2: Filter existing articles from DB to ensure re-runnability
        new_articles = []
        for art in raw_articles:
            if is_postgres():
                cursor.execute("SELECT id FROM articles WHERE url = %s", (art['url'],))
            else:
                cursor.execute("SELECT id FROM articles WHERE url = ?", (art['url'],))
            
            if not cursor.fetchone():
                new_articles.append(art)

        log(f"Identified {len(new_articles)} new articles not currently in database.")

        # Step 3: Fetch full text for new articles
        log("Step 3: Extracting full text body content for new articles...")
        for i, art in enumerate(new_articles):
            log(f"Extracting content [{i+1}/{len(new_articles)}]: {art['title'][:40]}...")
            art['content'] = fetch_full_text(art['url'])

        # Insert new articles into database
        for art in new_articles:
            if is_postgres():
                cursor.execute("""
                    INSERT INTO articles (id, title, summary, content, url, source, published_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (url) DO NOTHING
                """, (art['id'], art['title'], art['summary'], art['content'], art['url'], art['source'], art['published_at']))
            else:
                cursor.execute("""
                    INSERT INTO articles (id, title, summary, content, url, source, published_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(url) DO NOTHING
                """, (art['id'], art['title'], art['summary'], art['content'], art['url'], art['source'], art['published_at']))
            articles_fetched_count += 1
        
        conn.commit()
        log(f"Saved {articles_fetched_count} new articles to database.")

        # Step 4: Fetch articles from DB to run TF-IDF clustering
        log("Step 4: Running TF-IDF clustering across article corpus...")
        if is_postgres():
            cursor.execute("SELECT id, title, summary, content, url, source, published_at FROM articles")
            rows = cursor.fetchall()
            corpus = [{
                'id': r[0], 'title': r[1], 'summary': r[2], 'content': r[3],
                'url': r[4], 'source': r[5], 'published_at': str(r[6])
            } for r in rows]
        else:
            cursor.execute("SELECT id, title, summary, content, url, source, published_at FROM articles")
            rows = cursor.fetchall()
            corpus = [{
                'id': dict(r)['id'], 'title': dict(r)['title'], 'summary': dict(r)['summary'],
                'content': dict(r)['content'], 'url': dict(r)['url'], 'source': dict(r)['source'],
                'published_at': str(dict(r)['published_at'])
            } for r in rows]

        clusters = cluster_articles_tfidf(corpus, similarity_threshold=0.20)
        clusters_created_count = len(clusters)
        log(f"Clustering complete. Formed {clusters_created_count} topic clusters.")

        # Step 5: Save clusters and update article references
        for cl in clusters:
            if is_postgres():
                cursor.execute("""
                    INSERT INTO clusters (id, label, keywords, article_count, first_article_time, last_article_time, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (id) DO UPDATE SET
                        label = EXCLUDED.label,
                        keywords = EXCLUDED.keywords,
                        article_count = EXCLUDED.article_count,
                        first_article_time = EXCLUDED.first_article_time,
                        last_article_time = EXCLUDED.last_article_time,
                        updated_at = CURRENT_TIMESTAMP
                """, (cl['id'], cl['label'], cl['keywords'], cl['article_count'], cl['first_article_time'], cl['last_article_time']))

                # Update cluster_id on articles
                for art in cl['articles']:
                    cursor.execute("UPDATE articles SET cluster_id = %s WHERE id = %s", (cl['id'], art['id']))
            else:
                cursor.execute("""
                    INSERT INTO clusters (id, label, keywords, article_count, first_article_time, last_article_time, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(id) DO UPDATE SET
                        label = excluded.label,
                        keywords = excluded.keywords,
                        article_count = excluded.article_count,
                        first_article_time = excluded.first_article_time,
                        last_article_time = excluded.last_article_time,
                        updated_at = CURRENT_TIMESTAMP
                """, (cl['id'], cl['label'], cl['keywords'], cl['article_count'], cl['first_article_time'], cl['last_article_time']))

                for art in cl['articles']:
                    cursor.execute("UPDATE articles SET cluster_id = ? WHERE id = ?", (cl['id'], art['id']))

        conn.commit()
        log("Updated clusters and article associations in database.")

        # Mark job as completed
        if is_postgres():
            cursor.execute("""
                UPDATE ingestion_jobs
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                    articles_fetched = %s, clusters_created = %s, logs = %s
                WHERE id = %s
            """, (articles_fetched_count, clusters_created_count, "\n".join(log_messages), job_id))
        else:
            cursor.execute("""
                UPDATE ingestion_jobs
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                    articles_fetched = ?, clusters_created = ?, logs = ?
                WHERE id = ?
            """, (articles_fetched_count, clusters_created_count, "\n".join(log_messages), job_id))
        conn.commit()
        log(f"Pipeline finished successfully! (Job ID: {job_id})")

    except Exception as err:
        err_str = traceback.format_exc()
        log(f"FATAL ERROR in pipeline: {err_str}")
        try:
            if is_postgres():
                cursor.execute("""
                    UPDATE ingestion_jobs
                    SET status = 'failed', completed_at = CURRENT_TIMESTAMP,
                        error_message = %s, logs = %s
                    WHERE id = %s
                """, (str(err), "\n".join(log_messages), job_id))
            else:
                cursor.execute("""
                    UPDATE ingestion_jobs
                    SET status = 'failed', completed_at = CURRENT_TIMESTAMP,
                        error_message = ?, logs = ?
                    WHERE id = ?
                """, (str(err), "\n".join(log_messages), job_id))
            conn.commit()
        except Exception:
            pass
    finally:
        conn.close()

if __name__ == "__main__":
    job_arg = sys.argv[1] if len(sys.argv) > 1 else None
    date_arg = sys.argv[2] if len(sys.argv) > 2 else None
    run_pipeline(job_arg, date_arg)
