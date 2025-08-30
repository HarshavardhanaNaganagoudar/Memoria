const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  // Helper method for handling responses
  static async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  // Memory-related API calls
  static async createMemory(memoryData) {
    const formData = new FormData();
    
    // Add all the fields
    Object.keys(memoryData).forEach(key => {
      if (key === 'tags' && Array.isArray(memoryData[key])) {
        formData.append(key, JSON.stringify(memoryData[key]));
      } else if (key === 'photo' && memoryData[key]) {
        formData.append(key, memoryData[key]);
      } else if (memoryData[key] !== null && memoryData[key] !== undefined) {
        formData.append(key, memoryData[key]);
      }
    });

    const response = await fetch(`${API_BASE_URL}/memories`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse(response);
  }

  static async getMemories(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        queryParams.append(key, filters[key]);
      }
    });

    const url = `${API_BASE_URL}/memories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url);
    return this.handleResponse(response);
  }

  static async getMemory(id) {
    const response = await fetch(`${API_BASE_URL}/memories/${id}`);
    return this.handleResponse(response);
  }

  static async updateMemory(id, memoryData) {
    const formData = new FormData();
    
    Object.keys(memoryData).forEach(key => {
      if (key === 'tags' && Array.isArray(memoryData[key])) {
        formData.append(key, JSON.stringify(memoryData[key]));
      } else if (key === 'photo' && memoryData[key]) {
        formData.append(key, memoryData[key]);
      } else if (memoryData[key] !== null && memoryData[key] !== undefined) {
        formData.append(key, memoryData[key]);
      }
    });

    const response = await fetch(`${API_BASE_URL}/memories/${id}`, {
      method: 'PUT',
      body: formData,
    });

    return this.handleResponse(response);
  }

  static async deleteMemory(id) {
    const response = await fetch(`${API_BASE_URL}/memories/${id}`, {
      method: 'DELETE',
    });

    return this.handleResponse(response);
  }

  static async getMemoryStats() {
    const response = await fetch(`${API_BASE_URL}/memories/stats/overview`);
    return this.handleResponse(response);
  }

  static async addExtractedFact(memoryId, factText, confidenceScore = 0.8) {
    const response = await fetch(`${API_BASE_URL}/memories/${memoryId}/facts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        factText,
        confidenceScore,
      }),
    });

    return this.handleResponse(response);
  }

  // Test Scores API calls
  static async saveTestScore(scoreData) {
    const response = await fetch(`${API_BASE_URL}/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scoreData),
    });

    return this.handleResponse(response);
  }

  static async getTestScores(params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_BASE_URL}/scores${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url);
    return this.handleResponse(response);
  }

  static async getTestScore(id) {
    const response = await fetch(`${API_BASE_URL}/scores/${id}`);
    return this.handleResponse(response);
  }

  static async getTestStats() {
    const response = await fetch(`${API_BASE_URL}/scores/stats`);
    return this.handleResponse(response);
  }

  // Health check
  static async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return this.handleResponse(response);
    } catch (error) {
      throw new Error('Server is not responding. Please make sure the backend is running.');
    }
  }
}

export default ApiService;