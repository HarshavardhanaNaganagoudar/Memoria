const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory storage for tracking used memories (in production, use Redis or database)
const usedMemories = new Set();
const recentQuestions = new Map(); // questionText -> timestamp

// Ollama configuration
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const MODEL_NAME = 'gpt-oss:20b';

// Helper function to call Ollama
async function callOllama(prompt) {
    try {
        console.log(`Attempting to connect to Ollama at: ${OLLAMA_BASE_URL}`);
        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: MODEL_NAME,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.1, // REDUCED for more consistent scoring
                top_p: 0.8,       // REDUCED for more focused responses
                num_predict: 500
            }
        }, {
            timeout: 120000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return response.data.response;
    } catch (error) {
        console.error('Error calling Ollama:', error.message);
        console.error('Error code:', error.code);
        console.error('Error config:', error.config?.url);
        
        if (error.code === 'ECONNREFUSED') {
            throw new Error(`Cannot connect to Ollama at ${OLLAMA_BASE_URL}. Please ensure Ollama is running with 'ollama serve'`);
        } else if (error.response?.status === 404) {
            throw new Error(`Model '${MODEL_NAME}' not found. Please install it with 'ollama pull ${MODEL_NAME}'`);
        } else {
            throw new Error(`Failed to generate response from Ollama: ${error.message}`);
        }
    }
}

// Function to select diverse memories
function selectDiverseMemories(memories, count = 5) {
    // 1. Filter out recently used memories (within last 24 hours)
    const now = Date.now();
    const availableMemories = memories.filter(memory => {
        const memoryKey = `${memory.id}-${memory.title}`;
        return !usedMemories.has(memoryKey);
    });
    
    // 2. If we don't have enough unused memories, include some older ones
    let memoriesToUse = availableMemories;
    if (memoriesToUse.length < count) {
        // Clear old used memories (older than 1 hour) and include them
        const oneHourAgo = now - (60 * 60 * 1000);
        Array.from(usedMemories).forEach(memoryKey => {
            const [id, ...titleParts] = memoryKey.split('-');
            const memory = memories.find(m => m.id.toString() === id);
            if (memory && memory.date_logged && new Date(memory.date_logged).getTime() < oneHourAgo) {
                usedMemories.delete(memoryKey);
            }
        });
        memoriesToUse = memories.filter(memory => {
            const memoryKey = `${memory.id}-${memory.title}`;
            return !usedMemories.has(memoryKey);
        });
    }
    
    // 3. Prioritize by category diversity
    const categoryCounts = {};
    const selectedMemories = [];
    
    // First pass: select one from each category
    memoriesToUse.forEach(memory => {
        const category = memory.category || 'other';
        if (!categoryCounts[category]) {
            categoryCounts[category] = 0;
            selectedMemories.push(memory);
            categoryCounts[category]++;
        }
    });
    
    // Second pass: fill remaining slots with diverse selection
    while (selectedMemories.length < count && selectedMemories.length < memoriesToUse.length) {
        // Find category with least representation
        const minCategory = Object.keys(categoryCounts)
            .reduce((a, b) => categoryCounts[a] < categoryCounts[b] ? a : b);
        
        // Find unused memory from that category
        const candidateMemory = memoriesToUse.find(memory => 
            (memory.category || 'other') === minCategory && 
            !selectedMemories.includes(memory)
        );
        
        if (candidateMemory) {
            selectedMemories.push(candidateMemory);
            categoryCounts[minCategory]++;
        } else {
            // Fallback: add any unused memory
            const unusedMemory = memoriesToUse.find(memory => !selectedMemories.includes(memory));
            if (unusedMemory) {
                selectedMemories.push(unusedMemory);
                const category = unusedMemory.category || 'other';
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            } else {
                break;
            }
        }
    }
    
    // 4. Shuffle the selected memories for randomness
    return shuffleArray(selectedMemories);
}

// Function to shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// IMPROVED: Function to generate questions one memory at a time for better association
function generateMemorySpecificPrompt(memory, questionIndex) {
    const prompt = `Based on this specific memory, create 1 simple question that can be answered directly from the memory text:

Memory: "${memory.title}" - ${memory.description}

Rules:
- Ask ONLY about information that is clearly stated in the memory text
- Use simple question words: What, Where, How many, Which, Who, When
- The question must be answerable from the exact text provided
- Do not ask about details not mentioned in the memory
- Do not add extra context or assumptions

Generate exactly 1 question in this format:
Question: [Your question here]?

Example for "I bought three koi fish for my outdoor pond":
Question: How many koi fish did you buy?

Now create a question for the provided memory:`;

    return prompt;
}

// Function to generate varied question types (fallback method)
function generateVariedPrompt(selectedMemories, count) {
    const memoryContext = selectedMemories.map((memory, index) => 
        `Memory ${index + 1}: "${memory.title}" - ${memory.description}`
    ).join('\n\n');

    const prompt = `Based on these exact memories, create ${count} simple questions that can be answered directly from the memory text:

${memoryContext}

Rules:
- Ask ONLY about information that is clearly stated in the memory text
- Use simple question words: What, Where, How many, Which
- Each question must be answerable from the exact text provided
- Do not ask about details not mentioned in the memories
- Do not add extra context or assumptions

Generate exactly ${count} questions in this format:
1. Question text here?
2. Question text here?
3. Question text here?

Example for "I bought three koi fish for my outdoor pond":
- How many koi fish did you buy?
- What did you buy the koi fish for?

Now create questions for the provided memories:`;

    return prompt;
}

// FIXED: Function to check for duplicate questions - now properly excludes current generation session
function isDuplicateQuestion(questionText, currentSessionQuestions = []) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Clean old questions
    for (const [question, timestamp] of recentQuestions.entries()) {
        if (now - timestamp > oneHour) {
            recentQuestions.delete(question);
        }
    }
    
    // Normalize question text for comparison
    const normalized = questionText.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    console.log(`🔍 Checking for duplicates: "${normalized}"`);
    console.log(`📝 Recent questions: ${Array.from(recentQuestions.keys()).join(', ')}`);
    
    // FIXED: Check against current session questions first
    for (const sessionQuestion of currentSessionQuestions) {
        const sessionNormalized = sessionQuestion.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const words1 = normalized.split(' ');
        const words2 = sessionNormalized.split(' ');
        const overlap = words1.filter(word => words2.includes(word)).length;
        const similarity = overlap / Math.max(words1.length, words2.length);
        
        console.log(`📊 Similarity with current session "${sessionNormalized}": ${similarity.toFixed(2)}`);
        
        if (similarity > 0.7) { // 70% similarity threshold
            console.log(`❌ Duplicate detected in current session! Similarity: ${similarity.toFixed(2)}`);
            return true;
        }
    }
    
    // Then check against historical questions
    for (const existingQuestion of recentQuestions.keys()) {
        const existingNormalized = existingQuestion.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Check similarity (simple word overlap)
        const words1 = normalized.split(' ');
        const words2 = existingNormalized.split(' ');
        const overlap = words1.filter(word => words2.includes(word)).length;
        const similarity = overlap / Math.max(words1.length, words2.length);
        
        console.log(`📊 Similarity with "${existingNormalized}": ${similarity.toFixed(2)}`);
        
        if (similarity > 0.7) { // 70% similarity threshold
            console.log(`❌ Duplicate detected! Similarity: ${similarity.toFixed(2)}`);
            return true;
        }
    }
    
    console.log(`✅ No duplicates found for: "${normalized}"`);
    return false;
}

// GET /api/debug - Debug endpoint to check everything
router.get('/debug', async (req, res) => {
    try {
        // Test Ollama connection
        const ollamaResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 10000 });
        const models = ollamaResponse.data.models || [];
        const hasTargetModel = models.some(model => model.name === MODEL_NAME);
        
        // Test simple generation
        let simpleTest = null;
        try {
            const testResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
                model: MODEL_NAME,
                prompt: "Say hello in one word",
                stream: false,
                options: { num_predict: 5 }
            }, { timeout: 30000 });
            simpleTest = { success: true, response: testResponse.data.response };
        } catch (error) {
            simpleTest = { success: false, error: error.message };
        }
        
        res.json({
            success: true,
            data: {
                ollamaUrl: OLLAMA_BASE_URL,
                targetModel: MODEL_NAME,
                modelFound: hasTargetModel,
                availableModels: models.map(m => m.name),
                simpleTest: simpleTest,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            troubleshooting: [
                'Check: ollama serve',
                'Check: ollama list', 
                `Try: ollama pull ${MODEL_NAME}`,
                'Test: curl http://127.0.0.1:11434/api/tags'
            ]
        });
    }
});

// GET /api/test-ollama - Test Ollama connection
router.get('/test-ollama', async (req, res) => {
    try {
        console.log('Testing Ollama connection...');
        const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
            timeout: 10000
        });
        
        const models = response.data.models || [];
        const hasTargetModel = models.some(model => model.name === MODEL_NAME);
        
        res.json({
            success: true,
            data: {
                ollamaUrl: OLLAMA_BASE_URL,
                targetModel: MODEL_NAME,
                modelFound: hasTargetModel,
                availableModels: models.map(m => m.name),
                status: 'Connected successfully'
            }
        });
    } catch (error) {
        console.error('Ollama connection test failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            ollamaUrl: OLLAMA_BASE_URL,
            targetModel: MODEL_NAME,
            troubleshooting: [
                'Check if Ollama is running: ollama serve',
                'Check if model is installed: ollama list',
                `Pull model if needed: ollama pull ${MODEL_NAME}`,
                'Verify Ollama is listening on 127.0.0.1:11434',
                'Try: curl http://127.0.0.1:11434/api/tags'
            ]
        });
    }
});

// FIXED: POST /api/generate-questions - Generate questions from memories with proper duplicate prevention
router.post('/generate-questions', async (req, res) => {
    try {
        const { memories, count = 5 } = req.body;

        if (!memories || memories.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No memories provided'
            });
        }

        console.log(`Generating ${count} questions from ${memories.length} memories`);
        
        // 1. Select diverse memories and REMOVE DUPLICATES within this session
        const selectedMemories = selectDiverseMemories(memories, Math.min(count, memories.length));
        console.log('Selected memories:', selectedMemories.map(m => m.title));
        
        // FIXED: Remove duplicate memories by ID within this session
        const uniqueSelectedMemories = [];
        const seenMemoryIds = new Set();
        
        for (const memory of selectedMemories) {
            if (!seenMemoryIds.has(memory.id)) {
                uniqueSelectedMemories.push(memory);
                seenMemoryIds.add(memory.id);
            } else {
                console.log(`🔄 Skipping duplicate memory in session: "${memory.title}" (ID: ${memory.id})`);
            }
        }
        
        const questions = [];
        const currentSessionQuestions = []; // Track questions in THIS session for duplicate checking
        
        // 2. FIXED: Generate questions one memory at a time with proper duplicate tracking
        for (let i = 0; i < Math.min(count, uniqueSelectedMemories.length); i++) {
            const memory = uniqueSelectedMemories[i];
            
            try {
                console.log(`Generating question for memory: "${memory.title}"`);
                
                // Generate memory-specific prompt
                const prompt = generateMemorySpecificPrompt(memory, i);
                
                // Call Ollama for this specific memory
                const response = await callOllama(prompt);
                console.log(`Raw response for memory "${memory.title}":`, response);

                // Parse the question from response
                const parsedQuestion = parseMemorySpecificQuestion(response, memory);
                
                // FIXED: Check duplicates against current session questions, not global ones yet
                if (!parsedQuestion) {
                    console.log(`❌ Failed to parse question from response for "${memory.title}"`);
                } else if (isDuplicateQuestion(parsedQuestion.text, currentSessionQuestions)) {
                    console.log(`⚠️ Duplicate question detected for "${memory.title}": ${parsedQuestion.text}`);
                } else {
                    // SUCCESS - Add the question
                    questions.push(parsedQuestion);
                    currentSessionQuestions.push(parsedQuestion.text); // Track in current session
                    console.log(`✅ Successfully generated question for "${memory.title}": ${parsedQuestion.text}`);
                    
                    // Small delay between requests to avoid overwhelming Ollama
                    if (i < uniqueSelectedMemories.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    continue; // Skip fallback logic
                }
                
                // Only reach here if there was a problem
                console.log(`🔄 Creating fallback question for "${memory.title}"`);
                const fallbackQuestion = createFallbackQuestion(memory);
                if (fallbackQuestion && !isDuplicateQuestion(fallbackQuestion.text, currentSessionQuestions)) {
                    questions.push(fallbackQuestion);
                    currentSessionQuestions.push(fallbackQuestion.text); // Track in current session
                    console.log(`✅ Using fallback question for "${memory.title}": ${fallbackQuestion.text}`);
                } else {
                    console.log(`❌ Even fallback failed for "${memory.title}"`);
                }
                
            } catch (error) {
                console.error(`💥 Error generating question for memory "${memory.title}":`, error.message);
                
                // Fallback: create a simple generic question
                const fallbackQuestion = createFallbackQuestion(memory);
                if (fallbackQuestion && !isDuplicateQuestion(fallbackQuestion.text, currentSessionQuestions)) {
                    questions.push(fallbackQuestion);
                    currentSessionQuestions.push(fallbackQuestion.text); // Track in current session
                    console.log(`✅ Using fallback question for "${memory.title}" due to error: ${fallbackQuestion.text}`);
                }
            }
        }

        // 3. If we still don't have enough questions, try the old batch method as fallback
        if (questions.length < count && uniqueSelectedMemories.length > questions.length) {
            console.log('Not enough questions generated individually, trying batch method...');
            
            try {
                const remainingMemories = uniqueSelectedMemories.slice(questions.length);
                const batchPrompt = generateVariedPrompt(remainingMemories, count - questions.length);
                const batchResponse = await callOllama(batchPrompt);
                const batchQuestions = parseQuestions(batchResponse, remainingMemories);
                
                // Add valid batch questions
                batchQuestions.forEach(q => {
                    if (!isDuplicateQuestion(q.text, currentSessionQuestions) && questions.length < count) {
                        questions.push(q);
                        currentSessionQuestions.push(q.text);
                    }
                });
            } catch (batchError) {
                console.error('Batch generation also failed:', batchError.message);
            }
        }

        if (questions.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate any valid questions',
                debug: { selectedMemoriesCount: uniqueSelectedMemories.length }
            });
        }

        // 4. FIXED: Only NOW add questions to global recentQuestions tracking after all generation is complete
        const now = Date.now();
        uniqueSelectedMemories.forEach(memory => {
            const memoryKey = `${memory.id}-${memory.title}`;
            usedMemories.add(memoryKey);
        });
        
        // Add questions to global tracking only after all are generated
        questions.forEach(question => {
            recentQuestions.set(question.text, now);
        });

        // 5. Return final questions
        const finalQuestions = questions.slice(0, count);
        
        res.json({
            success: true,
            data: finalQuestions,
            metadata: {
                totalMemories: memories.length,
                selectedMemories: uniqueSelectedMemories.length,
                generatedQuestions: finalQuestions.length,
                usedMemoriesCount: usedMemories.size,
                categories: [...new Set(uniqueSelectedMemories.map(m => m.category || 'other'))],
                memoryQuestionMap: finalQuestions.map(q => ({
                    questionText: q.text,
                    memoryId: q.memoryId,
                    memoryTitle: uniqueSelectedMemories.find(m => m.id === q.memoryId)?.title || 'unknown'
                }))
            }
        });

    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// IMPROVED: Helper function to parse memory-specific question
function parseMemorySpecificQuestion(response, memory) {
    console.log(`Parsing question for memory "${memory.title}" from response:`, response);
    
    // Try to extract question from various formats
    let questionText = null;
    
    // Format 1: "Question: [text]?"
    let match = response.match(/Question:\s*(.+\?)/i);
    if (match) {
        questionText = match[1].trim();
    }
    
    // Format 2: Just a question ending with ?
    if (!questionText) {
        const lines = response.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.endsWith('?') && trimmed.length > 10) {
                // Remove any numbering or prefixes
                questionText = trimmed.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim();
                break;
            }
        }
    }
    
    // Format 3: Look for any sentence with question words
    if (!questionText) {
        const questionWords = ['what', 'where', 'who', 'when', 'how', 'which', 'why', 'did', 'do', 'does', 'can', 'will', 'would', 'is', 'are'];
        const sentences = response.split(/[.!?\n]+/);
        
        for (const sentence of sentences) {
            const trimmed = sentence.trim().toLowerCase();
            if (questionWords.some(word => trimmed.startsWith(word)) && trimmed.length > 10) {
                questionText = sentence.trim();
                if (!questionText.endsWith('?')) {
                    questionText += '?';
                }
                break;
            }
        }
    }
    
    if (!questionText) {
        console.log(`Could not parse question from response for memory "${memory.title}"`);
        return null;
    }
    
    // Clean up the question text
    questionText = questionText
        .replace(/^\[.*?\]\s*/, '') // Remove [brackets]
        .replace(/^Question:\s*/i, '') // Remove "Question:" prefix
        .replace(/^\d+\.\s*/, '') // Remove numbering
        .trim();
    
    // Ensure it ends with ?
    if (!questionText.endsWith('?')) {
        questionText += '?';
    }
    
    console.log(`Successfully parsed question for memory "${memory.title}": ${questionText}`);
    
    return {
        text: questionText,
        context: memory.description,
        memoryId: memory.id,
        category: memory.category || 'general',
        type: 'recall'
    };
}

// IMPROVED: Helper function to create fallback questions
function createFallbackQuestion(memory) {
    const title = memory.title || '';
    const description = memory.description || '';
    const combinedText = `${title} ${description}`.toLowerCase();
    
    // Pattern-based question generation with better templates
    
    // For pets/animals
    if (combinedText.includes('dog') || combinedText.includes('cat') || combinedText.includes('pet')) {
        if (combinedText.match(/name is (\w+)/)) {
            return {
                text: `What is your pet's name?`,
                context: memory.description,
                memoryId: memory.id,
                category: memory.category || 'general',
                type: 'recall'
            };
        }
        if (combinedText.includes('breed') || combinedText.includes('corgi') || combinedText.includes('labrador')) {
            return {
                text: `What breed is your pet?`,
                context: memory.description,
                memoryId: memory.id,
                category: memory.category || 'general',
                type: 'recall'
            };
        }
    }
    
    // For purchases
    if (combinedText.includes('bought') || combinedText.includes('purchased')) {
        return {
            text: `What did you buy?`,
            context: memory.description,
            memoryId: memory.id,
            category: memory.category || 'general',
            type: 'recall'
        };
    }
    
    // For locations/visits
    if (combinedText.includes('went') || combinedText.includes('visited') || combinedText.includes('in ')) {
        const locationMatch = combinedText.match(/(?:went to|visited|in) ([^,\\.]+)/);
        if (locationMatch) {
            return {
                text: `Where did you go?`,
                context: memory.description,
                memoryId: memory.id,
                category: memory.category || 'general',
                type: 'recall'
            };
        }
    }
    
    // For family/people
    if (combinedText.includes('mother') || combinedText.includes('father') || 
        combinedText.includes('brother') || combinedText.includes('sister') ||
        combinedText.includes('uncle') || combinedText.includes('aunt') ||
        combinedText.includes('grandfather') || combinedText.includes('grandmother')) {
        
        return {
            text: `Who is in this memory?`,
            context: memory.description,
            memoryId: memory.id,
            category: memory.category || 'general',
            type: 'recall'
        };
    }
    
    // For food/eating
    if (combinedText.includes('eat') || combinedText.includes('food') || 
        combinedText.includes('breakfast') || combinedText.includes('lunch') || 
        combinedText.includes('dinner')) {
        return {
            text: `What did you eat?`,
            context: memory.description,
            memoryId: memory.id,
            category: memory.category || 'general',
            type: 'recall'
        };
    }
    
    // For activities/actions
    if (combinedText.includes('started') || combinedText.includes('quit')) {
        return {
            text: `What activity did you start or stop?`,
            context: memory.description,
            memoryId: memory.id,
            category: memory.category || 'general',
            type: 'recall'
        };
    }
    
    // For numbers/quantities
    const numberMatch = combinedText.match(/\d+/);
    if (numberMatch) {
        return {
            text: `What number is mentioned in this memory?`,
            context: memory.description,
            memoryId: memory.id,
            category: memory.category || 'general',
            type: 'recall'
        };
    }
    
    // Last resort - but much better than current fallback
    return {
        text: `What is the main thing you remember about this?`,
        context: memory.description,
        memoryId: memory.id,
        category: memory.category || 'general',
        type: 'recall'
    };
}

// FIXED: POST /api/score-answers - Score user answers with STRICT FACTUAL matching
router.post('/score-answers', async (req, res) => {
    try {
        const { questions, answers } = req.body;

        if (!questions || !answers) {
            return res.status(400).json({
                success: false,
                error: 'Questions and answers are required'
            });
        }

        // Prepare context for scoring
        const questionAnswerPairs = questions.map((question, index) => ({
            question: question.text,
            userAnswer: answers[index] || '',
            expectedContext: question.context || '',
            memoryId: question.memoryId
        }));

        const scoringPrompt = generateStrictScoringPrompt(questionAnswerPairs);

        console.log('Scoring answers with Ollama (STRICT mode)...');
        
        const response = await callOllama(scoringPrompt);
        console.log('Scoring response:', response);

        // Parse scoring results with strict factual matching
        const scoringResults = parseStrictScoring(response, questionAnswerPairs);

        // Calculate final score
        const correctAnswers = scoringResults.filter(r => r.score === 'CORRECT').length;
        const partialAnswers = scoringResults.filter(r => r.score === 'PARTIAL').length;
        const finalScore = correctAnswers + (partialAnswers * 0.5);

        const scoreData = {
            totalQuestions: questions.length,
            correctAnswers: correctAnswers,
            partialAnswers: partialAnswers,
            finalScore: finalScore,
            percentage: Math.round((finalScore / questions.length) * 100),
            details: scoringResults.map((result, index) => ({
                question: questionAnswerPairs[index].question,
                userAnswer: questionAnswerPairs[index].userAnswer,
                correct: result.score === 'CORRECT',
                partial: result.score === 'PARTIAL',
                reasoning: result.reasoning
            }))
        };

        res.json({
            success: true,
            data: scoreData
        });

    } catch (error) {
        console.error('Error scoring answers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// FIXED: Generate STRICT factual scoring prompt - no creative interpretations allowed
function generateStrictScoringPrompt(questionAnswerPairs) {
    return `You are a STRICT memory scoring system. You must score based on EXACT FACTUAL MATCHING ONLY.

CRITICAL RULES - NO EXCEPTIONS:
- CORRECT: User answer contains the EXACT same information as stated in the memory
- PARTIAL: User answer contains SOME correct information from the memory but is incomplete
- INCORRECT: User answer is wrong, missing, empty, or contradicts the memory

DO NOT MAKE CREATIVE CONNECTIONS:
- "dad" is NOT the same as "uncle" - they are different people
- "brother" is NOT the same as "friend" - they are different relationships  
- "carlos" is NOT the same as "brother" - one is a name, one is a relationship
- Only accept EXACT matches or clear partial matches from the memory text

EXAMPLES OF CORRECT SCORING:
✅ Memory: "uncle Tom" + User: "uncle" → CORRECT (exact match)
✅ Memory: "went to Florida" + User: "florida" → CORRECT (exact location match)  
✅ Memory: "corgi dog" + User: "corgi" → CORRECT (exact breed match)
❌ Memory: "uncle Tom" + User: "dad" → INCORRECT (completely different person)
❌ Memory: "friend Carlos" + User: "brother" → INCORRECT (different relationship)

Score each question-answer pair based ONLY on the memory context provided:

${questionAnswerPairs.map((pair, index) => `
Question ${index + 1}: ${pair.question}
User Answer: "${pair.userAnswer}"
Memory Context: "${pair.expectedContext}"
`).join('\n')}

Respond with valid JSON only - no extra text:
{
  "results": [
    {"questionIndex": 0, "score": "CORRECT/PARTIAL/INCORRECT", "reasoning": "exact factual explanation"},
    {"questionIndex": 1, "score": "CORRECT/PARTIAL/INCORRECT", "reasoning": "exact factual explanation"}
  ]
}`;
}

// FIXED: Helper function to parse scoring with strict validation
function parseStrictScoring(response, questionAnswerPairs) {
    console.log('Raw scoring response:', response);
    
    try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            let jsonText = jsonMatch[0];
            
            // Fix common JSON formatting issues
            jsonText = jsonText.replace(/"reresults":/g, '"results":');
            jsonText = jsonText.replace(/"ressults":/g, '"results":');
            
            const jsonData = JSON.parse(jsonText);
            if (jsonData.results && Array.isArray(jsonData.results)) {
                console.log('Parsed JSON results:', jsonData.results);
                
                // STRICT validation - override clearly wrong AI scoring
                const validatedResults = jsonData.results.map((result, index) => {
                    const pair = questionAnswerPairs[index];
                    if (!pair) return result;
                    
                    const userAnswer = pair.userAnswer.toLowerCase().trim();
                    const memoryContext = pair.expectedContext.toLowerCase();
                    
                    // STRICT OVERRIDE LOGIC: Fix obvious AI mistakes
                    
                    // 1. Empty or missing answers should be INCORRECT
                    if (!userAnswer || userAnswer === 'nothing' || userAnswer === '') {
                        if (result.score === 'CORRECT') {
                            console.log(`🔄 Overriding AI score for question ${index}: CORRECT → INCORRECT (empty answer)`);
                            return {
                                ...result,
                                score: 'INCORRECT',
                                reasoning: 'Empty or missing answer'
                            };
                        }
                        return result;
                    }
                    
                    // 2. Check for obvious wrong family relationship mappings
                    const familyMappings = {
                        'uncle': ['uncle'],
                        'aunt': ['aunt'], 
                        'father': ['father', 'dad'],
                        'dad': ['father', 'dad'],
                        'mother': ['mother', 'mom'],
                        'mom': ['mother', 'mom'],
                        'brother': ['brother'],
                        'sister': ['sister'],
                        'grandfather': ['grandfather', 'grandpa'],
                        'grandmother': ['grandmother', 'grandma']
                    };
                    
                    // Find family terms in memory and user answer
                    const memoryFamilyTerms = Object.keys(familyMappings).filter(term => 
                        memoryContext.includes(term)
                    );
                    const userFamilyTerms = Object.keys(familyMappings).filter(term => 
                        userAnswer.includes(term)
                    );
                    
                    if (memoryFamilyTerms.length > 0 && userFamilyTerms.length > 0) {
                        const memoryTerm = memoryFamilyTerms[0];
                        const userTerm = userFamilyTerms[0];
                        
                        // Check if it's a valid mapping
                        const isValidMapping = familyMappings[memoryTerm].includes(userTerm) || 
                                             familyMappings[userTerm]?.includes(memoryTerm);
                        
                        if (!isValidMapping && result.score === 'CORRECT') {
                            console.log(`🔄 Overriding AI score for question ${index}: CORRECT → INCORRECT (wrong family relationship: ${userTerm} ≠ ${memoryTerm})`);
                            return {
                                ...result,
                                score: 'INCORRECT',
                                reasoning: `Wrong family relationship: "${userTerm}" is not the same as "${memoryTerm}"`
                            };
                        }
                    }
                    
                    // 3. Check for exact word matches (this should be CORRECT)
                    const answerWords = userAnswer.split(/\s+/).filter(word => word.length > 2);
                    const contextWords = memoryContext.split(/\s+/).filter(word => word.length > 2);
                    
                    const exactMatches = answerWords.filter(word => 
                        contextWords.some(contextWord => contextWord === word)
                    );
                    
                    // 4. If there are exact matches but AI scored as INCORRECT, upgrade to CORRECT
                    // if (exactMatches.length > 0 && result.score === 'INCORRECT') {
                    //     // But only if it's not a wrong family relationship
                    //     const hasWrongFamily = memoryFamilyTerms.length > 0 && userFamilyTerms.length > 0 &&
                    //                          !familyMappings[memoryFamilyTerms[0]]?.includes(userFamilyTerms[0]);
                        
                    //     if (!hasWrongFamily) {
                    //         console.log(`🔄 Overriding AI score for question ${index}: INCORRECT → CORRECT (exact matches found: ${exactMatches.join(', ')})`);
                    //         return {
                    //             ...result,
                    //             score: 'CORRECT',
                    //             reasoning: `Exact matches found: ${exactMatches.join(', ')}`
                    //         };
                    //     }
                    // }
                    
                    // 5. Check for obvious contradictions that AI missed
                    if (result.score === 'CORRECT') {
                        // Names that don't match at all
                        const memoryNames = memoryContext.match(/\b[A-Z][a-z]+\b/g) || [];
                        const userNames = userAnswer.match(/\b[A-Z][a-z]+\b/g) || [];
                        
                        if (memoryNames.length > 0 && userNames.length > 0) {
                            const hasNameMatch = memoryNames.some(memoryName => 
                                userNames.some(userName => 
                                    memoryName.toLowerCase() === userName.toLowerCase() ||
                                    memoryName.toLowerCase().includes(userName.toLowerCase()) ||
                                    userName.toLowerCase().includes(memoryName.toLowerCase())
                                )
                            );
                            
                            if (!hasNameMatch) {
                                console.log(`🔄 Overriding AI score for question ${index}: CORRECT → INCORRECT (name mismatch: ${userNames.join(',')} ≠ ${memoryNames.join(',')})`);
                                return {
                                    ...result,
                                    score: 'INCORRECT',
                                    reasoning: `Name mismatch: "${userNames.join(',')}" does not match "${memoryNames.join(',')}"`
                                };
                            }
                        }
                    }
                    
                    return result;
                });
                
                return validatedResults;
            }
        }
    } catch (error) {
        console.error('Error parsing JSON scoring results:', error);
    }

    // STRICT fallback scoring - much more conservative
    const results = [];
    
    questionAnswerPairs.forEach((pair, index) => {
        const userAnswer = pair.userAnswer.toLowerCase().trim();
        const memoryContext = pair.expectedContext.toLowerCase();
        
        let score = 'INCORRECT'; // Default to INCORRECT for strict scoring
        let reasoning = 'Default strict scoring';
        
        if (!userAnswer) {
            score = 'INCORRECT';
            reasoning = 'No answer provided';
        } else {
            // STRICT word matching - only exact or very close matches
            const answerWords = userAnswer.split(/\s+/).filter(word => word.length > 1);
            const contextWords = memoryContext.split(/\s+/).filter(word => word.length > 1);
            
            // Check for exact matches
            const exactMatches = answerWords.filter(word => 
                contextWords.some(contextWord => contextWord === word)
            );
            
            // Check for close matches (containing each other)
            const closeMatches = answerWords.filter(word => 
                contextWords.some(contextWord => 
                    contextWord.includes(word) || word.includes(contextWord)
                )
            );
            
            if (exactMatches.length > 0) {
                score = 'CORRECT';
                reasoning = `Exact matches found: ${exactMatches.join(', ')}`;
            } else if (closeMatches.length > 0) {
                score = 'PARTIAL';
                reasoning = `Close matches found: ${closeMatches.join(', ')}`;
            } else {
                score = 'INCORRECT';
                reasoning = `No relevant matches found in "${userAnswer}" for context "${memoryContext}"`;
            }
            
            // STRICT family relationship check
            const familyTerms = ['uncle', 'aunt', 'father', 'dad', 'mother', 'mom', 'brother', 'sister', 'grandfather', 'grandmother', 'grandpa', 'grandma'];
            const memoryFamilyTerm = familyTerms.find(term => memoryContext.includes(term));
            const userFamilyTerm = familyTerms.find(term => userAnswer.includes(term));
            
            if (memoryFamilyTerm && userFamilyTerm && memoryFamilyTerm !== userFamilyTerm) {
                // Special case for dad/father equivalence
                const equivalentTerms = [
                    ['dad', 'father'],
                    ['mom', 'mother'],
                    ['grandpa', 'grandfather'],
                    ['grandma', 'grandmother']
                ];
                
                const isEquivalent = equivalentTerms.some(group => 
                    group.includes(memoryFamilyTerm) && group.includes(userFamilyTerm)
                );
                
                if (!isEquivalent) {
                    score = 'INCORRECT';
                    reasoning = `Wrong family relationship: "${userFamilyTerm}" is not "${memoryFamilyTerm}"`;
                }
            }
        }
        
        results.push({
            questionIndex: index,
            score: score,
            reasoning: reasoning
        });
    });

    console.log('Strict fallback scoring results:', results);
    return results;
}

// Enhanced helper function to parse questions from AI response (kept for fallback)
function parseQuestions(response, memories) {
    const questions = [];
    
    // Split by lines and look for numbered questions
    const lines = response.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Look for numbered questions (1., 2., 3., etc.) - more flexible matching
        const questionMatch = trimmedLine.match(/^\d+\.\s*(.+\?)\s*$/);
        if (questionMatch) {
            let questionText = questionMatch[1].trim();
            
            // Clean up any formatting artifacts
            questionText = questionText
                .replace(/^\[.*?\]\s*/, '') // Remove [Question type] prefixes
                .replace(/^(What|Where|Who|When|How|Why)\s+/, (match) => match) // Keep question words
                .trim();
            
            // Ensure question ends with ?
            if (!questionText.endsWith('?')) {
                questionText += '?';
            }
            
            // Try to match question to specific memory based on content
            const relatedMemory = findBestMatchingMemory(questionText, memories);
            
            questions.push({
                text: questionText,
                context: relatedMemory ? relatedMemory.description : memories[0]?.description || '',
                memoryId: relatedMemory ? relatedMemory.id : memories[0]?.id || null,
                category: relatedMemory ? relatedMemory.category : 'general',
                type: 'recall'
            });
        }
    }

    // Fallback: look for any question-like sentences
    if (questions.length === 0) {
        const sentences = response.split(/[.!?\n]+/);
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            
            // Look for question patterns
            if ((trimmed.includes('?') || /^\s*(what|where|who|when|how|why|which|did|do|does|can|will|would|could|is|are|was|were)/i.test(trimmed)) && trimmed.length > 10) {
                let questionText = trimmed;
                
                // Clean formatting
                questionText = questionText
                    .replace(/^\[.*?\]\s*/, '')
                    .replace(/^\d+\.\s*/, '')
                    .trim();
                
                if (!questionText.endsWith('?')) {
                    questionText += '?';
                }
                
                const relatedMemory = findBestMatchingMemory(questionText, memories);
                
                questions.push({
                    text: questionText,
                    context: relatedMemory ? relatedMemory.description : memories[0]?.description || '',
                    memoryId: relatedMemory ? relatedMemory.id : memories[0]?.id || null,
                    category: relatedMemory ? relatedMemory.category : 'general',
                    type: 'recall'
                });
                
                if (questions.length >= 5) break; // Don't get too many from fallback
            }
        }
    }

    return questions;
}

// Helper function to find which memory a question relates to (improved matching)
function findBestMatchingMemory(questionText, memories) {
    const questionLower = questionText.toLowerCase();
    const questionWords = questionLower.split(' ').filter(word => word.length > 2);
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const memory of memories) {
        // Combine title and description for matching
        const memoryText = `${memory.title} ${memory.description}`.toLowerCase();
        const memoryWords = memoryText.split(' ').filter(word => word.length > 2);
        
        // Calculate match score based on word overlap
        let matchScore = 0;
        for (const qWord of questionWords) {
            if (memoryWords.some(mWord => mWord.includes(qWord) || qWord.includes(mWord))) {
                matchScore += 1;
            }
        }
        
        // Normalize score
        const normalizedScore = matchScore / Math.max(questionWords.length, 1);
        
        if (normalizedScore > bestScore && normalizedScore > 0.2) { // At least 20% word overlap
            bestScore = normalizedScore;
            bestMatch = memory;
        }
    }
    
    return bestMatch || memories[0]; // fallback to first memory if no good match
}

// GET /api/reset-question-history - Reset question tracking (for testing)
router.get('/reset-question-history', (req, res) => {
    usedMemories.clear();
    recentQuestions.clear();
    
    res.json({
        success: true,
        message: 'Question history reset successfully'
    });
});

// GET /api/question-stats - Get statistics about question generation
router.get('/question-stats', (req, res) => {
    const now = Date.now();
    const recentCount = Array.from(recentQuestions.values())
        .filter(timestamp => now - timestamp < 60 * 60 * 1000).length;
    
    res.json({
        success: true,
        data: {
            usedMemoriesCount: usedMemories.size,
            recentQuestionsCount: recentCount,
            totalTrackedQuestions: recentQuestions.size
        }
    });
});

// GET /api/health/ollama - Check if Ollama is running
router.get('/health/ollama', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
            timeout: 10000
        });
        
        const hasGemma = response.data.models?.some(model => 
            model.name.includes('gemma') || model.name.includes(MODEL_NAME)
        );

        res.json({
            success: true,
            data: {
                ollamaRunning: true,
                modelAvailable: hasGemma,
                installedModels: response.data.models?.map(m => m.name) || [],
                recommendedModel: MODEL_NAME
            }
        });
    } catch (error) {
        res.json({
            success: false,
            data: {
                ollamaRunning: false,
                modelAvailable: false,
                error: error.message
            }
        });
    }
});

module.exports = router;