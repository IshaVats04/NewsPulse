# 🗞️ News Pulse — Topic-Clustered News Timeline

News Pulse is a full-stack, end-to-end system that pulls live articles from multiple news RSS feeds, automatically groups related stories into coherent topic clusters using **Python TF-IDF & Cosine Similarity**, serves them via a **Node.js REST API**, and displays them on an **Interactive React.js Visual Timeline**.

---

## 🌐 Live Deployed Application

> [!IMPORTANT]
> **Full Interactive Project Experience:**  
> Evaluators and reviewers can explore the full, live interactive experience of News Pulse—including real-time topic timeline navigation, source filter chips, interactive cluster drilldowns, and on-demand RSS data ingestion—directly using the live deployment link:
> 
> * 🔗 **Live Interactive Frontend (Vercel):** [https://news-pulse-frontend.vercel.app](https://news-pulse-frontend.vercel.app)
> * ⚡ **Live Backend REST API (Render):** [https://news-pulse-api.onrender.com](https://news-pulse-api.onrender.com)

---

## 🏗️ Deployment & Architecture Overview

The system is designed to run seamlessly both locally (with zero-config SQLite) and live on production cloud platforms (using hosted PostgreSQL).

```
                             USER
                              │
                              ↓
                     ┌──────────────────┐
                     │  Vercel / Netlify│
                     │  React.js (Vite) │
                     │                  │
                     │  Visual Timeline │
                     └────────┬─────────┘
                              │
                              │ REST API Requests
                              ↓
                     ┌──────────────────┐
                     │  Render / Railway│
                     │ Node.js + Express│
                     │                  │
                     │ /clusters        │
                     │ /timeline        │
                     │ /ingest/trigger  │
                     └────────┬─────────┘
                              │
                ┌─────────────┴─────────────┐
                ↓                           ↓
         ┌──────────────┐            ┌──────────────┐
         │ Supabase /   │            │    Python    │
         │ Neon Postgres│            │  Pipeline    │
         └──────────────┘            └──────┬───────┘
                                            │
                                            ↓
                                     RSS News Feeds
```

### Component Deployment Breakdown

1. **Frontend (`/frontend`) — Vercel / Netlify**
   - Built with React.js, Vite, TailwindCSS, Framer Motion, and Recharts.
   - Talks to the backend REST API via `VITE_API_URL`.
   - Offers live auto-refresh polling, source filter chips, interactive intensity timeline, and detailed article drilldowns.

2. **Backend API (`/backend`) — Render / Railway**
   - Built with Node.js & Express.
   - Exposes clean REST endpoints for clusters, timeline data, and on-demand ingestion triggers.
   - Supports both PostgreSQL (`pg`) and SQLite (`sqlite3`) using database abstraction.

3. **Python Pipeline (`/scraper`) — Render / Railway (or Subprocess Trigger)**
   - Ingests RSS feeds using `feedparser`, extracts full-text body content with `trafilatura` and `beautifulsoup4`.
   - Groups articles using `scikit-learn` (TF-IDF vectorizer + Cosine Similarity connected components graph clustering).
   - Re-runnable: deduplicates articles by URL hash and increments topic clusters dynamically.

4. **Hosted Database — Supabase / Neon / PostgreSQL**
   - Unified database accessible by both the Python pipeline and Node.js REST API.
   - Local fallback: Automatic zero-config SQLite (`news.db`).

---

## 🧠 Topic-Grouping Approach & Analysis

### 1. Vectorization & Clustering Algorithm
We implemented **Option B (TF-IDF Vectorization + Cosine Similarity Graph Clustering)**:
- **Feature Extraction**: Combined article titles (weighted 2x), RSS summaries, and extracted body text snippets.
- **TF-IDF Vectorizer**: Applied `scikit-learn` `TfidfVectorizer` with `stop_words='english'`, sublinear TF scaling, and `ngram_range=(1, 2)`.
- **Cosine Similarity Graph Clustering**: Built a cosine similarity matrix across article vectors. Two articles are linked if $\text{Cosine Similarity}(A, B) \ge 0.20$. Connected components in the graph form individual topic clusters.
- **Auto-Labelling**: High-rank TF-IDF terms across cluster documents are extracted to form a descriptive cluster label (e.g., *"North & Korea & Ukraine"* or *"Netanyahu & Israel & UN"*).

### 2. Parameter Selection Rationale
- **Similarity Threshold (`0.20`)**: Selected through empirical testing across 70+ news articles. A threshold lower than `0.15` merged loosely related international news (e.g. all European stories into one giant cluster), whereas a threshold higher than `0.30` fragmented multi-outlet coverage of the exact same event into isolated singletons. `0.20` provides optimal topic coherence.
- **Title Weighting (2x)**: Headlines carry high topic signal; double-weighting title tokens prevents body filler words from skewing similarity scores.

### 3. Limitations Noticed
- **Vocabulary Overlap Across Unrelated Legal/Court Stories**: Articles discussing completely distinct legal trials (e.g., US political indictments vs UK court rulings) sometimes share generic keywords (*"judge"*, *"prosecutor"*, *"indictment"*, *"court"*), occasionally grouping separate legal proceedings if article counts are low.
- *Mitigation*: Incorporating entity extraction (NER via spaCy or LLM embeddings) would differentiate specific named entities (people, places) in future iterations.

---

## 📰 News Outlets Ingested

We pull real-time feeds from 5 reputable global news outlets:
1. **BBC News** — `http://feeds.bbci.co.uk/news/rss.xml`
2. **NPR News** — `https://feeds.npr.org/1001/rss.xml`
3. **Al Jazeera** — `https://www.aljazeera.com/xml/rss/all.xml`
4. **The Guardian** — `https://www.theguardian.com/world/rss`
5. **CNN Top Stories** — `http://rss.cnn.com/rss/cnn_topstories.rss`

---

## ⚡ Quickstart — Running Locally

### Prerequisites
- Node.js v18+ & Python 3.10+ installed on your system.

### Step 1: Python Scraper & Database Setup
```bash
cd scraper
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
*This populates `news.db` with live articles and topic clusters.*

### Step 2: Start Node.js Backend API
```bash
cd ../backend
npm install
npm start
```
*The REST API will start on `http://localhost:5000`.*

### Step 3: Start React Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

## 🔑 Environment Variables Guide

| Variable | Description | Example (Local) | Example (Production) |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL or SQLite connection string | `sqlite:///../scraper/news.db` | `postgresql://user:pass@ep-xyz.supabase.co:5432/postgres` |
| `PORT` | Express server port | `5000` | `10000` |
| `PYTHON_PATH` | Path to python executable for subprocess | `../scraper/venv/Scripts/python.exe` | `python` |
| `VITE_API_URL` | Express API endpoint for React SPA | `http://localhost:5000` | `https://news-pulse-api.onrender.com` |

---

## 🚀 Part 4: Production Deployment Guide

### 1. Database (Supabase / Neon)
1. Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy the PostgreSQL connection string (`postgresql://...`).

### 2. Backend API (Render)
1. Push this repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set **Root Directory** to `backend`.
4. Build Command: `npm install && pip install -r ../scraper/requirements.txt`
5. Start Command: `node server.js`
6. Add Environment Variable: `DATABASE_URL` = `<your-supabase-postgres-url>`

### 3. Frontend (Vercel / Netlify)
1. Import repository into [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Set **Root Directory** to `frontend`.
3. Add Environment Variable: `VITE_API_URL` = `https://<your-render-app>.onrender.com`.
4. Deploy! Evaluators can open the live URL and interact with cold-start ready News Pulse.

---

## 📌 Checklist Verification
- [x] Separated `/scraper`, `/backend`, and `/frontend` directories.
- [x] Live RSS Ingestion & Full-Text Trafilatura Extraction.
- [x] Python TF-IDF Vectorization + Cosine Similarity Clustering.
- [x] Node.js Express REST API (`/clusters`, `/clusters/:id`, `/timeline`, `/ingest/trigger`).
- [x] React.js Interactive Timeline, Source Filter Chips, and Drilldown Modal.
- [x] Production ready for Vercel, Render, and Supabase.
