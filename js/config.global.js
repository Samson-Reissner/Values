// js/config.global.js
// Global configuration for regular/inline scripts
// Load this with regular <script> tags BEFORE other scripts

window.API_BASE = "http://localhost:3000/api/v1";

window.authHeaders = function() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` })
  };
};

window.apiCall = async function(endpoint, options = {}) {
  const url = `${window.API_BASE}${endpoint}`;
  const defaultOptions = {
    headers: window.authHeaders(),
    credentials: 'include'
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  return response;
};