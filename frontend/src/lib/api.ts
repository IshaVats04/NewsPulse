const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

export async function fetchTimeline(selectedSources: string[] = [], selectedDate: string = ''): Promise<Cluster[]> {
  const url = new URL(`${API_BASE_URL}/timeline`);
  if (selectedSources.length > 0) {
    url.searchParams.append('source', selectedSources.join(','));
  }
  if (selectedDate) {
    url.searchParams.append('date', selectedDate);
  }
  const data = await safeFetchJson(url.toString());
  return data && data.success && Array.isArray(data.data) ? data.data : [];
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
  return data && data.success ? data.data : null;
}

export async function fetchSources(): Promise<string[]> {
  const data = await safeFetchJson(`${API_BASE_URL}/ingest/sources`);
  return data && data.success && Array.isArray(data.data) ? data.data : [];
}

export async function triggerIngestion(): Promise<{ jobId: string; status: string } | null> {
  const data = await safeFetchJson(`${API_BASE_URL}/ingest/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return data && data.success ? { jobId: data.jobId, status: data.status } : null;
}

export async function fetchIngestStatus(jobId: string): Promise<IngestionJob | null> {
  const data = await safeFetchJson(`${API_BASE_URL}/ingest/status/${jobId}`);
  return data && data.success ? data.data : null;
}
