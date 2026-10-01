const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const clustersRouter = require('./routes/clusters');
const timelineRouter = require('./routes/timeline');
const ingestRouter = require('./routes/ingest');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend domain
app.use(cors());
app.use(express.json());

// API Routes (Mounted under both direct paths and /api prefixes for full deployment compatibility)
app.use('/clusters', clustersRouter);
app.use('/api/clusters', clustersRouter);

app.use('/timeline', timelineRouter);
app.use('/api/timeline', timelineRouter);

app.use('/ingest', ingestRouter);
app.use('/api/ingest', ingestRouter);

// Direct aliases
app.get('/sources', (req, res) => res.redirect(307, '/ingest/sources'));
app.get('/api/sources', (req, res) => res.redirect(307, '/ingest/sources'));

// Healthcheck / Root overview
app.get('/', (req, res) => {
  res.json({
    name: 'News Pulse REST API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      clusters: 'GET /clusters',
      cluster_detail: 'GET /clusters/:id',
      timeline: 'GET /timeline',
      trigger_ingest: 'POST /ingest/trigger',
      job_status: 'GET /ingest/status/:jobId',
      sources: 'GET /ingest/sources',
      debug_date: 'GET /ingest/debug/:date'
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint Not Found', path: req.originalUrl });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 News Pulse Backend Server running on http://localhost:${PORT}`);
});
