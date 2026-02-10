// Global data store
let dashboardData = {
    system_account: { balance: 0, email: 'system@value.mw' },
    loans: {
        pending_count: 0,
        pending_amount: 0,
        active_count: 0,
        active_amount: 0,
        rejected_count: 0,
        total_count: 0
    },
    users: {
        total_users: 0,
        active_users: 0,
        borrowers: 0,
        lenders: 0
    }
};
let allLoans = [];
let currentFilter = 'pending';
let currentSort = 'newest';

// Helper function to safely format numbers
const currencyFormatter = new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function formatCurrency(amount) {
    const value = Number(amount || 0);
    return currencyFormatter.format(value);
}


// Helper function to safely get number
function safeNumber(value) {
    if (value === undefined || value === null) {
        return 0;
    }
    return parseFloat(value);
}

// Helper function to check if loan can be approved/rejected
function shouldShowApproveReject(loanStatus) {
    return loanStatus === 'pending' || loanStatus === 'submitted';
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Load dashboard summary data
async function loadDashboardData() {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        // Show loading state on balance
        const balanceElement = document.getElementById('system-balance');
        balanceElement.textContent = 'Loading...';
        balanceElement.classList.add('updating');

        // Load dashboard summary
        const summaryRes = await fetch("http://localhost:3000/api/v1/admin/dashboard/summary", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!summaryRes.ok) {
            if (summaryRes.status === 401) {
                localStorage.removeItem("authToken");
                window.location.href = '/login';
                return;
            }
            throw new Error(`Failed to load dashboard: ${summaryRes.status}`);
        }

        const response = await summaryRes.json();
        console.log('Dashboard API response:', response); // Debug log
        
        if (response.success && response.summary) {
            // Safely update dashboardData with fallbacks
            dashboardData = {
                system_account: response.summary.system_account || dashboardData.system_account,
                loans: response.summary.loans || dashboardData.loans,
                users: response.summary.users || dashboardData.users
            };
            updateDashboardDisplay();
        } else {
            throw new Error(response.error || 'Invalid dashboard data structure');
        }
        
        // Load loans separately for the table
        await loadLoans(token);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification(`Error loading data: ${error.message}`, 'error');
        renderError(error.message);
    } finally {
        // Remove loading state
        const balanceElement = document.getElementById('system-balance');
        balanceElement.classList.remove('updating');
    }
}

// Load loans data
async function loadLoans(token) {
    try {
        const loansRes = await fetch("http://localhost:3000/api/v1/admin/loans?status=all", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (loansRes.ok) {
            const loans = await loansRes.json();
            console.log('Loans API response:', loans); // Debug log
            allLoans = Array.isArray(loans) ? loans : [];
            filterLoans();
        } else {
            throw new Error('Failed to load loans');
        }
    } catch (error) {
        console.error('Error loading loans:', error);
        showNotification(`Error loading loans: ${error.message}`, 'error');
        
        if (allLoans.length === 0) {
            document.getElementById("loans-body").innerHTML = `
                <tr>
                    <td colspan="7" class="error">
                        Error loading loans: ${error.message}<br>
                        <button id="retry-loans-btn" style="margin-top: 10px; padding: 5px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Retry
                        </button>
                    </td>
                </tr>
            `;
            
            // Add event listener to retry button
            setTimeout(() => {
                const retryBtn = document.getElementById('retry-loans-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        const token = localStorage.getItem("authToken");
                        if (token) loadLoans(token);
                    });
                }
            }, 100);
        }
    }
}

// Update dashboard display with current data
function updateDashboardDisplay() {
    try {
        // Update system balance
        const system = dashboardData.system_account || {};
        const balanceElement = document.getElementById('system-balance');
        const emailElement = document.getElementById('system-email');
        
        balanceElement.textContent = formatCurrency(system.balance);
        emailElement.textContent = system.email || 'system@value.mw';
        
        // Update statistics
        const loans = dashboardData.loans || {};
        const users = dashboardData.users || {};
        
        document.getElementById('pending-count').textContent = loans.pending_count || 0;
        document.getElementById('active-count').textContent = loans.active_count || 0;
        document.getElementById('rejected-count').textContent = loans.rejected_count || 0;
        document.getElementById('total-count').textContent = loans.total_count || 0;
        document.getElementById('pending-amount').textContent = formatCurrency(loans.pending_amount);
        document.getElementById('total-users').textContent = users.total_users || 0;
        
        // Check if system has enough funds for pending loans
        const warningElement = document.getElementById('insufficient-warning');
        const systemBalance = safeNumber(system.balance);
        const pendingAmount = safeNumber(loans.pending_amount);
        
        if (systemBalance < pendingAmount) {
            balanceElement.classList.add('insufficient');
            warningElement.style.display = 'block';
        } else {
            balanceElement.classList.remove('insufficient');
            warningElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating dashboard display:', error);
        showNotification(`Error updating display: ${error.message}`, 'error');
    }
}

// Update dashboard after loan approval (immediate UI update)
function updateDashboardAfterApproval(loanId, loanAmount) {
    try {
        // Update dashboard data object immediately
        const amount = safeNumber(loanAmount);
        dashboardData.loans.pending_count = Math.max(0, (dashboardData.loans.pending_count || 0) - 1);
        dashboardData.loans.pending_amount = Math.max(0, (dashboardData.loans.pending_amount || 0) - amount);
        dashboardData.loans.active_count = (dashboardData.loans.active_count || 0) + 1;
        dashboardData.loans.active_amount = (dashboardData.loans.active_amount || 0) + amount;
        
        // Update system balance immediately
        dashboardData.system_account.balance = Math.max(0, (dashboardData.system_account.balance || 0) - amount);
        
        // Update display immediately
        updateDashboardDisplay();
        
        // Update the specific loan in the table
        const loanIndex = allLoans.findIndex(l => l.id === loanId);
        if (loanIndex !== -1) {
            allLoans[loanIndex].status = 'active';
            allLoans[loanIndex].approved_amount = loanAmount;
            filterLoans();
        }
    } catch (error) {
        console.error('Error updating dashboard after approval:', error);
    }
}

// Update dashboard after loan rejection
function updateDashboardAfterRejection(loanId, loanAmount) {
    try {
        // Update dashboard data object
        const amount = safeNumber(loanAmount);
        dashboardData.loans.pending_count = Math.max(0, (dashboardData.loans.pending_count || 0) - 1);
        dashboardData.loans.pending_amount = Math.max(0, (dashboardData.loans.pending_amount || 0) - amount);
        dashboardData.loans.rejected_count = (dashboardData.loans.rejected_count || 0) + 1;
        
        // Update display immediately
        updateDashboardDisplay();
        
        // Update the specific loan in the table
        const loanIndex = allLoans.findIndex(l => l.id === loanId);
        if (loanIndex !== -1) {
            allLoans[loanIndex].status = 'rejected';
            filterLoans();
        }
    } catch (error) {
        console.error('Error updating dashboard after rejection:', error);
    }
}

// Filter and render loans
function filterLoans() {
    try {
        // Get current filter values
        const statusFilter = document.getElementById('statusFilter').value;
        const sortBy = document.getElementById('sortBy').value;
        
        currentFilter = statusFilter;
        currentSort = sortBy;
        
        let filteredLoans = [...allLoans];
        
        // Apply status filter
        if (statusFilter !== 'all') {
            filteredLoans = filteredLoans.filter(loan => loan && loan.status === statusFilter);
        }
        
        // Apply sorting
        filteredLoans.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                case 'oldest':
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                case 'amount_high':
                    return (safeNumber(b.principal_amount || b.approved_amount) - safeNumber(a.principal_amount || a.approved_amount));
                case 'amount_low':
                    return (safeNumber(a.principal_amount || a.approved_amount) - safeNumber(b.principal_amount || b.approved_amount));
                default:
                    return 0;
            }
        });
        
        renderLoans(filteredLoans);
    } catch (error) {
        console.error('Error filtering loans:', error);
        renderError(`Error filtering loans: ${error.message}`);
    }
}

// Reset filters to default
function resetFilters() {
    document.getElementById('statusFilter').value = 'pending';
    document.getElementById('sortBy').value = 'newest';
    filterLoans();
}

// Refresh all data from server
async function refreshAllData() {
    const token = localStorage.getItem("authToken");
    if (!token) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Show loading state
    const refreshBtn = document.getElementById('refreshAllData');
    const originalText = refreshBtn.textContent;
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    
    // Update system balance immediately
    const balanceElement = document.getElementById('system-balance');
    const originalBalance = balanceElement.textContent;
    balanceElement.textContent = 'Updating...';
    balanceElement.classList.add('updating');
    
    try {
        await loadDashboardData();
        showNotification('Dashboard data refreshed successfully!', 'success');
    } catch (error) {
        console.error('Refresh failed:', error);
        showNotification(`Refresh failed: ${error.message}`, 'error');
        balanceElement.textContent = originalBalance;
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = originalText;
        balanceElement.classList.remove('updating');
    }
}

// Render loans to table
function renderLoans(loans) {
    const tableBody = document.getElementById("loans-body");
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (!loans || loans.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No ${currentFilter === 'all' ? '' : currentFilter} loans found
                </td>
            </tr>
        `;
        return;
    }
    
    const systemBalance = safeNumber(dashboardData.system_account?.balance || 0);
    
    loans.forEach(loan => {
        if (!loan) return;
        
        const borrowerName = loan.borrower?.full_name || 
                            `${loan.borrower?.person?.first_name || ''} ${loan.borrower?.person?.last_name || ''}`.trim() || 
                            loan.borrower?.email || 'N/A';
        
        const loanAmount = safeNumber(loan.principal_amount || loan.approved_amount);
        const showApproveReject = shouldShowApproveReject(loan.status);
        const canApprove = systemBalance >= loanAmount && showApproveReject;
        
        const row = document.createElement('tr');
        row.id = `loan-row-${loan.id}`;
        row.innerHTML = `
            <td class="loan-id">#${loan.id || 'N/A'}</td>
            <td class="amount">${formatCurrency(loanAmount)}</td>
            <td>${borrowerName}</td>
            <td>${loan.loan_type || 'standard'}</td>
            <td><span class="status-badge ${loan.status || 'unknown'}">${(loan.status || '').toUpperCase()}</span></td>
            <td>${formatDate(loan.created_at)}</td>
            <td class="actions-cell">
                ${showApproveReject ? `
                    <button class="btn-view view-loan-btn" data-loan-id="${loan.id}">View</button>
                    <button class="btn-approve approve-loan-btn" id="approve-btn-${loan.id}" data-loan-id="${loan.id}" ${!canApprove ? 'disabled' : ''}>
                        ${canApprove ? 'Approve' : 'Insufficient Funds'}
                    </button>
                    <button class="btn-reject reject-loan-btn" id="reject-btn-${loan.id}" data-loan-id="${loan.id}">Reject</button>
                    ${!canApprove ? `<small style="display: block; color: #dc3545; font-size: 11px;">Needs: ${formatCurrency(loanAmount)}</small>` : ''}
                ` : `
                    <button class="btn-view view-loan-btn" data-loan-id="${loan.id}">View Details</button>
                    ${loan.status === 'active' ? `<button class="fund-loan-btn view-payments-btn" data-loan-id="${loan.id}">Payments</button>` : ''}
                `}
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners to dynamically created buttons
    addEventListenersToLoanButtons();
}

// Add event listeners to loan action buttons
function addEventListenersToLoanButtons() {
    // View loan buttons
    document.querySelectorAll('.view-loan-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const loanId = this.getAttribute('data-loan-id');
            viewLoan(loanId);
        });
    });
    
    // Approve loan buttons
    document.querySelectorAll('.approve-loan-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const loanId = this.getAttribute('data-loan-id');
            approveLoan(loanId);
        });
    });
    
    // Reject loan buttons
    document.querySelectorAll('.reject-loan-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const loanId = this.getAttribute('data-loan-id');
            rejectLoan(loanId);
        });
    });
    
    // View payments buttons
    document.querySelectorAll('.view-payments-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const loanId = this.getAttribute('data-loan-id');
            viewPayments(loanId);
        });
    });
}

// Show error in table
function renderError(message) {
    const tableBody = document.getElementById("loans-body");
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="error">
                Error: ${message}<br>
                <button id="retry-error-btn" style="margin-top: 10px; padding: 5px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Retry
                </button>
            </td>
        </tr>
    `;
    
    // Add event listener to retry button
    setTimeout(() => {
        const retryBtn = document.getElementById('retry-error-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', refreshAllData);
        }
    }, 100);
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

// View loan details
function viewLoan(loanId) {
    window.location.href = `/admin/loans/${loanId}`;
}

// View loan payments
function viewPayments(loanId) {
    window.location.href = `/admin/loans/${loanId}/payments`;
}

// Approve loan function
async function approveLoan(loanId) {
    loanId = Number(loanId);
    const token = localStorage.getItem("authToken");
    if (!token) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const loan = allLoans.find(l => l && l.id === loanId);
    if (!loan) {
        showNotification(`Loan #${loanId} not found`, 'error');
        return;
    }
    
    // Check if loan can be approved
    const loanStatus = loan.status;
    if (loanStatus !== 'pending' && loanStatus !== 'submitted') {
        showNotification(`Cannot approve loan #${loanId}. Status is already "${loanStatus}".`, 'error');
        return;
    }
    
    const loanAmount = safeNumber(loan.principal_amount || 0);
    
    if (!confirm(`Are you sure you want to approve loan #${loanId} for ${formatCurrency(loanAmount)}? This will use system funds.`)) {
        return;
    }
    
    // Disable buttons and show processing state
    const approveBtn = document.getElementById(`approve-btn-${loanId}`);
    const rejectBtn = document.getElementById(`reject-btn-${loanId}`);
    const row = document.getElementById(`loan-row-${loanId}`);
    
    if (approveBtn) approveBtn.disabled = true;
    if (rejectBtn) rejectBtn.disabled = true;
    if (row) row.classList.add('status-updating');
    
    const originalApproveText = approveBtn ? approveBtn.textContent : 'Approve';
    if (approveBtn) {
        approveBtn.classList.add('approve-processing');
        approveBtn.textContent = 'Processing...';
    }
    
    try {
        const res = await fetch(`http://localhost:3000/api/v1/admin/loans/${loanId}/approve`, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        
        const response = await res.json();
        
        if (res.ok) {
            // Update UI immediately
            updateDashboardAfterApproval(loanId, loanAmount);
            
            // Show success notification
            showNotification(`Loan #${loanId} approved successfully! System balance updated.`, 'success');
            
            // Refresh from server after a short delay to ensure consistency
            setTimeout(() => {
                refreshAllData();
            }, 1000);
            
        } else {
            // Handle specific error messages
            const errorMsg = response.error || 'Failed to approve loan';
            
            if (errorMsg.includes('already approved') || errorMsg.includes('already active')) {
                // Loan was already approved elsewhere, update local data
                const loanIndex = allLoans.findIndex(l => l && l.id === loanId);
                if (loanIndex !== -1) {
                    allLoans[loanIndex].status = 'active';
                    filterLoans();
                }
                showNotification(`Loan #${loanId} was already approved. Updating display...`, 'info');
            } else if (errorMsg.includes('insufficient funds')) {
                showNotification(`Cannot approve: ${errorMsg}`, 'error');
            } else {
                throw new Error(errorMsg);
            }
        }
    } catch (error) {
        console.error('Loan approval error:', error);
        showNotification(`Error: ${error.message}`, 'error');
        
        // Re-enable buttons on error
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.classList.remove('approve-processing');
            approveBtn.textContent = originalApproveText;
        }
        if (rejectBtn) rejectBtn.disabled = false;
        if (row) row.classList.remove('status-updating');
    }
}

// Reject loan function
async function rejectLoan(loanId) {
    loanId = Number(loanId);
    const token = localStorage.getItem("authToken");
    if (!token) {
        showNotification('Please login first', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to reject loan #${loanId}? This action cannot be undone.`)) {
        return;
    }
    
    // Disable buttons and show processing state
    const approveBtn = document.getElementById(`approve-btn-${loanId}`);
    const rejectBtn = document.getElementById(`reject-btn-${loanId}`);
    const row = document.getElementById(`loan-row-${loanId}`);
    
    if (approveBtn) approveBtn.disabled = true;
    if (rejectBtn) rejectBtn.disabled = true;
    if (row) row.classList.add('status-updating');
    
    const originalRejectText = rejectBtn ? rejectBtn.textContent : 'Reject';
    if (rejectBtn) rejectBtn.textContent = 'Processing...';
    
    try {
        const res = await fetch(`http://localhost:3000/api/v1/admin/loans/${loanId}/reject`, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        
        if (res.ok) {
            const loan = allLoans.find(l => l && l.id === loanId);
            const loanAmount = safeNumber(loan?.principal_amount || 0);
            
            // Update UI immediately
            updateDashboardAfterRejection(loanId, loanAmount);
            
            // Show success notification
            showNotification(`Loan #${loanId} rejected successfully!`, 'success');
            
        } else {
            const error = await res.json();
            throw new Error(error.error || 'Failed to reject loan');
        }
    } catch (error) {
        console.error('Loan rejection error:', error);
        showNotification(`Error: ${error.message}`, 'error');
        
        // Re-enable buttons on error
        if (approveBtn) approveBtn.disabled = false;
        if (rejectBtn) {
            rejectBtn.disabled = false;
            rejectBtn.textContent = originalRejectText;
        }
        if (row) row.classList.remove('status-updating');
    }
}

// Initialize dashboard
function initDashboard() {
    console.log('Initializing dashboard...');
    
    try {
        // Add event listeners to filter buttons
        document.getElementById('applyFilters').addEventListener('click', filterLoans);
        document.getElementById('resetFilters').addEventListener('click', resetFilters);
        document.getElementById('refreshAllData').addEventListener('click', refreshAllData);
        
        // Add event listeners to filter dropdowns for change events
        document.getElementById('statusFilter').addEventListener('change', filterLoans);
        document.getElementById('sortBy').addEventListener('change', filterLoans);
        
        // Load initial data
        loadDashboardData();
        
        // Auto-refresh every 60 seconds
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('Auto-refreshing dashboard...');
                const token = localStorage.getItem("authToken");
                if (token) loadDashboardData();
            }
        }, 60000);
        
        // Add visibility change listener
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab became visible, refreshing data...');
                refreshAllData();
            }
        });
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification(`Initialization error: ${error.message}`, 'error');
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    // DOM already loaded
    initDashboard();
}