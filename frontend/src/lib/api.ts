const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://news-pulse-api.onrender.com' : 'http://localhost:5000');

export interface Article {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  source: string;
  published_at: string;
}

export interface Cluster {
  id: string;
  label: string;
  keywords: string[];
  start_time: string;
  end_time: string;
  article_count: number;
  intensity: number;
  sources: string[];
  sample_articles?: Article[];
  articles?: Article[];
}

export interface IngestionJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  articles_fetched: number;
  clusters_created: number;
  error_message?: string;
  logs?: string[];
}

async function safeFetchJson(url: string, options: RequestInit = {}): Promise<any> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    
    if (!res.ok || !contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.warn(`Non-JSON or non-OK response from ${url}:`, res.status, text.slice(0, 100));
      return null;
    }
    
    return await res.json();
  } catch (err) {
    console.error(`Fetch error for ${url}:`, err);
    return null;
  }
}

function normalizeCluster(c: any): Cluster {
  const keywords = Array.isArray(c.keywords)
    ? c.keywords
    : (typeof c.keywords === 'string' ? c.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []);
  
  const sources = Array.isArray(c.sources) ? c.sources : [];

  const rawArticles = Array.isArray(c.sample_articles)
    ? c.sample_articles
    : (Array.isArray(c.articles) ? c.articles : []);

  const sample_articles: Article[] = rawArticles.map((art: any) => ({
    id: String(art.id || Math.random()),
    title: art.title || 'Untitled',
    summary: art.summary || '',
    content: art.content || '',
    url: art.url || '#',
    source: art.source || 'Unknown',
    published_at: art.published_at || art.publishedAt || art.start || new Date().toISOString()
  }));

  const count = Number(c.article_count ?? c.articleCount ?? sample_articles.length ?? 1);
  const intensity = typeof c.intensity === 'number' ? c.intensity : Math.min(10, Math.max(1, count * 1.5 + (sources.length > 1 ? 2 : 0)));

  return {
    id: String(c.id),
    label: c.label || 'Topic Cluster',
    keywords,
    start_time: c.start_time || c.start || new Date().toISOString(),
    end_time: c.end_time || c.end || c.start_time || c.start || new Date().toISOString(),
    article_count: count,
    intensity,
    sources,
    sample_articles,
    articles: sample_articles
  };
}

export async function fetchTimeline(selectedSources: string[] = [], selectedDate: string = ''): Promise<Cluster[]> {
  const url = new URL(`${API_BASE_URL}/timeline`);
  if (selectedSources.length > 0) {
    url.searchParams.append('source', selectedSources.join(','));
  }
  if (selectedDate) {
    url.searchParams.append('date', selectedDate);
  }
  const data = await safeFetchJson(url.toString());
  if (!data) return [];
  
  let rawList: any[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data.success && Array.isArray(data.data)) {
    rawList = data.data;
  } else if (Array.isArray(data.clusters)) {
    rawList = data.clusters;
  }

  return rawList.map(normalizeCluster);
}

export async function fetchClusterDetail(clusterId: string, selectedSources: string[] = [], selectedDate: string = ''): Promise<Cluster | null> {
  const url = new URL(`${API_BASE_URL}/clusters/${clusterId}`);
  if (selectedSources.length > 0) {
    url.searchParams.append('source', selectedSources.join(','));
  }
  if (selectedDate) {
    url.searchParams.append('date', selectedDate);
  }
  const data = await safeFetchJson(url.toString());
  if (!data) return null;
  const rawObj = data.success ? data.data : (data.id ? data : null);
  return rawObj ? normalizeCluster(rawObj) : null;
}

export async function fetchSources(): Promise<string[]> {
  const data = await safeFetchJson(`${API_BASE_URL}/ingest/sources`);
  if (!data) return ['BBC News', 'NPR News', 'Al Jazeera', 'The Guardian', 'CNN Top Stories'];
  if (data.success && Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return ['BBC News', 'NPR News', 'Al Jazeera', 'The Guardian', 'CNN Top Stories'];
}

export async function triggerIngestion(selectedDate?: string): Promise<{ jobId: string; status: string } | null> {
  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };
  if (selectedDate) {
    options.body = JSON.stringify({ date: selectedDate });
  }
  const data = await safeFetchJson(`${API_BASE_URL}/ingest/trigger`, options);
  if (!data) return null;
  if (data.success && data.jobId) {
    return { jobId: data.jobId, status: data.status || 'running' };
  }
  if (data.jobId || data.id) {
    return { jobId: data.jobId || data.id, status: data.status || 'running' };
  }
  return null;
}

export async function fetchIngestStatus(jobId: string): Promise<IngestionJob | null> {
  const data = await safeFetchJson(`${API_BASE_URL}/ingest/status/${jobId}`);
  if (!data) return null;
  const rawObj = data.success ? data.data : data;
  if (!rawObj) return null;
  return {
    id: rawObj.id || jobId,
    status: rawObj.status || 'completed',
    started_at: rawObj.started_at || new Date().toISOString(),
    completed_at: rawObj.completed_at,
    articles_fetched: rawObj.articles_fetched || 0,
    clusters_created: rawObj.clusters_created || 0,
    error_message: rawObj.error_message,
    logs: Array.isArray(rawObj.logs) ? rawObj.logs : (typeof rawObj.logs === 'string' ? rawObj.logs.split('\n') : [])
  };
}
