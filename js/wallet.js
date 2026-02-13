/* wallet.js
   Core wallet logic ONLY
   Auth handled via auth.js
*/

import { API_BASE, authHeaders } from './js/config.js';

class ValueWallet {
  constructor() {
    this.balance = 0;
    this.transactions = [];
    this.walletId = null;
    this.selectedMethod = null;
      
    this.kycStatus = null;
    this.kycPercentage = 0;
    this.canTransfer = false;
    // Auth context
    this.auth = null;
  }
  
  /* -------------------------
     INIT
  --------------------------*/
  initialize() {
    // 🔐 Enforce authentication
    this.auth = Auth.requireAuth("login.html");

    this.loadWalletData();
    this.loadTransactions();
    this.bindUIActions();
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

    // NEW: Store KYC data
    this.kycStatus = data.kyc_status || "incomplete";
    this.kycPercentage = data.kyc_percentage || 30;
    this.canTransfer = data.can_transfer || false;

    document.getElementById("walletId").textContent = this.walletId;
    document.getElementById("walletBalance").textContent =
      this.format(this.balance);

    // NEW: Update UI based on KYC status
    this.updateKYCUI();
    
    this.save();
  }
    /* -------------------------
     KYC UI UPDATES
  --------------------------*/
  updateKYCUI() {
    // Get all transaction buttons
    const transactionButtons = [
      'addMoneyBtn',
      'sendMoneyBtn', 
      'withdrawMoneyBtn',
      'payBillsBtn'
    ];
    
    transactionButtons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (button) {
        if (!this.canTransfer) {
          // Disable button and add KYC warning
          this.disableButtonForKYC(button);
        } else {
          // Enable button
          this.enableButton(button, buttonId);
        }
      }
    });
    
    // Show KYC warning if needed
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
          <div class="status-row">
            <span class="label">Current Status:</span>
            <span class="value ${this.kycStatus}">${this.kycStatus.toUpperCase()}</span>
          </div>
          <div class="status-row">
            <span class="label">Completion:</span>
            <span class="value">${this.kycPercentage}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${this.kycPercentage}%"></div>
          </div>
          <p class="info">You need at least 70% KYC completion to transfer money.</p>
        </div>
        
        <div class="modal-actions">
          <button class="btn-secondary close-modal">Cancel</button>
          <!-- UPDATE: Link to your existing kyc.html -->
          <a href="kyc.html" class="btn-primary">Complete KYC</a>
        </div>
      </div>
    `;
    
    // Close modal on click
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
    button.title = `KYC ${this.kycStatus} (${this.kycPercentage}%) - Complete verification`;
    
    // Add lock icon
    const originalText = button.innerHTML;
    button.innerHTML = `<i class="fas fa-lock"></i> ${originalText}`;
    
    // Replace click handler
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
    
    // Remove lock icon if present
    button.innerHTML = button.innerHTML.replace('<i class="fas fa-lock"></i> ', '');
    
    // Restore original click handlers
    this.restoreButtonHandler(button, buttonId);
  }
    // Add this method
  showKYCWarning() {
    // Remove existing warning if any
    const existingWarning = document.querySelector('.kyc-warning-banner');
    if (existingWarning) existingWarning.remove();
    
    // Create warning banner
    const banner = document.createElement('div');
    banner.className = 'kyc-warning-banner';
    
    let message = '';
    if (this.kycStatus === 'partial') {
      message = `Complete KYC verification (${this.kycPercentage}%) to unlock wallet features`;
    } else if (this.kycStatus === 'incomplete') {
      message = 'Start KYC verification to use wallet features';
    } else {
      message = 'Complete KYC verification to use all wallet features';
    }
    
    banner.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>${message}</span>
      <a href="kyc.html" class="btn-small">Verify Now</a>
    `;
    
    // Insert at top of wallet container
    const walletContainer = document.querySelector('.wallet-container');
    if (walletContainer) {
      walletContainer.insertBefore(banner, walletContainer.firstChild);
    }
  }

  // Add this method
  restoreButtonHandler(button, buttonId) {
    // Restore original click handlers based on button ID
    switch(buttonId) {
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
          // Your bill payment logic here
          alert('Bill payment would open here');
        };
        break;
    }
  }
  /* -------------------------
     WALLET ACTIONS
  --------------------------*/
  async payBill({ category, provider_code, reference, amount, allow_loan = false }) {
    const res = await Auth.authFetch(`${API_BASE}/payments`, {
      method: "POST",
      body: JSON.stringify({
        payment: {
          category,
          provider_code,
          reference,
          amount,
          allow_loan
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Payment failed");
    }

    this.balance = data.balance;
    this.updateUI();
    this.save();

    return data;
  }

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
     this.updateKYCUI();
  }

  /* -------------------------
     UI BINDINGS
  --------------------------*/
  bindUIActions() {
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