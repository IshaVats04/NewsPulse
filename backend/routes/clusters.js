const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db');

// GET /clusters - List of topic clusters with article counts & date ranges
router.get('/', async (req, res) => {
  try {
    const { source } = req.query;

    let sql;
    let params = [];

    if (source) {
      const sourcesList = Array.isArray(source) ? source : source.split(',');
      const placeholders = sourcesList.map(() => '?').join(',');

      sql = `
        SELECT c.id, c.label, c.keywords, c.created_at, c.updated_at,
               COUNT(a.id) as article_count,
               MIN(a.published_at) as first_article_time,
               MAX(a.published_at) as last_article_time
        FROM clusters c
        JOIN articles a ON a.cluster_id = c.id
        WHERE a.source IN (${placeholders})
        GROUP BY c.id, c.label, c.keywords, c.created_at, c.updated_at
        HAVING COUNT(a.id) > 0
        ORDER BY last_article_time DESC
      `;
      params = sourcesList;
    } else {
      sql = `
        SELECT id, label, keywords, article_count, first_article_time, last_article_time, created_at, updated_at
        FROM clusters
        WHERE article_count > 0
        ORDER BY last_article_time DESC
      `;
    }

    const rawClusters = await query(sql, params);
    const clusters = rawClusters.map((c) => ({
      ...c,
      keywords: c.keywords ? c.keywords.split(',').map((k) => k.trim()).filter(Boolean) : []
    }));

    res.json({ success: true, count: clusters.length, data: clusters });
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// GET /clusters/:id - Full cluster detail with all articles, sorted chronologically
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { source, date } = req.query;

    const cluster = await queryOne('SELECT * FROM clusters WHERE id = ?', [id]);
    if (!cluster) {
      return res.status(404).json({ success: false, error: 'Cluster not found' });
    }

    let articleSql = 'SELECT id, title, summary, content, url, source, published_at FROM articles WHERE cluster_id = ?';
    let articleParams = [id];

    if (source) {
      const sourcesList = Array.isArray(source) ? source : source.split(',');
      const placeholders = sourcesList.map(() => '?').join(',');
      articleSql += ` AND source IN (${placeholders})`;
      articleParams.push(...sourcesList);
    }

    // Filter by date if provided
    if (date) {
      articleSql += ' AND (published_at LIKE ? OR published_at LIKE ?)';
      articleParams.push(`${date}%`, `%${date}%`);
    }

    articleSql += ' ORDER BY published_at ASC';

    let articles = await query(articleSql, articleParams);

    const keywordsArray = cluster.keywords
      ? (typeof cluster.keywords === 'string' ? cluster.keywords.split(',').map((k) => k.trim()).filter(Boolean) : cluster.keywords)
      : [];

    res.json({
      success: true,
      data: {
        ...cluster,
        keywords: keywordsArray,
        article_count: articles.length,
        articles
      }
    });
  } catch (error) {
    console.error(`Error fetching cluster ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
