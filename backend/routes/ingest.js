const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();
const { query, queryOne, execute, isPostgres } = require('../db');

// POST /ingest/trigger - Trigger Python pipeline subprocess
router.post('/trigger', async (req, res) => {
  try {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pythonExecutable = process.env.PYTHON_PATH || 'python';
    
    // Path to python scraper main.py
    const scraperScriptPath = path.resolve(__dirname, '../../scraper/main.py');

    console.log(`Triggering ingestion job ${jobId} with Python: ${pythonExecutable}`);

    // Insert job into database
    if (isPostgres) {
      await execute(
        `INSERT INTO ingestion_jobs (id, status, started_at, logs) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
        [jobId, 'running', `Triggered job ${jobId}`]
      );
    } else {
      await execute(
        `INSERT INTO ingestion_jobs (id, status, started_at, logs) VALUES (?, ?, CURRENT_TIMESTAMP, ?)`,
        [jobId, 'running', `Triggered job ${jobId}`]
      );
    }

    const targetDate = req.body && req.body.date ? req.body.date : null;
    const pyArgs = [scraperScriptPath, jobId];
    if (targetDate) {
      pyArgs.push(targetDate);
    }

    console.log(`Target date: ${targetDate || 'Live/Current'}`);
    console.log(`Python args: ${pyArgs.join(' ')}`);

    // Spawn Python subprocess non-blockingly with improved Windows handling
    const pyProcess = spawn(pythonExecutable, pyArgs, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr for better error handling
      windowsHide: true,
      shell: false, // Important: don't use shell to prevent CMD window
      cwd: path.resolve(__dirname, '../../scraper')
    });

    // Log any errors from the subprocess
    pyProcess.on('error', (err) => {
      console.error(`Python subprocess error for job ${jobId}:`, err);
    });

    pyProcess.unref();

    res.status(202).json({
      success: true,
      message: 'Ingestion pipeline triggered successfully',
      jobId,
      targetDate: targetDate || 'Live/Current',
      status: 'running'
    });
  } catch (error) {
    console.error('Error triggering ingestion:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger ingestion', message: error.message });
  }
});

// GET /ingest/status/:jobId - Poll job status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await queryOne('SELECT * FROM ingestion_jobs WHERE id = ?', [jobId]);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        started_at: job.started_at,
        completed_at: job.completed_at,
        articles_fetched: job.articles_fetched || 0,
        clusters_created: job.clusters_created || 0,
        error_message: job.error_message || null,
        logs: job.logs ? job.logs.split('\n') : []
      }
    });
  } catch (error) {
    console.error(`Error checking status for job ${req.params.jobId}:`, error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// GET /ingest/sources - Get list of unique news sources in DB
router.get('/sources', async (req, res) => {
  try {
    const rows = await query('SELECT DISTINCT source FROM articles WHERE source IS NOT NULL ORDER BY source ASC');
    const sources = rows.map((r) => r.source);
    res.json({ success: true, data: sources });
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// GET /ingest/debug/:date - Debug endpoint to check articles for a specific date
router.get('/debug/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const rows = await query(
      'SELECT id, title, source, published_at, cluster_id FROM articles WHERE published_at LIKE ? ORDER BY published_at ASC LIMIT 20',
      [`${date}%`]
    );
    res.json({
      success: true,
      date,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error debugging date:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
