import hashlib
import numpy as np
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def extract_top_keywords(tfidf_matrix, vectorizer, article_indices, top_n=3):
    """Extract highest-weighted TF-IDF terms for a group of articles."""
    feature_names = np.array(vectorizer.get_feature_names_out())
    # Mean TF-IDF vector across cluster articles
    cluster_tfidf = tfidf_matrix[article_indices].mean(axis=0)
    cluster_tfidf_arr = np.asarray(cluster_tfidf).flatten()
    top_indices = cluster_tfidf_arr.argsort()[::-1][:top_n]
    
    top_terms = [feature_names[i] for i in top_indices if cluster_tfidf_arr[i] > 0]
    return [term.title() for term in top_terms]

def cluster_articles_tfidf(articles, similarity_threshold=0.22):
    """
    Groups articles into topic clusters using TF-IDF vectorization and cosine similarity graph components.
    
    :param articles: List of article dicts with 'title', 'summary', 'content', 'published_at'
    :param similarity_threshold: Minimum cosine similarity threshold to consider articles in same topic
    :return: List of cluster objects with associated article IDs and metadata
    """
    if not articles:
        return []

    # 1. Combine title (weighted x2) + summary + content snippet for TF-IDF representation
    texts = []
    for art in articles:
        title = art.get('title', '')
        summary = art.get('summary', '')
        content = art.get('content', '')[:300] if art.get('content') else ''
        # Weight title heavier for topic alignment
        combined_text = f"{title} {title} {summary} {content}".strip()
        texts.append(combined_text)

    # 2. Build TF-IDF matrix
    vectorizer = TfidfVectorizer(
        stop_words='english',
        max_features=5000,
        ngram_range=(1, 2),
        min_df=1
    )
    tfidf_matrix = vectorizer.fit_transform(texts)

    # 3. Compute Cosine Similarity Matrix
    sim_matrix = cosine_similarity(tfidf_matrix)
    n_articles = len(articles)

    # 4. Connected Components graph clustering
    visited = [False] * n_articles
    raw_clusters = []

    for i in range(n_articles):
        if visited[i]:
            continue

        cluster_indices = [i]
        visited[i] = True
        queue = [i]

        while queue:
            curr = queue.pop(0)
            for neighbor in range(n_articles):
                if not visited[neighbor] and sim_matrix[curr][neighbor] >= similarity_threshold:
                    visited[neighbor] = True
                    cluster_indices.append(neighbor)
                    queue.append(neighbor)

        raw_clusters.append(cluster_indices)

    # 5. Format clusters and generate auto-labels
    clusters = []
    for idx_list in raw_clusters:
        cluster_articles = [articles[idx] for idx in idx_list]
        
        # Sort articles by published date
        cluster_articles.sort(key=lambda x: str(x['published_at']))

        first_time = cluster_articles[0]['published_at']
        last_time = cluster_articles[-1]['published_at']

        # Generate top keywords
        keywords = extract_top_keywords(tfidf_matrix, vectorizer, idx_list, top_n=3)

        # Generate human-readable label
        if keywords:
            label = " & ".join(keywords)
        else:
            # Fallback label to headline
            label = cluster_articles[0]['title'][:50] + "..."

        # Generate stable cluster ID based on label + timestamp
        cluster_id_raw = f"{label}_{first_time}"
        cluster_id = "cluster_" + hashlib.md5(cluster_id_raw.encode('utf-8')).hexdigest()[:12]

        clusters.append({
            "id": cluster_id,
            "label": label,
            "keywords": ", ".join(keywords),
            "article_count": len(cluster_articles),
            "first_article_time": first_time,
            "last_article_time": last_time,
            "articles": cluster_articles
        })

    return clusters
