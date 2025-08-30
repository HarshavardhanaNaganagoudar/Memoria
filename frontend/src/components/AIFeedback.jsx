import React, { useState, useEffect } from 'react';

const AIFeedback = ({ onBack }) => {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    generateFeedback();
  }, []);

  const generateFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUsingFallback(false);

      console.log('Fetching AI feedback from backend...');
      
      // Single API call to backend that handles everything
      const response = await fetch('http://localhost:3001/api/ai-feedback', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(180000) // 3 minute timeout
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown backend error');
      }

      // Set all the state from the backend response
      setFeedback(data.feedback);
      setTestResults(data.testResults || []);
      setIsUsingFallback(!data.usingAI);
      
      if (data.error) {
        setError(getErrorMessage(data.error));
      }

      console.log(`Feedback generated successfully (AI: ${data.usingAI})`);

      // Also check AI status for debug info
      checkAIStatus();

    } catch (err) {
      console.error('Error fetching AI feedback:', err);
      setError(getErrorMessage(err.message));
      setIsUsingFallback(true);
      
      // Emergency fallback
      setFeedback("Unable to generate feedback at this time. Please try again later or contact support if the issue persists.");
    } finally {
      setLoading(false);
    }
  };

  // Check AI service status for debugging
  const checkAIStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ai-status');
      if (response.ok) {
        const status = await response.json();
        setAiStatus(status);
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
    }
  };

  // Simplified error message function
  const getErrorMessage = (errorMessage) => {
    if (errorMessage.includes('Backend API error')) {
      return 'Unable to connect to the feedback service. Please try again later.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
      return 'The analysis is taking longer than expected. Please try again.';
    } else if (errorMessage.includes('OLLAMA_NOT_RUNNING')) {
      return 'AI service is not running. Using rule-based analysis instead.';
    } else if (errorMessage.includes('MODEL_NOT_FOUND')) {
      return 'AI model not available. Using rule-based analysis instead.';
    } else {
      return 'Feedback service temporarily unavailable. Using fallback analysis.';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    generateFeedback();
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your memory performance...</p>
          <p className="text-sm text-gray-500 mt-2">
            {retryCount > 0 ? 'Retrying analysis...' : 'Generating personalized feedback...'}
          </p>
        </div>
      </div>
    );
  }

  if (error && !feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
            <div className="text-orange-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">Analysis Temporarily Unavailable</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back to Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-8">
  <div className="max-w-4xl mx-auto">
    {/* Header */}
    <div className="grid grid-cols-3 items-center mb-8">
      <button
        onClick={onBack}
        className="justify-self-start px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
      >
        ← Back to memory progress
      </button>
      
      <div className="text-center">
        <h1 
          className="text-3xl font-light text-gray-800" 
          style={{ fontFamily: '"Zen Loop", cursive' }}
        >
          AI Feedback
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isUsingFallback ? 'Rule-based Analysis' : 'Powered by AI'}
        </p>
      </div>
      
      <div></div> {/* Empty spacer */}
    </div>

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Recent Performance Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {testResults.map((result, index) => (
                <div key={result.id} className="text-center">
                  <p className="text-xs text-gray-600 mb-2 font-medium">
                    {formatDate(result.test_date)}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-600">
                      {result.percentage}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {result.correct_answers}/{result.total_questions}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Feedback */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-lg">
                {isUsingFallback ? '📊' : '🤖'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-medium text-gray-800">
                {isUsingFallback ? 'Memory Analysis' : 'AI Feedback'}
              </h2>
              <p className="text-sm text-gray-500">
                {isUsingFallback ? 'Professional rule-based analysis' : 'Personalized AI analysis of your memory performance'}
              </p>
            </div>
          </div>
          
          {isUsingFallback && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-700">
                AI analysis unavailable. Using built-in professional analysis instead.
              </p>
              {error && (
                <p className="text-xs text-orange-600 mt-1">
                  Error: {error}
                </p>
              )}
            </div>
          )}
          
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {feedback}
            </div>
          </div>
        </div>

        {/* Debug Info (Development Mode) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 rounded-lg p-4 mb-8 text-sm">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>Using Fallback: {isUsingFallback ? 'Yes' : 'No'}</p>
            <p>Error: {error || 'None'}</p>
            <p>Test Results Count: {testResults.length}</p>
            <p>Retry Count: {retryCount}</p>
            {aiStatus && (
              <div className="mt-2 p-2 bg-gray-200 rounded">
                <p className="font-semibold">AI Service Status:</p>
                <p>Ollama Running: {aiStatus.ollama_running ? 'Yes' : 'No'}</p>
                <p>Model Available: {aiStatus.model_available ? 'Yes' : 'No'}</p>
                {aiStatus.available_models && aiStatus.available_models.length > 0 && (
                  <p>Available Models: {aiStatus.available_models.join(', ')}</p>
                )}
                {aiStatus.error && <p>Error: {aiStatus.error}</p>}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={printReport}
            className="px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
          >
            Print your report
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>AI-generated feedback is for informational purposes only and should not replace professional medical advice.</p>
        </div>
      </div>
    </div>
  );
};

export default AIFeedback;