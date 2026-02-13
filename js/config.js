// config.js
export const API_BASE = "http://localhost:3000/api/v1"; // Change this when deploying

export function authHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` })
  };
}

// Helper function for making API calls
export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultOptions = {
    headers: authHeaders(),
    credentials: 'include'
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  return response;
}