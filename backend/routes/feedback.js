
// ==================== FIXED FEEDBACK ROUTE - routes/feedback.js ====================
const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Ollama configuration
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const MODEL_NAME = 'gpt-oss:20b';

// Helper function to call Ollama from backend
async function callOllamaFromBackend(prompt) {
    try {
        console.log('Checking Ollama availability...');
        
        // Check if Ollama is running
        const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!healthCheck.ok) {
            throw new Error('OLLAMA_NOT_RUNNING');
        }

        // Check if model exists
        const tagsData = await healthCheck.json();
        const modelExists = tagsData.models?.some(model => model.name === MODEL_NAME);
        
        if (!modelExists) {
            console.error('Available models:', tagsData.models?.map(m => m.name));
            throw new Error('MODEL_NOT_FOUND');
        }

        console.log(`Sending request to model: ${MODEL_NAME}`);
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    top_p: 0.9,
                    num_predict: 400,
                    stop: ['\n\nHuman:', '\n\nUser:', '\n\nQuestion:']
                }
            }),
            signal: AbortSignal.timeout(120000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ollama API Error Response:', errorText);
            
            if (response.status === 404) {
                throw new Error('MODEL_NOT_FOUND');
            } else if (response.status === 400) {
                throw new Error('INVALID_REQUEST');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.response) {
            throw new Error('EMPTY_RESPONSE');
        }
        
        return {
            success: true,
            response: data.response,
            usingAI: true
        };

    } catch (error) {
        console.error('Ollama error:', error);
        return {
            success: false,
            error: error.message,
            usingAI: false
        };
    }
}

// Generate optimized prompt
function generateOptimizedPrompt(testResults) {
    const scores = testResults.map(r => r.percentage);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const trend = scores.length > 1 && scores[scores.length - 1] > scores[0] ? 'improving' : 'stable';
    
    return `As a compassionate memory coach, review these ${testResults.length} Alzheimer’s memory test results and provide a warm, supportive, and actionable feedback report (~250 words).

Data:
Scores: ${scores.join('%, ')}%
Average: ${avgScore}%
Trend: ${trend}  // can be "improving", "stable", or "declining"

Structure your response as follows:
1. Gentle performance overview (2 sentences) : summarize the memory trend in a positive, non-judgmental way.  
   - If "improving": celebrate progress and acknowledge effort.  
   - If "stable": encourage consistency and small wins.  
   - If "declining": remain gentle, focus on possibilities and supportive actions.  
2. Key cognitive strengths (2 sentences) : highlight areas where memory or thinking remains strong.  
3. Three practical memory support tips : simple exercises, routines, or habits that help maintain or improve memory. Tailor tips based on the trend.  
4. Encouraging conclusion : motivate with hope, focus on achievable progress, and emphasize that small, consistent efforts matter.

Tone: Warm, empathetic, patient, and uplifting. Use simple, clear language suitable for someone with Alzheimer’s. Focus on strengths, small victories, and actionable advice.
`;
}

// Fallback feedback generator
function generateFallbackFeedback(testResults) {
    const scores = testResults.map(r => r.percentage);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highScore = Math.max(...scores);
    const recentScore = scores[scores.length - 1];
    
    let feedback = `Great work on staying consistent with your memory testing! `;
    
    if (avgScore >= 85) {
        feedback += `Your average score of ${avgScore}% shows excellent memory performance. You're maintaining strong cognitive health, which is wonderful to see.

Your highest score of ${highScore}% demonstrates your memory's peak potential. The consistency in your results suggests good mental habits and lifestyle choices.

To maintain this excellent performance, I recommend:

1. **Continue regular testing** - Your consistent approach is clearly working well
2. **Challenge yourself with variety** - Try different types of memory exercises to keep your brain engaged  
3. **Maintain healthy routines** - Whatever you're doing lifestyle-wise is supporting your cognitive health
4. **Stay socially active** - Engaging conversations and activities support memory function

Keep up the fantastic work! Your dedication to monitoring and maintaining your memory health is paying off beautifully.`;
    } else if (avgScore >= 70) {
        feedback += `Your average score of ${avgScore}% shows good memory performance with room for growth. You're on a positive track!

I notice some variability in your scores, which is completely normal. Your best performance of ${highScore}% shows what you're capable of achieving consistently.

Here are some targeted strategies to boost your performance:

1. **Optimize your testing environment** - Take tests when you're alert and in a quiet space
2. **Practice memory techniques** - Try visualization, chunking, or association methods
3. **Focus on lifestyle factors** - Regular sleep, exercise, and stress management significantly impact memory
4. **Stay patient and consistent** - Memory improvement takes time, but your regular testing shows great commitment

Your recent score of ${recentScore}% ${recentScore > avgScore ? 'shows positive momentum' : 'is part of natural fluctuation'}. Keep testing regularly - you're building valuable insights about your cognitive patterns.`;
    } else {
        feedback += `Thank you for being proactive about your memory health. Your average score of ${avgScore}% provides a good baseline for improvement.

Memory performance can vary due to many factors including stress, sleep, and daily routines. The important thing is that you're actively monitoring and working to improve.

I recommend these evidence-based strategies:

1. **Establish optimal testing conditions** - Choose consistent times when you feel most alert
2. **Implement memory-boosting habits** - Regular physical exercise, quality sleep (7-9 hours), and stress reduction
3. **Try cognitive training** - Practice with memory games, puzzles, and learning new skills
4. **Consider professional guidance** - If you have ongoing concerns, discussing with a healthcare provider can be helpful

Your commitment to tracking your memory is admirable and an important step toward cognitive wellness. Small, consistent improvements in lifestyle and practice can lead to meaningful gains over time.`;
    }
    
    return feedback;
}

// Clean AI response
function cleanAIFeedbackResponse(response) {
    return response
        .replace(/^(As a|I am a|You are).*?analysis[:\s]*/i, '')
        .replace(/^\s*(AI\s+)?FEEDBACK:\s*/i, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#+\s*/g, '')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
}

// Main API endpoint for AI feedback
router.get('/ai-feedback', async (req, res) => {
    try {
        console.log('Generating AI feedback...');
        
        // FIXED: Use the proper database method instead of callback style
        const testResults = await db.all(
            `SELECT id, test_date, correct_answers, total_questions, percentage 
             FROM test_scores 
             ORDER BY test_date DESC 
             LIMIT 7`,
            []
        );

        console.log('Database query result:', {
            count: testResults.length,
            results: testResults
        });

        if (testResults.length === 0) {
            console.log('No test results found, returning default message');
            return res.json({
                success: true,
                feedback: "I notice you haven't taken any memory tests yet! Take a few tests first, and I'll be able to provide personalized insights about your memory performance and suggest ways to improve.",
                usingAI: false,
                testResults: [],
                error: null
            });
        }

        // Reverse to show chronological order
        const last7Results = testResults.reverse();
        console.log('Processing results:', last7Results);
        
        // Generate prompt
        const feedbackPrompt = generateOptimizedPrompt(last7Results);
        console.log('Generated prompt:', feedbackPrompt);
        
        // Try AI first, fallback if needed
        const aiResult = await callOllamaFromBackend(feedbackPrompt);
        
        let finalFeedback;
        let usingAI = false;
        let error = null;

        if (aiResult.success) {
            finalFeedback = cleanAIFeedbackResponse(aiResult.response);
            usingAI = true;
            console.log('AI feedback generated successfully');
        } else {
            finalFeedback = generateFallbackFeedback(last7Results);
            error = aiResult.error;
            console.log('Using fallback feedback due to AI error:', aiResult.error);
        }

        res.json({
            success: true,
            feedback: finalFeedback,
            usingAI: usingAI,
            error: error,
            testResults: last7Results
        });

    } catch (error) {
        console.error('Error in AI feedback endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Health check for AI service
router.get('/ai-status', async (req, res) => {
    try {
        const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        
        if (healthCheck.ok) {
            const data = await healthCheck.json();
            const modelExists = data.models?.some(model => model.name === MODEL_NAME);
            
            res.json({
                success: true,
                ollama_running: true,
                model_available: modelExists,
                available_models: data.models?.map(m => m.name) || []
            });
        } else {
            res.json({
                success: true,
                ollama_running: false,
                model_available: false,
                available_models: []
            });
        }
    } catch (error) {
        res.json({
            success: true,
            ollama_running: false,
            model_available: false,
            error: error.message
        });
    }
});

// BONUS: Debug endpoint to check database directly
router.get('/debug/scores', async (req, res) => {
    try {
        const allScores = await db.all('SELECT * FROM test_scores ORDER BY created_at DESC');
        const tableInfo = await db.all('PRAGMA table_info(test_scores)');
        
        res.json({
            success: true,
            total_scores: allScores.length,
            scores: allScores,
            table_structure: tableInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;