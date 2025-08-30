import React, { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import LogMemory from './components/LogMemory'
import TestMemory from './components/TestMemory'
import TrackMemory from './components/TrackMemory'
import AIFeedback from './components/AIFeedback' // Add this import
import './App.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState('home')
  
  const navigateToLogMemory = () => {
    setCurrentScreen('logMemory')
  }
  
  const navigateToTestMemory = () => {
    setCurrentScreen('testMemory')
  }
  
  const navigateToTrackMemory = () => {
    setCurrentScreen('trackMemory')
  }
  
  // Add this new navigation function
  const navigateToAIFeedback = () => {
    setCurrentScreen('aiFeedback')
  }
  
  const navigateToHome = () => {
    setCurrentScreen('home')
  }
  
  const renderScreen = () => {
    switch(currentScreen) {
      case 'logMemory':
        return <LogMemory onBack={navigateToHome} />
      case 'testMemory':
        return <TestMemory onBack={navigateToHome} />
      case 'trackMemory':
        return (
          <TrackMemory 
            onBack={navigateToHome}
            onNavigateToFeedback={navigateToAIFeedback} // Add this prop
          />
        )
      case 'aiFeedback': // Add this case
        return <AIFeedback onBack={navigateToTrackMemory} />
      case 'home':
      default:
        return (
          <HomeScreen 
            onLogMemory={navigateToLogMemory}
            onTestMemory={navigateToTestMemory}
            onTrackMemory={navigateToTrackMemory}
          />
        )
    }
  }
  
  return (
    <div className="App">
      {renderScreen()}
    </div>
  )
}

export default App