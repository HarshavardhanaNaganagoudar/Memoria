import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

// Zen Stones Component (unchanged)
const ZenStones = ({ correctAnswers, maxQuestions = 5 }) => {
  // Stone sizes in descending order (largest at bottom) - made smaller for grid layout
  const stoneSizes = [
    { width: 80, height: 25 }, // Bottom stone (largest)
    { width: 70, height: 22 },
    { width: 60, height: 20 },
    { width: 50, height: 18 },
    { width: 40, height: 15 }   // Top stone (smallest)
  ];
  
  // Generate stones based on correct answers (largest first for bottom-up stacking)
  const stones = [];
  for (let i = 0; i < correctAnswers; i++) {
    const stone = stoneSizes[i]; // Start from largest (index 0) for bottom stone
    stones.push(stone);
  }
  
  return (
    <div className="flex flex-col items-center justify-end h-32 relative mb-4">
      {/* Natural ground shadow */}
      <div className="absolute bottom-0 w-24 h-2 bg-black opacity-20 rounded-full blur-sm"></div>
      
      {/* Stones stack from bottom to top */}
      <div className="flex flex-col-reverse items-center relative z-10">
        {stones.map((stone, index) => (
          <div
            key={index}
            className="relative"
            style={{
              width: `${stone.width}px`,
              height: `${stone.height}px`,
              marginBottom: index === 0 ? '6px' : '-3px' // First stone has base margin, others overlap
            }}
          >
            {/* Main stone body with organic, uneven shape */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse at 30% 30%, #8b9499 0%, #5a6267 40%, #3d4448 100%),
                  radial-gradient(ellipse at 70% 70%, transparent 30%, rgba(0,0,0,0.3) 70%)
                `,
                borderRadius: index === 0 ? '60% 40% 45% 55% / 50% 60% 40% 50%' : // Bottom stone - most irregular
                           index === 1 ? '55% 45% 50% 50% / 45% 55% 45% 55%' : 
                           index === 2 ? '50% 50% 55% 45% / 55% 45% 50% 50%' :
                           index === 3 ? '52% 48% 47% 53% / 48% 52% 53% 47%' :
                           '54% 46% 49% 51% / 51% 49% 46% 54%', // Top stone - slightly irregular
                boxShadow: `
                  inset 1px 1px 4px rgba(255,255,255,0.1),
                  inset -1px -1px 4px rgba(0,0,0,0.3),
                  0 2px 6px rgba(0,0,0,0.3)
                `
              }}
            ></div>
            
            {/* Texture overlay */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                borderRadius: index === 0 ? '60% 40% 45% 55% / 50% 60% 40% 50%' :
                           index === 1 ? '55% 45% 50% 50% / 45% 55% 45% 55%' : 
                           index === 2 ? '50% 50% 55% 45% / 55% 45% 50% 50%' :
                           index === 3 ? '52% 48% 47% 53% / 48% 52% 53% 47%' :
                           '54% 46% 49% 51% / 51% 49% 46% 54%',
                background: `
                  radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 1px, transparent 1px),
                  radial-gradient(circle at 80% 30%, rgba(0,0,0,0.2) 1px, transparent 1px),
                  radial-gradient(circle at 40% 70%, rgba(255,255,255,0.2) 1px, transparent 1px)
                `,
                backgroundSize: '10px 8px, 12px 9px, 9px 6px'
              }}
            ></div>
            
            {/* Subtle highlight on top */}
            <div
              className="absolute opacity-30"
              style={{
                top: '15%',
                left: '25%',
                width: '50%',
                height: '25%',
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 70%)'
              }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TestMemory = ({ onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(null);
  const [memories, setMemories] = useState([]); // Add state to store memories

  useEffect(() => {
    generateQuestions();
  }, []);

  // Helper function to get photo URL from memory
  const getPhotoUrl = (memory) => {
    if (!memory || !memory.photo_path) return null;
    
    // Convert Windows path to URL format
    const filename = memory.photo_path.split('\\').pop(); // Get just the filename
    return `http://localhost:3001/uploads/photos/${filename}`;
  };

  // IMPROVED: Helper function to find memory by ID with better matching
  const findMemoryById = (memoryId) => {
    if (!memoryId || !memories.length) return null;
    
    // Try exact ID match first
    const exactMatch = memories.find(memory => memory.id === memoryId);
    if (exactMatch) {
      console.log(`Found exact memory match for ID ${memoryId}:`, exactMatch.title);
      return exactMatch;
    }
    
    // Try string/number conversion match
    const convertedMatch = memories.find(memory => 
      memory.id.toString() === memoryId.toString()
    );
    if (convertedMatch) {
      console.log(`Found converted memory match for ID ${memoryId}:`, convertedMatch.title);
      return convertedMatch;
    }
    
    console.log(`No memory found for ID ${memoryId}`);
    return null;
  };

  // IMPROVED: Helper function to find memory by question content (fallback)
  const findMemoryByQuestionContent = (questionText, questionIndex) => {
    if (!questionText || !memories.length) return null;
    
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
    
    if (bestMatch) {
      console.log(`Found content-based memory match for question "${questionText}":`, bestMatch.title);
    }
    
    return bestMatch;
  };

  // IMPROVED: Helper function to determine if image should be shown
  const shouldShowImage = (memory) => {
    if (!memory || !memory.photo_path) return false;
    
    // Show image if it has a photo_path
    const hasPhoto = !!memory.photo_path;
    
    console.log(`Memory "${memory.title}": hasPhoto=${hasPhoto}, category="${memory.category}"`);
    return hasPhoto;
  };

  const generateQuestions = async () => {
    setIsLoading(true);
    setIsGenerating(true);
    setError('');

    try {
      // First, get memories from the database
      const memoriesResponse = await ApiService.getMemories({ limit: 10 });
      
      if (!memoriesResponse.success || memoriesResponse.data.length === 0) {
        setError('No memories found! Please log some memories first.');
        return;
      }

      console.log('Found memories:', memoriesResponse.data);
      setMemories(memoriesResponse.data); // Store memories in state

      // Generate questions using the backend
      const questionsResponse = await fetch('http://localhost:3001/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memories: memoriesResponse.data,
          count: 5
        }),
      });

      const questionsResult = await questionsResponse.json();

      if (questionsResult.success) {
        console.log('Generated questions:', questionsResult.data);
        
        // IMPROVED: Validate and fix question-memory associations
        const validatedQuestions = questionsResult.data.map((question, index) => {
          // First try to find by memoryId
          let associatedMemory = findMemoryById(question.memoryId);
          
          // If not found by ID, try content-based matching
          if (!associatedMemory) {
            associatedMemory = findMemoryByQuestionContent(question.text, index);
            
            // Update the question with the correct memoryId
            if (associatedMemory) {
              console.log(`Fixed memory association for question: "${question.text}" -> Memory: "${associatedMemory.title}"`);
              question.memoryId = associatedMemory.id;
            }
          }
          
          return question;
        });
        
        setQuestions(validatedQuestions);
        
        // Initialize answers object
        const initialAnswers = {};
        validatedQuestions.forEach((q, index) => {
          initialAnswers[index] = '';
        });
        setAnswers(initialAnswers);
      } else {
        setError(questionsResult.error || 'Failed to generate questions');
      }

    } catch (error) {
      console.error('Error generating questions:', error);
      setError('Failed to generate questions. Make sure Ollama is running with gpt-oss model.');
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Submit answers for scoring
      const response = await fetch('http://localhost:3001/api/score-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: questions,
          answers: answers
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setScore(result.data);
        setShowResults(true);
        
        // Save the score to database
        try {
          const saveResponse = await fetch('http://localhost:3001/api/scores', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              totalQuestions: result.data.totalQuestions,
              correctAnswers: result.data.correctAnswers,
              partialAnswers: result.data.partialAnswers || 0,
              finalScore: result.data.finalScore,
              percentage: result.data.percentage,
              details: result.data.details,
              memoriesTested: questions.map(q => q.memoryId).filter(id => id)
            }),
          });
          
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            console.log('Test score saved successfully');
          }
        } catch (saveError) {
          console.error('Failed to save test score:', saveError);
          // Don't show error to user as the main functionality worked
        }
      } else {
        setError('Failed to score answers');
      }
    } catch (error) {
      console.error('Error scoring answers:', error);
      setError('Failed to score answers');
    } finally {
      setIsLoading(false);
    }
  };

  const resetTest = () => {
    setQuestions([]);
    setAnswers({});
    setShowResults(false);
    setScore(null);
    setError('');
    setMemories([]);
    generateQuestions();
  };

  // All the other render logic remains the same until the questions section...

  if (isLoading && isGenerating) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-600 mx-auto mb-4"></div>
          <h2 className="text-2xl text-gray-700 mb-2" style={{ fontFamily: '"Zen Loop", cursive' }}>
            Generating Questions...
          </h2>
          <p className="text-gray-500">
            Our AI is analyzing your memories to create personalized questions
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          <button
            onClick={onBack}
            className="mb-8 text-gray-600 hover:text-gray-800 flex items-center gap-2 shadow-sm"
          >
            ← Back
          </button>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl text-red-800 mb-4">Unable to Generate Test</h2>
            <p className="text-red-600 mb-6">{error}</p>
            
            <div className="space-y-2 text-sm text-red-700 mb-6">
              <p>Make sure:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>You have logged some memories</li>
                <li>Ollama is running (ollama serve)</li>
                <li>gpt-oss model is installed (ollama pull gpt-oss:20b)</li>
                <li>Backend server is running</li>
              </ul>
            </div>
            
            <button
              onClick={resetTest}
              className="px-6 py-2 bg-red-600 text-gray-800 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showResults && score) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-2xl">
          <button
            onClick={onBack}
            className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2 shadow-sm"
          >
            ← Back to Home
          </button>
          
          <div className="bg-white rounded-2xl p-8 shadow-sm border text-center">
            <h2 className="text-3xl text-gray-800 mb-6" style={{ fontFamily: '"Zen Loop", cursive' }}>
              Your Memory Test Results
            </h2>
            
            <div className="mb-6">
              <div className="text-6xl font-bold text-blue-600 mb-2">
                {Math.round((score.correctAnswers / score.totalQuestions) * 100)}%
              </div>
              <p className="text-xl text-gray-600">
                {score.correctAnswers} out of {score.totalQuestions} correct
              </p>
            </div>
            
            {/* Zen Stones Component */}
            <ZenStones correctAnswers={score.correctAnswers} maxQuestions={score.totalQuestions} />
            
            <div className="space-y-4 text-left mb-8">
              {score.details && score.details.map((detail, index) => (
                <div key={index} className={`p-4 rounded-lg ${detail.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="font-medium mb-2">{detail.question}</p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Your answer:</span> {detail.userAnswer || 'No answer'}
                  </p>
                  {!detail.correct && detail.expectedAnswer && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Expected:</span> {detail.expectedAnswer}
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={resetTest}
                className="px-6 py-3 bg-blue-600 text-gray-700 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
              >
                Take Another Test
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors shadow-sm"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <button
          onClick={onBack}
          className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2 shadow-sm"
        >
          ← Back
        </button>
        <h1 className="text-4xl text-gray-800 text-center mb-2" style={{ fontFamily: '"Zen Loop", cursive' }}>
          Test Your Memory
        </h1>
        <p className="text-center text-gray-600">
          Answer these questions based on your logged memories
        </p>
      </div>

      {/* IMPROVED Questions Section */}
      <div className="w-full max-w-2xl space-y-6 mb-8">
        {questions.map((question, index) => {
          // IMPROVED: Better memory association with fallback
          let associatedMemory = findMemoryById(question.memoryId);
          
          // Fallback: try content-based matching if ID match fails
          if (!associatedMemory) {
            associatedMemory = findMemoryByQuestionContent(question.text, index);
          }
          
          // Final fallback: use the first memory or null
          if (!associatedMemory && memories.length > 0) {
            associatedMemory = memories[0];
            console.log(`Using fallback memory for question ${index + 1}: ${associatedMemory.title}`);
          }
          
          const photoUrl = associatedMemory ? getPhotoUrl(associatedMemory) : null;
          const showImage = associatedMemory && shouldShowImage(associatedMemory);
          
          console.log(`Question ${index + 1}:`, {
            text: question.text,
            memoryId: question.memoryId,
            memoryTitle: associatedMemory?.title || 'not found',
            photoUrl,
            showImage
          });
          
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {index + 1}. {question.text}
              </h3>
              
              {/* IMPROVED: Display photo with better error handling */}
              {showImage && photoUrl && (
                <div className="mb-4">
                  <div className="relative">
                    <img
                      src={photoUrl}
                      alt={associatedMemory.title}
                      className="w-full max-w-md mx-auto rounded-lg shadow-md"
                      style={{ maxHeight: '300px', objectFit: 'contain' }}
                      onError={(e) => {
                        console.error('Failed to load image:', photoUrl);
                        e.target.style.display = 'none';
                        // Hide the caption too if image fails
                        const caption = e.target.parentElement.querySelector('.image-caption');
                        if (caption) caption.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('Successfully loaded image:', photoUrl);
                      }}
                    />
                    {/* <p className="image-caption text-xs text-gray-500 mt-2 text-center italic">
                      Reference image from your memory: "{associatedMemory.title}"
                    </p> */}
                  </div>
                </div>
              )}
              
              {/* Debug info - REMOVE IN PRODUCTION */}
              {/* {process.env.NODE_ENV === 'development' && (
                <div className="mb-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                  <p>Debug: Memory ID: {question.memoryId}, Title: {associatedMemory?.title || 'none'}</p>
                  <p>Photo path: {associatedMemory?.photo_path || 'none'}</p>
                  <p>Category: {associatedMemory?.category || 'none'}</p>
                  <p>Show Image: {showImage ? 'Yes' : 'No'}</p>
                </div>
              )} */}
              
              <input
                type="text"
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
              />
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      {questions.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={isLoading || Object.values(answers).every(answer => !answer.trim())}
          className={`px-8 py-3 rounded-full font-medium transition-all duration-200 shadow-sm ${
            isLoading || Object.values(answers).every(answer => !answer.trim())
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-gray-600 hover:bg-blue-700 transform hover:scale-105 shadow-lg'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Scoring answers...
            </div>
          ) : (
            'Show my result'
          )}
        </button>
      )}

      {/* Instructions */}
      <div className="w-full max-w-2xl mt-8 text-center text-gray-500 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-blue-800 mb-2">💡 How it works:</p>
          <div className="text-blue-700 space-y-1">
            <p>• Questions are generated from your logged memories</p>
            <p>• Images are shown when available</p>
            <p>• Answer as accurately as you can remember</p>
            <p>• Your score will help track memory improvement</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMemory;