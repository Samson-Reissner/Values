/* wallet.js
   Core wallet logic ONLY
*/

class ValueWallet {
  constructor() {
    this.balance = 0;
    this.transactions = [];
    this.walletId = null;
  }

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

      const meRes = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!meRes.ok) throw new Error("Session expired");
      const user = await meRes.json();

      const walletRes = await fetch(`${API_BASE}/wallet`, {
  method: "GET",
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
    return this.logTx("deposit", amount);
  }

  sendMoney(amount, recipient) {
    if (this.balance < amount) throw new Error("Insufficient funds");
    this.balance -= amount;
    return this.logTx("send", amount, { recipient });
  }

  withdrawMoney(amount) {
    if (this.balance < amount) throw new Error("Insufficient funds");
    this.balance -= amount;
    return this.logTx("withdrawal", amount);
  }

  payBill({ category, provider, reference, amount }) {
    if (this.balance < amount) {
      throw new Error("Insufficient wallet balance");
    }

    this.balance -= amount;

    return this.logTx("bill_payment", amount, {
      category,
      provider,
      reference
    });
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
        const amt = parseFloat(prompt("Amount (MWK)"));
        if (amt > 0) this.addMoney(amt);
      });

    document.getElementById("sendMoneyBtn")
      ?.addEventListener("click", () => {
        const id = prompt("Recipient Wallet ID");
        const amt = parseFloat(prompt("Amount"));
        if (id && amt > 0) this.sendMoney(amt, id);
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
   INIT
--------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  window.valueWallet = new ValueWallet();
  window.valueWallet.initialize();
});
