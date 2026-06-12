import axios from 'axios';

const api = axios.create({
  // This tells React: "Use the cloud URL if it exists, otherwise use localhost"
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true
});

export default api;

// Ensure this matches your backend URL/port
const API_URL = 'http://localhost:5000/api/tasks'; 

export const generateEpicBreakdown = async (epicData) => {
  try {
    const response = await axios.post(`${API_URL}/breakdown`, epicData);
    return response.data; // This will contain { message, tasks: [...] }
  } catch (error) {
    console.error("Failed to generate epic breakdown:", error);
    throw error;
  }
};