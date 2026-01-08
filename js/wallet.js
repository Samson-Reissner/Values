/* wallet.js
   Core wallet logic ONLY
*/

class ValueWallet {
  constructor() {
    this.balance = 0;
    this.transactions = [];
    this.walletId = null;
    this.selectedMethod = null;
  }

  /* -------------------------
     INIT
  --------------------------*/
  initialize() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.href = "/login.html";
      return;
    }

    this.loadWalletData();
    this.loadTransactions();
    this.bindUIActions();
  }

  /* -------------------------
     API / DATA
  --------------------------*/
  async loadWalletData() {
    try {
      const API_BASE = "http://localhost:3000/api/v1";
      const token = localStorage.getItem("authToken");

      const walletRes = await fetch(`${API_BASE}/wallet`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!walletRes.ok) throw new Error("Wallet not found");

      const wallet = await walletRes.json();
      this.processWalletData(wallet);

    } catch (e) {
      console.warn("Using demo wallet");
      this.useDemoData();
    }
  }

  processWalletData(data) {
    this.balance = data.balance || 0;
    this.walletId = data.wallet_id || `VAL-${Date.now()}`;

    document.getElementById("walletId").textContent = this.walletId;
    document.getElementById("walletBalance").textContent =
      this.format(this.balance);

    this.save();
  }

  /* -------------------------
     WALLET ACTIONS
  --------------------------*/
  addMoney(amount) {
    this.balance += amount;
    return this.logTx("deposit", amount, {
      method: this.selectedMethod
    });
  }

  sendMoney(amount, recipient) {
    if (this.balance < amount) {
      alert("Insufficient funds");
      return;
    }
    this.balance -= amount;
    return this.logTx("send", amount, { recipient });
  }

  withdrawMoney(amount) {
    if (this.balance < amount) {
      alert("Insufficient funds");
      return;
    }
    this.balance -= amount;
    return this.logTx("withdrawal", amount);
  }

  /* -------------------------
     TRANSACTIONS
  --------------------------*/
  logTx(type, amount, meta = {}) {
    const tx = {
      id: `TX-${Date.now()}`,
      type,
      amount,
      meta,
      date: new Date().toISOString()
    };

    this.transactions.unshift(tx);
    this.updateUI();
    this.save();
    return tx;
  }

  loadTransactions() {
    this.updateUI();
  }

  updateUI() {
    document.getElementById("walletBalance").textContent =
      this.format(this.balance);

    const list = document.getElementById("transactionList");
    if (!list) return;

    list.innerHTML = "";
    this.transactions.slice(0, 5).forEach(tx => {
      const div = document.createElement("div");
      div.className = "transaction-item";
      div.innerHTML = `
        <div>${tx.type.replace("_", " ")}</div>
        <div>MWK ${this.format(tx.amount)}</div>
      `;
      list.appendChild(div);
    });
  }

  /* -------------------------
     DEPOSIT FLOW (PRODUCTION UX)
  --------------------------*/
  showDepositMethods() {
    document
      .getElementById("depositMethodModal")
      .classList.remove("hidden");

    document.querySelectorAll("[data-method]").forEach(btn => {
      btn.onclick = () => {
        this.selectedMethod = btn.dataset.method;
        document
          .getElementById("depositMethodModal")
          .classList.add("hidden");
        this.showAmountModal();
      };
    });

    document.getElementById("closeDepositMethod").onclick = () => {
      document
        .getElementById("depositMethodModal")
        .classList.add("hidden");
    };
  }

  showAmountModal() {
    document.getElementById("depositTitle").textContent =
      `Deposit via ${this.selectedMethod.toUpperCase()}`;

    document
      .getElementById("depositAmountModal")
      .classList.remove("hidden");

    document.getElementById("confirmDepositBtn").onclick = () => {
      const amount = parseFloat(
        document.getElementById("depositAmount").value
      );

      if (!amount || amount <= 0) {
        alert("Enter a valid amount");
        return;
      }

      document
        .getElementById("depositAmountModal")
        .classList.add("hidden");

      alert(
        "A payment prompt has been sent to your phone.\n" +
        "Please enter your mobile money PIN to confirm."
      );

      // Simulate telco confirmation (DEMO ONLY)
      setTimeout(() => {
        this.addMoney(amount);
        alert("Deposit successful");
      }, 3000);
    };

    document.getElementById("cancelDepositBtn").onclick = () => {
      document
        .getElementById("depositAmountModal")
        .classList.add("hidden");
    };
  }

  /* -------------------------
     HELPERS
  --------------------------*/
  format(amount) {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2
    });
  }

  save() {
    localStorage.setItem(
      "userWallet",
      JSON.stringify({
        balance: this.balance,
        transactions: this.transactions,
        walletId: this.walletId
      })
    );
  }

  useDemoData() {
    this.balance = 12500;
    this.walletId = "VAL-DEMO";
    this.updateUI();
    this.save();
  }

  /* -------------------------
     UI BINDINGS
  --------------------------*/
  bindUIActions() {
    document.getElementById("addMoneyBtn")
      ?.addEventListener("click", () => {
        this.showDepositMethods();
      });

    document.getElementById("withdrawMoneyBtn")
      ?.addEventListener("click", () => {
        window.location.href = "withdraw-money.html";
      });

    document.getElementById("viewTransactionsBtn")
      ?.addEventListener("click", () => {
        window.location.href = "transaction-history.html";
      });
  }
}

/* -------------------------
   START APP
--------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  window.valueWallet = new ValueWallet();
  window.valueWallet.initialize();
});
