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

// API Routes
app.use('/clusters', clustersRouter);
app.use('/timeline', timelineRouter);
app.use('/ingest', ingestRouter);

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
      sources: 'GET /ingest/sources'
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 News Pulse Backend Server running on http://localhost:${PORT}`);
});
