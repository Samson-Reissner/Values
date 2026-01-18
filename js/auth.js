/* js/auth.js
   Centralized authentication helper
*/

const Auth = (() => {
  const TOKEN_KEY = "authToken";
  const USER_ID_KEY = "userId";
  const USER_EMAIL_KEY = "userEmail";
  const USER_ROLES_KEY = "userRoles";

  /* =========================
     SAVE AUTH
  ========================= */
  function saveAuth({ token, user }) {
    if (!token || !user?.id) {
      console.error("Invalid auth payload");
      return;
    }

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_ID_KEY, user.id);
    localStorage.setItem(USER_EMAIL_KEY, user.email || "");
    localStorage.setItem(USER_ROLES_KEY, JSON.stringify(user.roles || []));
  }

  /* =========================
     GETTERS
  ========================= */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUserId() {
    return localStorage.getItem(USER_ID_KEY);
  }

  function getUserRoles() {
    try {
      return JSON.parse(localStorage.getItem(USER_ROLES_KEY)) || [];
    } catch {
      return [];
    }
  }

  function isLoggedIn() {
    return !!getToken() && !!getUserId();
  }

  function isAdmin() {
    return getUserRoles().includes("ADMIN");
  }

  /* =========================
     AUTH GUARD
  ========================= */
  function requireAuth(redirect = "auth-landing.html") {
    if (!isLoggedIn()) {
      alert("Please login to continue.");
      window.location.href = redirect;
      throw new Error("AUTH_REQUIRED");
    }

    return {
      token: getToken(),
      userId: getUserId()
    };
  }

  /* =========================
     AUTH FETCH WRAPPER
  ========================= */
  async function authFetch(url, options = {}) {
    const token = getToken();

    if (!token) {
      logout();
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      "Authorization": `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      logout();
      throw new Error("Session expired");
    }

    return response;
  }

  /* =========================
     LOGOUT
  ========================= */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(USER_ROLES_KEY);

    window.location.href = "auth-landing.html";
  }

  /* =========================
     PUBLIC API
  ========================= */
  return {
    saveAuth,
    getToken,
    getUserId,
    getUserRoles,
    isLoggedIn,
    isAdmin,
    requireAuth,
    authFetch,
    logout
  };
})();
