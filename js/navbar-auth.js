import { API_BASE, authHeaders } from '../js/config.js';

document.addEventListener("DOMContentLoaded", async () => {
  const authArea = document.getElementById("authArea");
  if (!authArea) return;

  if (!Auth.isLoggedIn()) return;

  try {
    const res = await Auth.authFetch(`${API_BASE}/me`);
    if (!res.ok) throw new Error("Not authenticated");

    const user = await res.json();

    authArea.innerHTML = `
      <div class="user-menu dropdown">
        <span class="nav-link dropdown-toggle">
          Hi, ${user.first_name || user.email}
        </span>
        <div class="dropdown-menu">
          <a href="wallet-dashboard.html">My Wallet</a>
          <a href="peer-to-peer.html">Peer to Peer</a>

          ${Auth.isAdmin() ? `
            <a href="admin/dashboard.html"
               style="font-weight:600;color:#c62828">
              Admin Dashboard
            </a>
          ` : ""}

          <a href="#" id="logoutBtn">Logout</a>
        </div>
      </div>
    `;

    document
      .getElementById("logoutBtn")
      .addEventListener("click", (e) => {
        e.preventDefault();
        Auth.logout();
      });

  } catch (err) {
    console.warn("Navbar auth failed:", err.message);
  }
});