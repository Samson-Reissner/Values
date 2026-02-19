/* wallet.js
   Core wallet logic ONLY
   Proper ES Module version
*/

import { API_BASE } from './config.js';
import { Auth } from './auth.js';

class ValueWallet {
  constructor() {
    this.balance = 0;
    this.transactions = [];
    this.walletId = null;
    this.selectedMethod = null;

    this.kycStatus = null;
    this.kycPercentage = 0;
    this.canTransfer = false;

    this.auth = null;
  }

  /* -------------------------
     INIT
  --------------------------*/
  initialize() {
    // 🔐 Enforce authentication
    this.auth = Auth.requireAuth("login.html");

    this.bindUIActions();
    this.loadWalletData();
    this.loadTransactions();
  }

  /* -------------------------
     API / DATA
  --------------------------*/
  async loadWalletData() {
    try {
      const res = await Auth.authFetch(`${API_BASE}/wallet`);

      if (!res.ok) throw new Error("Wallet not found");

      const wallet = await res.json();
      this.processWalletData(wallet);

    } catch (e) {
      console.warn("Wallet load failed, using demo data", e);
      this.useDemoData();
    }
  }

  processWalletData(data) {
    this.balance = data.balance || 0;
    this.walletId = data.wallet_id || `VAL-${Date.now()}`;

    this.kycStatus = data.kyc_status || "incomplete";
    this.kycPercentage = data.kyc_percentage || 30;
    this.canTransfer = data.can_transfer || false;

    const walletIdEl = document.getElementById("walletId");
    const balanceEl = document.getElementById("walletBalance");

    if (walletIdEl) walletIdEl.textContent = this.walletId;
    if (balanceEl) balanceEl.textContent = this.format(this.balance);

    this.updateKYCUI();
    this.save();
  }

  /* -------------------------
     KYC UI UPDATES
  --------------------------*/
  updateKYCUI() {
    const transactionButtons = [
      'addMoneyBtn',
      'sendMoneyBtn',
      'withdrawMoneyBtn',
      'payBillsBtn'
    ];

    transactionButtons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (!button) return;

      if (!this.canTransfer) {
        this.disableButtonForKYC(button);
      } else {
        this.enableButton(button, buttonId);
      }
    });

    if (!this.canTransfer) {
      this.showKYCWarning();
    }
  }

  showKYCModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content">
        <h3><i class="fas fa-shield-alt"></i> Verification Required</h3>
        <p>You need to complete KYC verification to use this feature.</p>

        <div class="kyc-status">
          <div>Current Status: <strong>${this.kycStatus.toUpperCase()}</strong></div>
          <div>Completion: <strong>${this.kycPercentage}%</strong></div>
          <p>You need at least 70% KYC completion to transfer money.</p>
        </div>

        <div class="modal-actions">
          <button class="close-modal">Cancel</button>
          <a href="kyc.html">Complete KYC</a>
        </div>
      </div>
    `;

    modal.onclick = (e) => {
      if (e.target === modal || e.target.classList.contains('close-modal')) {
        modal.remove();
      }
    };

    document.body.appendChild(modal);
  }

  disableButtonForKYC(button) {
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
    button.title = `KYC ${this.kycStatus} (${this.kycPercentage}%)`;

    if (!button.innerHTML.includes('fa-lock')) {
      button.innerHTML = `<i class="fas fa-lock"></i> ${button.innerHTML}`;
    }

    button.onclick = (e) => {
      e.preventDefault();
      this.showKYCModal();
    };
  }

  enableButton(button, buttonId) {
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
    button.title = '';

    button.innerHTML = button.innerHTML.replace('<i class="fas fa-lock"></i> ', '');

    this.restoreButtonHandler(button, buttonId);
  }

  showKYCWarning() {
    const existing = document.querySelector('.kyc-warning-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'kyc-warning-banner';
    banner.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>Complete KYC verification to unlock wallet features</span>
      <a href="kyc.html">Verify Now</a>
    `;

    const container = document.querySelector('.wallet-container');
    if (container) {
      container.insertBefore(banner, container.firstChild);
    }
  }

  restoreButtonHandler(button, buttonId) {
    switch (buttonId) {
      case 'addMoneyBtn':
        button.onclick = () => {
          if (window.depositManager) {
            window.depositManager.showDepositModal();
          }
        };
        break;

      case 'sendMoneyBtn':
        button.onclick = () => {
          if (window.sendMoneyManager) {
            window.sendMoneyManager.showSendMoneyModal();
          }
        };
        break;

      case 'withdrawMoneyBtn':
        button.onclick = () => {
          window.location.href = "withdraw-money.html";
        };
        break;

      case 'payBillsBtn':
        button.onclick = () => {
          if (window.initPayBillsModal) {
            window.initPayBillsModal();
          }
        };
        break;
    }
  }

  /* -------------------------
     TRANSACTIONS
  --------------------------*/
  loadTransactions() {
    this.updateUI();
  }

  updateUI() {
    const balanceEl = document.getElementById("walletBalance");
    if (balanceEl) balanceEl.textContent = this.format(this.balance);

    const list = document.getElementById("transactionList");
    if (!list) return;

    list.innerHTML = "";

    this.transactions.slice(0, 5).forEach(tx => {
      const div = document.createElement("div");
      div.className = "transaction-item";
      div.innerHTML = `
        <div>${tx.type}</div>
        <div>MWK ${this.format(tx.amount)}</div>
      `;
      list.appendChild(div);
    });
  }

  logTx(type, amount) {
    const tx = {
      id: `TX-${Date.now()}`,
      type,
      amount,
      date: new Date().toISOString()
    };

    this.transactions.unshift(tx);
    this.updateUI();
    this.save();
  }

  /* -------------------------
     HELPERS
  --------------------------*/
  format(amount) {
    return Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2
    });
  }

  save() {
    localStorage.setItem("userWallet", JSON.stringify({
      balance: this.balance,
      transactions: this.transactions,
      walletId: this.walletId
    }));
  }

  useDemoData() {
    this.balance = 12500;
    this.walletId = "VAL-DEMO";
    this.kycStatus = "incomplete";
    this.kycPercentage = 30;
    this.canTransfer = false;

    this.updateUI();
    this.updateKYCUI();
    this.save();
  }

  /* -------------------------
     UI BINDINGS
  --------------------------*/
  bindUIActions() {
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
  const wallet = new ValueWallet();
  wallet.initialize();
});
