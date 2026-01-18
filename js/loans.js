/* loans.js
   Handles ACTIVE LOANS retrieval for wallet dashboard
*/

class LoanService {
  constructor() {
    this.loans = [];
  }

  async loadActiveLoans() {
    console.log("🔄 Loading active loans...");

    const token = localStorage.getItem("authToken");
    if (!token) {
      console.warn("No auth token, skipping loan fetch");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/v1/loans", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Loan API error: ${res.status}`);
      }

      const loans = await res.json();
      console.table(loans);

      this.loans = loans;
      this.updateUI();

    } catch (err) {
      console.error("❌ Failed to load active loans", err);
    }
  }

  updateUI() {
    const total = this.loans.reduce(
      (sum, loan) => sum + Number(loan.total_repayable || 0),
      0
    );

    const el = document.getElementById("activeLoans");
    if (!el) {
      console.warn("activeLoans element not found");
      return;
    }

    el.textContent = `MWK ${this.format(total)}`;
  }

  format(amount) {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2
    });
  }
}

/* -------------------------
   BOOTSTRAP
--------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  window.loanService = new LoanService();
  window.loanService.loadActiveLoans();
});
