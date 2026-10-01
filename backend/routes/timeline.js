const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /timeline - Format clusters for timeline visualization with source & date filtering
router.get('/', async (req, res) => {
  try {
    const { source, date, start_date, end_date } = req.query;

    let clusterSql = `
      SELECT c.id, c.label, c.keywords, c.created_at,
             COUNT(a.id) as article_count,
             MIN(a.published_at) as start_time,
             MAX(a.published_at) as end_time
      FROM clusters c
      JOIN articles a ON a.cluster_id = c.id
    `;

    const whereClauses = [];
    const params = [];

    if (source) {
      const sourcesList = Array.isArray(source) ? source : source.split(',').map((s) => s.trim()).filter(Boolean);
      if (sourcesList.length > 0) {
        const placeholders = sourcesList.map(() => '?').join(',');
        whereClauses.push(`a.source IN (${placeholders})`);
        params.push(...sourcesList);
      }
    }

    if (date) {
      // Robust pattern matching for YYYY-MM-DD across space or 'T' ISO dates
      whereClauses.push('(a.published_at LIKE ? OR a.published_at LIKE ?)');
      params.push(`${date}%`, `%${date}%`);
    } else {
      if (start_date) {
        whereClauses.push('a.published_at >= ?');
        params.push(start_date);
      }
      if (end_date) {
        whereClauses.push('a.published_at <= ?');
        params.push(end_date);
      }
    }

    if (whereClauses.length > 0) {
      clusterSql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    clusterSql += `
      GROUP BY c.id, c.label, c.keywords, c.created_at
      HAVING COUNT(a.id) > 0
      ORDER BY start_time ASC
    `;

    let rawClusters = await query(clusterSql, params);

    // Fetch sources and sample articles for each cluster to enrich timeline data
    const timelineData = await Promise.all(
      rawClusters.map(async (c) => {
        let articleSql = 'SELECT id, title, source, url, published_at FROM articles WHERE cluster_id = ?';
        let articleParams = [c.id];

        if (source) {
          const sourcesList = Array.isArray(source) ? source : source.split(',').map((s) => s.trim()).filter(Boolean);
          if (sourcesList.length > 0) {
            const placeholders = sourcesList.map(() => '?').join(',');
            articleSql += ` AND source IN (${placeholders})`;
            articleParams.push(...sourcesList);
          }
        }

        if (date) {
          articleSql += ' AND (published_at LIKE ? OR published_at LIKE ?)';
          articleParams.push(`${date}%`, `%${date}%`);
        }

        articleSql += ' ORDER BY published_at ASC';

        let articles = await query(articleSql, articleParams);

        const uniqueSources = [...new Set(articles.map((a) => a.source))];
        const count = articles.length;

        const intensity = Math.min(10, Math.max(1, count * 1.5 + (uniqueSources.length > 1 ? 2 : 0)));

        return {
          id: c.id,
          label: c.label,
          keywords: c.keywords ? (typeof c.keywords === 'string' ? c.keywords.split(',').map((k) => k.trim()).filter(Boolean) : c.keywords) : [],
          start_time: c.start_time,
          end_time: c.end_time,
          article_count: count,
          intensity: Number(intensity.toFixed(1)),
          sources: uniqueSources,
          sample_articles: articles.slice(0, 3)
        };
      })
    );

    res.json({
      success: true,
      count: timelineData.length,
      data: timelineData
    });
  } catch (error) {
    console.error('Error generating timeline data:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
