/* deposit-money.js
   Enhanced professional deposit UI & flow
   Version: 2.0
*/

import { API_BASE, authHeaders } from './config.js';

class DepositManager {
    constructor() {
        this.selectedMethod = null;
        this.selectedAmount = 0;
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.createNotificationContainer();
    }

    cacheElements() {
        // Modal elements
        this.methodModal = document.getElementById('depositMethodModal');
        this.amountModal = document.getElementById('depositAmountModal');
        
        // Buttons
        this.addMoneyBtn = document.getElementById('addMoneyBtn');
        this.confirmDepositBtn = document.getElementById('confirmDepositBtn');
        this.closeDepositMethod = document.getElementById('closeDepositMethod');
        this.cancelDepositBtn = document.getElementById('cancelDepositBtn');
        
        // Inputs and displays
        this.depositTitle = document.getElementById('depositTitle');
        this.depositAmountInput = document.getElementById('depositAmount');
        this.methodNameDisplay = document.getElementById('methodName');
    }

    bindEvents() {
        // Entry point
        if (this.addMoneyBtn) {
            this.addMoneyBtn.addEventListener('click', () => this.openMethodModal());
        }

        // Method selection
        document.addEventListener('click', (e) => this.handleMethodSelection(e));

        // Confirm deposit
        if (this.confirmDepositBtn) {
            this.confirmDepositBtn.addEventListener('click', () => this.confirmDeposit());
        }

        // Cancel/close buttons
        if (this.closeDepositMethod) {
            this.closeDepositMethod.addEventListener('click', () => this.closeMethodModal());
        }

        if (this.cancelDepositBtn) {
            this.cancelDepositBtn.addEventListener('click', () => this.closeAmountModal());
        }

        // Keyboard support
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Click outside to close
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // Input validation
        if (this.depositAmountInput) {
            this.depositAmountInput.addEventListener('input', () => this.validateAmountInput());
        }
    }

    /* ========== MODAL CONTROLS ========== */
    
    openMethodModal() {
        this.selectedMethod = null;
        this.showModal(this.methodModal);
        this.highlightMethodButtons(false);
    }

    closeMethodModal() {
        this.hideModal(this.methodModal);
    }

    openAmountModal() {
        if (!this.selectedMethod) return;
        
        const methodNames = {
            'mpamba': 'TNM Mpamba',
            'airtel': 'Airtel Money'
        };
        
        const displayName = methodNames[this.selectedMethod] || this.selectedMethod.toUpperCase();
        
        if (this.depositTitle) {
            this.depositTitle.textContent = `Deposit via ${displayName}`;
        }
        
        if (this.methodNameDisplay) {
            this.methodNameDisplay.textContent = displayName;
        }
        
        this.showModal(this.amountModal);
        
        // Focus on amount input with delay for animation
        setTimeout(() => {
            if (this.depositAmountInput) {
                this.depositAmountInput.focus();
                this.depositAmountInput.select();
            }
        }, 300);
    }

    closeAmountModal() {
        this.hideModal(this.amountModal);
        if (this.depositAmountInput) {
            this.depositAmountInput.value = '';
        }
    }

    showModal(modal) {
        if (!modal) return;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    hideModal(modal) {
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }

    /* ========== METHOD SELECTION ========== */
    
    handleMethodSelection(e) {
        const methodBtn = e.target.closest('[data-method]');
        if (!methodBtn) return;

        this.selectedMethod = methodBtn.dataset.method;
        this.highlightMethodButtons(methodBtn);
        
        // Add visual feedback
        methodBtn.classList.add('selected');
        setTimeout(() => {
            methodBtn.classList.remove('selected');
        }, 200);
        
        this.closeMethodModal();
        setTimeout(() => this.openAmountModal(), 150); // Delay for smooth transition
    }

    highlightMethodButtons(selectedButton) {
        document.querySelectorAll('[data-method]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
    }

    /* ========== DEPOSIT PROCESSING ========== */
    
    validateAmountInput() {
        if (!this.depositAmountInput) return true;
        
        const amount = parseFloat(this.depositAmountInput.value);
        const minAmount = parseFloat(this.depositAmountInput.min) || 100;
        
        if (isNaN(amount)) {
            this.showInputError('Please enter a valid number');
            return false;
        }
        
        if (amount < minAmount) {
            this.showInputError(`Minimum amount is MWK ${minAmount.toLocaleString()}`);
            return false;
        }
        
        this.clearInputError();
        return true;
    }

    confirmDeposit() {
        if (this.isProcessing) return;
        
        if (!this.validateAmountInput()) {
            return;
        }
        
        const amount = parseFloat(this.depositAmountInput.value);
        const minAmount = parseFloat(this.depositAmountInput.min) || 100;
        
        // Final validation
        if (!amount || amount < minAmount) {
            this.showNotification(`Please enter at least MWK ${minAmount.toLocaleString()}`, 'error');
            return;
        }
        
        this.selectedAmount = amount;
        this.isProcessing = true;
        
        // Disable button during processing
        this.confirmDepositBtn.disabled = true;
        this.confirmDepositBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        this.processDeposit();
    }
    
    async initiateDeposit() {
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${API_BASE}/deposits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({
                amount: this.selectedAmount,
                method: this.selectedMethod
            })
        });

        let data = null;

        try {
            data = await response.json();
        } catch (e) {
            throw new Error(
                `Server error (${response.status}). Invalid JSON response.`
            );
        }

        if (!response.ok) {
            throw new Error(data?.error || `Request failed (${response.status})`);
        }

        if (!data.success) {
            throw new Error(data.error || 'Deposit initiation failed');
        }

        return data;
    }

    async processDeposit() {
        try {
            this.showNotification('Sending payment request to your phone...', 'info');

            // Close amount modal
            this.closeAmountModal();

            // 🔥 REAL API CALL
            const result = await this.initiateDeposit();

            this.showNotification(
                `Payment request sent successfully.<br>
                 Please approve the MWK ${this.selectedAmount.toLocaleString()} payment on your phone.`,
                'success'
            );

            // Dispatch event for dashboards / listeners
            this.dispatchDepositEvent('deposit:initiated', {
                reference: result.reference,
                amount: this.selectedAmount,
                method: this.selectedMethod
            });

        } catch (error) {
            console.error('Deposit error:', error);

            this.showNotification(
                error.message || 'Deposit failed. Please try again.',
                'error'
            );

            this.dispatchDepositEvent('deposit:error', {
                error: error.message,
                amount: this.selectedAmount,
                method: this.selectedMethod
            });

        } finally {
            this.resetProcessingState();
        }
    }

    resetProcessingState() {
        this.isProcessing = false;
        
        if (this.confirmDepositBtn) {
            this.confirmDepositBtn.disabled = false;
            this.confirmDepositBtn.innerHTML = 'Proceed to Payment';
        }
        
        if (this.depositAmountInput) {
            this.depositAmountInput.value = '';
        }
    }

    /* ========== UI HELPERS ========== */
    
    showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        if (!this.notificationContainer) {
            this.createNotificationContainer();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        this.notificationContainer.appendChild(notification);
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds for success/info, 8 seconds for errors
        const duration = type === 'error' ? 8000 : 5000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle',
            'warning': 'fa-exclamation-triangle'
        };
        return icons[type] || 'fa-info-circle';
    }

    createNotificationContainer() {
        // Check if container already exists
        if (document.getElementById('notification-container')) {
            this.notificationContainer = document.getElementById('notification-container');
            return;
        }
        
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        `;
        
        // Add CSS styles for notifications
        this.addNotificationStyles();
        
        document.body.appendChild(container);
        this.notificationContainer = container;
    }

    addNotificationStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                padding: 15px 20px;
                border-radius: 10px;
                color: white;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                animation: slideInRight 0.3s ease, fadeOut 0.3s ease 4.7s;
                position: relative;
                overflow: hidden;
            }
            
            .notification::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
            }
            
            .notification-success {
                background: #2ecc71;
            }
            
            .notification-success::before {
                background: #27ae60;
            }
            
            .notification-error {
                background: #e74c3c;
            }
            
            .notification-error::before {
                background: #c0392b;
            }
            
            .notification-info {
                background: #3498db;
            }
            
            .notification-info::before {
                background: #2980b9;
            }
            
            .notification-warning {
                background: #f39c12;
            }
            
            .notification-warning::before {
                background: #d35400;
            }
            
            .notification i {
                font-size: 1.2em;
            }
            
            .notification span {
                flex: 1;
                font-size: 0.95em;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                opacity: 0.7;
                padding: 0;
                margin-left: 10px;
                transition: opacity 0.2s;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        
        document.head.appendChild(styles);
    }
    showInputError(message) {
        if (!this.depositAmountInput) return;
        
        // Remove existing error
        this.clearInputError();
        
        // Add error class
        this.depositAmountInput.classList.add('error');
        
        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'input-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #e74c3c;
            font-size: 0.85em;
            margin-top: 5px;
        `;
        
        this.depositAmountInput.parentNode.appendChild(errorElement);
    }
    clearInputError() {
        if (!this.depositAmountInput) return;
        
        this.depositAmountInput.classList.remove('error');
        
        // Remove any existing error messages
        const existingError = this.depositAmountInput.parentNode.querySelector('.input-error');
        if (existingError) {
            existingError.remove();
        }
    }

    /* ========== EVENT HANDLERS ========== */
    handleKeyboard(e) {
        // Escape key closes modals
        if (e.key === 'Escape') {
            if (!this.methodModal.classList.contains('hidden')) {
                this.closeMethodModal();
            } else if (!this.amountModal.classList.contains('hidden')) {
                this.closeAmountModal();
            }
        }
        
        // Enter key in amount input
        if (e.key === 'Enter' && 
            this.depositAmountInput && 
            document.activeElement === this.depositAmountInput &&
            !this.amountModal.classList.contains('hidden')) {
            this.confirmDeposit();
        }
    }

    handleOutsideClick(e) {
        // Close method modal when clicking outside
        if (this.methodModal && 
            !this.methodModal.classList.contains('hidden') && 
            e.target === this.methodModal) {
            this.closeMethodModal();
        }
        // Close amount modal when clicking outside
        if (this.amountModal && 
            !this.amountModal.classList.contains('hidden') && 
            e.target === this.amountModal) {
            this.closeAmountModal();
        }
    }

    /* ========== UTILITY METHODS ========== */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    dispatchDepositEvent(eventName, detail) {
        const event = new CustomEvent(eventName, {
            detail: detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /* ========== PUBLIC METHODS ========== */
    showDepositModal() {
        this.openMethodModal();
    }
    // Optional: Public method to trigger deposit from other components
    triggerDeposit(method, amount) {
        this.selectedMethod = method;
        this.selectedAmount = amount;
        this.processDeposit();
    }
    // Optional: Reset everything
    reset() {
        this.selectedMethod = null;
        this.selectedAmount = 0;
        this.isProcessing = false;
        this.closeMethodModal();
        this.closeAmountModal();
        this.resetProcessingState();
    }
}
export { DepositManager };