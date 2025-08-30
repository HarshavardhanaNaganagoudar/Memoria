const express = require('express');
const multer = require('multer');
const path = require('path');
const Memory = require('../models/memory');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/photos');
        // Ensure directory exists
        if (!require('fs').existsSync(uploadPath)) {
            require('fs').mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'memory-' + uniqueSuffix + path.extname(file.originalname);
        console.log('Saving file as:', filename);
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// GET /api/memories - Get all memories with optional filters
router.get('/', async (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            search: req.query.search,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            limit: req.query.limit ? parseInt(req.query.limit) : null
        };

        const memories = await Memory.findAll(filters);
        res.json({
            success: true,
            data: memories,
            count: memories.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/memories/:id - Get single memory
router.get('/:id', async (req, res) => {
    try {
        const memory = await Memory.findById(req.params.id);
        
        if (!memory) {
            return res.status(404).json({
                success: false,
                error: 'Memory not found'
            });
        }

        // Get extracted facts for this memory
        const facts = await Memory.getExtractedFacts(req.params.id);
        
        res.json({
            success: true,
            data: { ...memory, extractedFacts: facts }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/memories - Create new memory
router.post('/', upload.single('photo'), async (req, res) => {
    try {
        const memoryData = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            photo_path: req.file ? req.file.path : null,
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
            location: req.body.location
        };

        // Validate required fields
        if (!memoryData.title) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        const memory = await Memory.create(memoryData);
        
        res.status(201).json({
            success: true,
            data: memory,
            message: 'Memory created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT /api/memories/:id - Update memory
router.put('/:id', upload.single('photo'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        if (req.file) {
            updateData.photo_path = req.file.path;
        }
        
        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = JSON.parse(updateData.tags);
        }

        const memory = await Memory.update(req.params.id, updateData);
        
        if (!memory) {
            return res.status(404).json({
                success: false,
                error: 'Memory not found'
            });
        }

        res.json({
            success: true,
            data: memory,
            message: 'Memory updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE /api/memories/:id - Delete memory
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Memory.delete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Memory not found'
            });
        }

        res.json({
            success: true,
            message: 'Memory deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/memories/stats - Get memory statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Memory.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/memories/:id/facts - Add extracted fact
router.post('/:id/facts', async (req, res) => {
    try {
        const { factText, confidenceScore } = req.body;
        
        if (!factText) {
            return res.status(400).json({
                success: false,
                error: 'Fact text is required'
            });
        }

        const factId = await Memory.addExtractedFact(
            req.params.id, 
            factText, 
            confidenceScore || 0.8
        );
        
        res.status(201).json({
            success: true,
            data: { id: factId, factText, confidenceScore },
            message: 'Fact added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;