// ==================== 1. UPDATED APP.JS ====================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Import routes
const memoriesRouter = require('./routes/memories');
const questionsRouter = require('./routes/questions');
const scoresRouter = require('./routes/scores');
const feedbackRouter = require('./routes/feedback'); // NEW: Add feedback route

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads/photos');
console.log('Checking uploads directory at:', uploadsDir);

if (!fs.existsSync(uploadsDir)) {
    console.log('Creating uploads directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads directory created successfully');
} else {
    console.log('Uploads directory already exists');
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/memories', memoriesRouter);
app.use('/api', questionsRouter);
app.use('/api/scores', scoresRouter);
app.use('/api', feedbackRouter); // NEW: Add feedback routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Memory App API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
        
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 10MB.'
        });
    }
        
    if (error.message.includes('Only image files are allowed')) {
        return res.status(400).json({
            success: false,
            error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed.'
        });
    }
        
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    const db = require('./database/database');
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    const db = require('./database/database');
    await db.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Memory App API server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

