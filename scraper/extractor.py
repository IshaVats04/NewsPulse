import hashlib
import random
from datetime import datetime, timezone, timedelta
import feedparser
import requests
import trafilatura
from bs4 import BeautifulSoup
from rss_config import FEEDS

def generate_article_id(url: str) -> str:
    """Generate deterministic ID based on URL hash."""
    return hashlib.sha256(url.encode('utf-8')).hexdigest()[:16]

def parse_date(entry, index_offset: int = 0) -> str:
    """
    Normalize pubDate / updated / published field into ISO string.
    Ensures all ingested articles are aligned with current date & time.
    """
    now = datetime.now(timezone.utc)
    parsed_dt = None

    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        try:
            parsed_dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        except Exception:
            pass
    elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
        try:
            parsed_dt = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
        except Exception:
            pass
    
    if not parsed_dt:
        raw_date = entry.get('published') or entry.get('pubDate') or entry.get('updated')
        if raw_date:
            try:
                from email.utils import parsedate_to_datetime
                parsed_dt = parsedate_to_datetime(raw_date)
            except Exception:
                pass

    # If parsed_dt is missing or older than 24 hours / different day, align it to TODAY with recent time offset
    if not parsed_dt or (now - parsed_dt) > timedelta(hours=24) or parsed_dt.year != now.year or parsed_dt > now:
        # Align within today (between 5 mins ago and 12 hours ago)
        minutes_ago = (index_offset * 12 + random.randint(5, 45)) % 720
        parsed_dt = now - timedelta(minutes=minutes_ago)

    return parsed_dt.isoformat()

def clean_html(raw_html: str) -> str:
    """Strip HTML tags from summary/content."""
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    return soup.get_text(separator=" ", strip=True)

def fetch_full_text(url: str, timeout: int = 8) -> str:
    """Extract full body text from article URL using Trafilatura with BeautifulSoup fallback."""
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            extracted = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
            if extracted and len(extracted.strip()) > 50:
                return extracted.strip()
    except Exception:
        pass

    # Fallback to BeautifulSoup if Trafilatura fails
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsPulseScraper/1.0"}
        resp = requests.get(url, headers=headers, timeout=timeout)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.content, "html.parser")
            for elem in soup(["script", "style", "nav", "header", "footer", "aside"]):
                elem.decompose()
            paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 30]
            if paragraphs:
                return "\n\n".join(paragraphs)
    except Exception:
        pass

    return ""

def fetch_articles_from_feeds(max_per_feed: int = 15):
    """Fetch and normalize articles across configured RSS feeds."""
    all_articles = []
    
    for feed_info in FEEDS:
        print(f"Fetching RSS feed: {feed_info['name']} ({feed_info['url']})")
        try:
            feed = feedparser.parse(feed_info['url'])
            count = 0
            
            for entry in feed.entries:
                if count >= max_per_feed:
                    break

                url = entry.get('link') or entry.get('guid')
                if not url:
                    continue

                title = entry.get('title', '').strip()
                if not title:
                    continue

                raw_summary = entry.get('summary') or entry.get('description') or ""
                if not raw_summary and 'content' in entry and len(entry['content']) > 0:
                    raw_summary = entry['content'][0].get('value', '')

                clean_summary_text = clean_html(raw_summary)
                pub_date_iso = parse_date(entry, index_offset=count)
                article_id = generate_article_id(url)

                all_articles.append({
                    "id": article_id,
                    "title": title,
                    "summary": clean_summary_text,
                    "url": url,
                    "source": feed_info['name'],
                    "published_at": pub_date_iso,
                    "raw_entry": entry
                })
                count += 1
        except Exception as e:
            print(f"Error fetching feed {feed_info['name']}: {e}")

    return all_articles
