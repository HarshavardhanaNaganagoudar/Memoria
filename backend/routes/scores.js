const express = require('express');
const db = require('../database/database');
const router = express.Router();

// POST /api/scores - Save test score
router.post('/', async (req, res) => {
    try {
        const { 
            totalQuestions, 
            correctAnswers, 
            partialAnswers = 0, 
            finalScore, 
            percentage, 
            details = [], 
            memoriesTested = [] 
        } = req.body;

        if (!totalQuestions || correctAnswers === undefined || finalScore === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Insert score into database using your Database class
        const result = await db.run(`
            INSERT INTO test_scores (
                total_questions, 
                correct_answers, 
                partial_answers, 
                final_score, 
                percentage, 
                details, 
                memories_tested
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            totalQuestions,
            correctAnswers,
            partialAnswers,
            finalScore,
            percentage,
            JSON.stringify(details),
            JSON.stringify(memoriesTested)
        ]);

        res.json({
            success: true,
            data: {
                id: result.id,
                message: 'Test score saved successfully'
            }
        });

    } catch (error) {
        console.error('Error saving test score:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/scores - Get all test scores with pagination
router.get('/', async (req, res) => {
    try {
        const { limit = 20, offset = 0, order = 'DESC' } = req.query;
        
        const scores = await db.all(`
            SELECT 
                id,
                total_questions,
                correct_answers,
                partial_answers,
                final_score,
                percentage,
                test_date,
                details,
                memories_tested,
                created_at
            FROM test_scores 
            ORDER BY created_at ${order}
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        // Parse JSON fields
        const parsedScores = scores.map(score => ({
            ...score,
            details: JSON.parse(score.details || '[]'),
            memories_tested: JSON.parse(score.memories_tested || '[]')
        }));

        const total = await db.get('SELECT COUNT(*) as count FROM test_scores');

        res.json({
            success: true,
            data: parsedScores,
            pagination: {
                total: total.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: total.count > (parseInt(offset) + parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching test scores:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/scores/stats - Get test score statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_tests,
                AVG(percentage) as average_score,
                MAX(percentage) as best_score,
                MIN(percentage) as worst_score,
                AVG(final_score) as avg_final_score,
                SUM(correct_answers) as total_correct,
                SUM(total_questions) as total_questions_answered
            FROM test_scores
        `);

        // Get recent trend (last 10 tests)
        const recentScores = await db.all(`
            SELECT percentage, test_date 
            FROM test_scores 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                ...stats,
                recent_scores: recentScores,
                improvement_trend: recentScores.length > 1 ? 
                    recentScores[0].percentage - recentScores[recentScores.length - 1].percentage : 0
            }
        });

    } catch (error) {
        console.error('Error fetching test statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/scores/:id - Get specific test score
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const score = await db.get(`
            SELECT * FROM test_scores WHERE id = ?
        `, [id]);

        if (!score) {
            return res.status(404).json({
                success: false,
                error: 'Test score not found'
            });
        }

        // Parse JSON fields
        score.details = JSON.parse(score.details || '[]');
        score.memories_tested = JSON.parse(score.memories_tested || '[]');

        res.json({
            success: true,
            data: score
        });

    } catch (error) {
        console.error('Error fetching test score:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;