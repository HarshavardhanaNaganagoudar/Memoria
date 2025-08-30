import React, { useState, useEffect } from 'react';

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
    <div className="flex flex-col items-center justify-end h-32 relative">
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

// Emergency Contact Dialog Component
const EmergencyContactDialog = ({ isOpen, onClose, onConfirm }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleYes = () => {
    onConfirm();
    setShowConfirmation(true);
  };

  const handleNo = () => {
    onClose();
    setShowConfirmation(false);
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {!showConfirmation ? (
          <>
            <div className="text-center mb-6">
              <div className="text-orange-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-medium text-gray-800 mb-4">Memory Assessment Alert</h2>
              <p className="text-gray-600 leading-relaxed">
                Your recent memory assessment shows some concerning changes. For your safety, it's recommended to contact your emergency contact or caregiver. Would you like to notify them now?
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleYes}
                className="px-6 py-3 bg-orange-600 text-gray-700 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Yes
              </button>
              <button
                onClick={handleNo}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                No
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-green-500 text-4xl mb-4">✓</div>
              <h2 className="text-xl font-medium text-gray-800 mb-4">Emergency Contact Notified</h2>
              <p className="text-gray-600 leading-relaxed">
                Your emergency contact has been notified. They will reach out to support you shortly. Remember, you're not alone—help is on the way.
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleCloseConfirmation}
                className="px-6 py-3 bg-green-600 text-gray-700 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TrackMemory = ({ onBack, onNavigateToFeedback }) => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);

  useEffect(() => {
    fetchTestResults();
  }, []);

  // Check if emergency dialog should be shown when testResults change
  useEffect(() => {
    if (testResults.length > 0) {
      const averageScore = testResults.reduce((sum, result) => sum + result.percentage, 0) / testResults.length;
      if (averageScore < 50) {
        setShowEmergencyDialog(true);
      }
    }
  }, [testResults]);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/scores');
      
      if (!response.ok) {
        throw new Error('Failed to fetch test results');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Get last 7 results and reverse to show oldest to newest
        const last7Results = data.data.slice(0, 7).reverse();
        setTestResults(last7Results);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (err) {
      console.error('Error fetching test results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Format as day of week for recent dates
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  };

  const handleEmergencyContactNotify = () => {
    // Here you would implement the actual emergency contact notification
    console.log('Emergency contact notified');
  };

  const handleCloseEmergencyDialog = () => {
    setShowEmergencyDialog(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your memory progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">Unable to Load Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={fetchTestResults}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
          >
            ← Back to home screen
          </button>
          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-3xl font-light text-gray-800 text-center mb-2" style={{ fontFamily: '"Zen Loop", cursive' }}>Memory Progress</h1>
          <div></div> {/* Spacer for centering */}
        </div>

        {testResults.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">No Test Results Yet</h2>
            <p className="text-gray-600 mb-4">Take your first memory test to see your progress here!</p>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Take a Test
            </button>
          </div>
        ) : (
          <>
            {/* Weekly Progress */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-xl font-medium text-gray-800 mb-6 text-center">Recent Test Results</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-6">
                {testResults.map((result, index) => (
                  <div key={result.id} className="text-center">
                    <p className="text-sm text-gray-600 mb-3 font-medium">
                      {formatDate(result.test_date)}
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3 min-h-[200px] flex flex-col justify-end">
                      <div className="mb-2">
                        <ZenStones 
                          correctAnswers={result.correct_answers} 
                          maxQuestions={result.total_questions} 
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {result.correct_answers}/{result.total_questions}
                      </p>
                      <p className="text-xs text-gray-400">
                        {result.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-xl font-medium text-gray-800 mb-6 text-center">Performance Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {Math.round(testResults.reduce((sum, result) => sum + result.percentage, 0) / testResults.length)}%
                  </div>
                  <div className="text-sm text-blue-800">Average Score</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {Math.max(...testResults.map(r => r.percentage))}%
                  </div>
                  <div className="text-sm text-green-800">Best Score</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {testResults.length}
                  </div>
                  <div className="text-sm text-purple-800">Tests Taken</div>
                </div>
              </div>
            </div>

            {/* Usage Guide */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Each correctly answered question adds one stone to your zen tower</li>
                <li>• Stones stack from largest (bottom) to smallest (top)</li>
                <li>• Higher towers represent better memory performance</li>
                <li>• Track your progress over your recent test sessions</li>
              </ul>
            </div>

            {/* AI Feedback Button */}
            <div className="mt-8 text-center">
              <button 
                onClick={() => onNavigateToFeedback && onNavigateToFeedback()}
                className="px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
              >
                Click for AI feedback
              </button>
            </div>
          </>
        )}
      </div>

      {/* Emergency Contact Dialog */}
      <EmergencyContactDialog 
        isOpen={showEmergencyDialog}
        onClose={handleCloseEmergencyDialog}
        onConfirm={handleEmergencyContactNotify}
      />
    </div>
  );
};

export default TrackMemory;