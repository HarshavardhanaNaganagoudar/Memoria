import React, { useState } from 'react';
import ApiService from '../services/api'; // Adjust path as needed

const LogMemory = ({ onBack }) => {
  const [textMemory, setTextMemory] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSaveMemory = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const memoriesToSave = [];

      // Check if we have text-only memory
      if (textMemory.trim()) {
        const textTitle = textMemory.length <= 50 
          ? textMemory.trim() 
          : textMemory.substring(0, 50).trim() + '...';
        
        memoriesToSave.push({
          title: textTitle,
          description: textMemory.trim(),
          category: 'text',
          photo: null,
          tags: ['text', 'memory'],
          location: '',
        });
      }

      // Check if we have photo memory
      if (selectedFile) {
        const photoTitle = photoDescription.trim() || 'Photo Memory';
        const photoDesc = photoDescription.trim() || 'Photo memory';
        
        memoriesToSave.push({
          title: photoTitle,
          description: photoDesc,
          category: 'photo',
          photo: selectedFile,
          tags: ['photo', 'memory'],
          location: '',
        });
      }

      if (memoriesToSave.length === 0) {
        setErrorMessage('Please enter some text or upload a photo to save a memory.');
        return;
      }

      // Save all memories
      const results = [];
      for (const memoryData of memoriesToSave) {
        const result = await ApiService.createMemory(memoryData);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      
      if (successCount === results.length) {
        const message = successCount === 1 
          ? 'Memory saved successfully! 🎉'
          : `${successCount} memories saved successfully! 🎉`;
        setSuccessMessage(message);
        
        console.log('Saved memories:', results.map(r => r.data));
        
        // Reset form after successful save
        setTimeout(() => {
          resetForm();
        }, 2000);
      } else {
        setErrorMessage('Some memories failed to save. Please try again.');
      }

    } catch (error) {
      console.error('Error saving memory:', error);
      setErrorMessage(error.message || 'Network error. Please check if the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTextMemory('');
    setSelectedFile(null);
    setPhotoDescription('');
    setSuccessMessage('');
    setErrorMessage('');
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const removePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoDescription('');
  };

  // Clean up object URL on component unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const canSave = (textMemory.trim() || selectedFile) && !isLoading;

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <button
          onClick={onBack}
          className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2 disabled:opacity-50 shadow-sm"
          disabled={isLoading}
        >
          ← Back
        </button>
        <h1 className="text-4xl text-gray-800 text-center mb-2" style={{ fontFamily: '"Zen Loop", cursive' }}>
          Log Your Memory
        </h1>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="w-full max-w-2xl mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="w-full max-w-2xl mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
          {errorMessage}
          <button 
            onClick={() => setErrorMessage('')}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Log Text Only Section */}
      <div className="w-full max-w-2xl mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl text-gray-700 text-center mb-4 font-medium">💭 Text Memory</h2>
          <textarea
            value={textMemory}
            onChange={(e) => setTextMemory(e.target.value)}
            placeholder="Write about an event, thought, or something you want to remember..."
            className="w-full h-32 p-4 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400 disabled:opacity-50"
            disabled={isLoading}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-500">
              {textMemory.trim() ? '✓ Text memory ready to save' : 'Enter your memory text'}
            </div>
            <div className="text-sm text-gray-500">
              {textMemory.length}/1000
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full max-w-2xl mb-8 flex items-center">
        <div className="flex-1 border-t border-gray-300"></div>
        <div className="px-4 text-gray-500 text-sm">AND / OR</div>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Log Photo + Text Section */}
      <div className="w-full max-w-2xl mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl text-gray-700 text-center mb-6 font-medium">📸 Photo Memory</h2>
          
          {/* Photo Upload Area */}
          <div className="flex flex-col items-center mb-6">
            {!previewUrl ? (
              <label className={`cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-colors">
                  <div className="text-3xl text-gray-400 mb-1">📷</div>
                  <div className="text-xs text-gray-500 text-center px-2">Click to add photo</div>
                </div>
              </label>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Memory preview"
                  className="w-40 h-40 object-cover rounded-lg shadow-lg"
                />
                <button
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 disabled:opacity-50 shadow-lg"
                  disabled={isLoading}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Photo Description */}
          <input
            type="text"
            value={photoDescription}
            onChange={(e) => setPhotoDescription(e.target.value)}
            placeholder="Describe your photo..."
            className="w-full p-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400 disabled:opacity-50"
            disabled={isLoading}
            maxLength={200}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-500">
              {selectedFile ? '✓ Photo memory ready to save' : 'Upload a photo and add description'}
            </div>
            <div className="text-sm text-gray-500">
              {photoDescription.length}/200
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveMemory}
        disabled={!canSave}
        className={`px-8 py-3 rounded-full font-medium transition-all duration-200 shadow-sm ${
          canSave
            ? 'bg-gray-800 text-gray-600 hover:bg-gray-900 transform hover:scale-105 shadow-lg'
            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
        } ${isLoading ? 'opacity-75' : ''}`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Saving memory...
          </div>
        ) : (
          'Save your memory'
        )}
      </button>

      {/* Instructions */}
      <div className="w-full max-w-2xl mt-8 text-center text-gray-500 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-blue-800 mb-2">💡 How it works:</p>
          <div className="text-blue-700 space-y-1">
            <p>• <strong>Text Memory:</strong> Write something you want to remember</p>
            <p>• <strong>Photo Memory:</strong> Upload a photo with description</p>
            <p>• <strong>Both:</strong> Save separate memories for text and photo</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogMemory;