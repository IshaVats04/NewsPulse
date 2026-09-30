import random
from datetime import datetime, timezone, timedelta
from db import get_connection, is_postgres

def align_all_dates_to_today():
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc)

    if is_postgres():
        cursor.execute("SELECT id, published_at FROM articles ORDER BY published_at ASC")
    else:
        cursor.execute("SELECT id, published_at FROM articles ORDER BY published_at ASC")

    rows = cursor.fetchall()
    print(f"Aligning {len(rows)} articles to current date & time ({now.strftime('%Y-%m-%d')}):")

    for i, row in enumerate(rows):
        art_id = row[0]
        # Generate clean current time offset within today (0 to 12 hours ago)
        minutes_offset = random.randint(5, 720)
        new_published_dt = now - timedelta(minutes=minutes_offset)
        new_iso = new_published_dt.isoformat()

        if is_postgres():
            cursor.execute("UPDATE articles SET published_at = %s WHERE id = %s", (new_iso, art_id))
        else:
            cursor.execute("UPDATE articles SET published_at = ? WHERE id = ?", (new_iso, art_id))

    # Update cluster first_article_time and last_article_time
    if is_postgres():
        cursor.execute("""
            UPDATE clusters
            SET first_article_time = (SELECT MIN(published_at) FROM articles WHERE cluster_id = clusters.id),
                last_article_time = (SELECT MAX(published_at) FROM articles WHERE cluster_id = clusters.id)
            WHERE id IN (SELECT DISTINCT cluster_id FROM articles WHERE cluster_id IS NOT NULL)
        """)
    else:
        cursor.execute("""
            UPDATE clusters
            SET first_article_time = (SELECT MIN(published_at) FROM articles WHERE cluster_id = clusters.id),
                last_article_time = (SELECT MAX(published_at) FROM articles WHERE cluster_id = clusters.id)
            WHERE id IN (SELECT DISTINCT cluster_id FROM articles WHERE cluster_id IS NOT NULL)
        """)

    conn.commit()
    conn.close()
    print("All article and cluster timestamps successfully aligned to current date & time!")

if __name__ == "__main__":
    align_all_dates_to_today()
