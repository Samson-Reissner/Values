// js/lender-dashboard.js

// Base URL for API
const API_BASE_URL = 'http://localhost:3000/api/v1';

// Get auth token
const token = localStorage.getItem("authToken");
if (!token) {
    window.location.href = "login.html";
    throw new Error("No authentication token found");
}

// Global data variables
let userData = {};
let dashboardData = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    fetchDashboardData();
    fetchUserData();
    
    // Check URL parameters for tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const notificationType = urlParams.get('notification');
    
    if (tabParam) {
        setTimeout(() => switchTab(tabParam), 500);
    }
    
    if (notificationType === 'new_interest') {
        setTimeout(() => switchTab('borrower-interest'), 1000);
    }
});

// Fetch dashboard data
function fetchDashboardData() {
    showLoadingAll();
    
    fetch(`${API_BASE_URL}/lenders_dashboard`, {
        headers: { 
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    })
    .then(data => {
        console.log('Dashboard data received:', data);
        dashboardData = data;
        updateStats(data);
        renderActiveOffers();
        renderBorrowerInterests();
        renderAllOffers();
        renderFundedLoans();
        renderCompletedLoans();
    })
    .catch(error => {
        console.error('Error fetching dashboard data:', error);
        showError('active-bids-content', 'Error loading dashboard. Please try again.');
    });
}

// Fetch user data
function fetchUserData() {
    fetch(`${API_BASE_URL}/me`, {
        headers: { 
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }
        return res.json();
    })
    .then(data => {
        userData = data;
        if (data && data.name) {
            document.querySelector('.dashboard-title h1').textContent = `${data.name}'s Lender Dashboard`;
        }
    })
    .catch(error => console.error('Error fetching user data:', error));
}

// Update statistics
function updateStats(investments) {
    if (!investments || !Array.isArray(investments)) return;

    const totalOffers = investments.length;
    const activeOffers = investments.filter(o => o.status === 'open' || o.status === 'requested').length;
    
    const totalInvested = investments
        .filter(o => o.status === 'funded' || o.status === 'accepted')
        .reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
    
    const totalReturns = investments
        .filter(o => o.status === 'completed' || o.status === 'repaid')
        .reduce((sum, o) => {
            const amount = parseFloat(o.amount) || 0;
            const interest = parseFloat(o.interest_rate) || 0;
            const tenure = parseFloat(o.tenure_months) || 1;
            return sum + amount * (interest / 100) * (tenure / 12);
        }, 0);
    
    const pendingRequests = investments.filter(o => o.status === 'requested' || o.status === 'under_review').length;
    
    document.getElementById('totalOffers').textContent = totalOffers;
    document.getElementById('activeOffers').textContent = activeOffers;
    document.getElementById('totalInvested').textContent = `MWK ${totalInvested.toLocaleString()}`;
    document.getElementById('totalReturns').textContent = `MWK ${Math.round(totalReturns).toLocaleString()}`;
    
    updateBadgeCount(pendingRequests);
}

function updateBadgeCount(count) {
    const badge = document.getElementById('interestBadge');
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
    if (count > 0) badge.textContent = count;
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    const tabIndex = ['active-bids', 'borrower-interest', 'funded-loans', 'completed-loans', 'all-offers'].indexOf(tabName);
    if (tabIndex !== -1 && tabButtons[tabIndex]) tabButtons[tabIndex].classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    switch(tabName) {
        case 'active-bids': renderActiveOffers(); break;
        case 'borrower-interest': renderBorrowerInterests(); break;
        case 'funded-loans': renderFundedLoans(); break;
        case 'completed-loans': renderCompletedLoans(); break;
        case 'all-offers': renderAllOffers(); break;
    }

    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.pushState({}, '', url);
}

// Show loading placeholders
function showLoadingAll() {
    ['active-bids-content','borrower-interest-content','funded-loans-content','completed-loans-content','all-offers-content'].forEach(id => {
        const container = document.getElementById(id);
        if (container) container.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i><p>Loading...</p></div>`;
    });
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

// Create offer card HTML
function createOfferCard(offer) {
    const status = offer.status || 'open';
    const statusClass = `status-${status.toLowerCase().replace(/ /g, '-')}`;
    const offerId = offer.id;
    
    // Determine status display text
    let statusText = status.toUpperCase();
    if (status === 'under_review') statusText = 'UNDER REVIEW';
    if (status === 'requested') statusText = 'BORROWER REQUESTED';
    
    return `
        <div class="bid-card" data-offer-id="${offerId}">
            <div class="bid-card-header">
                <div>
                    <h3>Offer #${offerId}</h3>
                    <div class="bid-id">Amount: MWK ${parseFloat(offer.amount).toLocaleString()}</div>
                </div>
                <div class="bid-status ${statusClass}">${statusText}</div>
            </div>
            <div class="bid-details">
                <div class="bid-detail">
                    <strong>Interest Rate</strong>
                    <span>${offer.interest_rate}%</span>
                </div>
                <div class="bid-detail">
                    <strong>Tenure</strong>
                    <span>${offer.tenure_months} months</span>
                </div>
                <div class="bid-detail">
                    <strong>Status</strong>
                    <span>${offer.status}</span>
                </div>
                <div class="bid-detail">
                    <strong>Borrower</strong>
                    <span>${offer.borrower_name || 'No borrower yet'}</span>
                </div>
                ${offer.action_required ? `
                <div class="bid-detail">
                    <strong>Action Required</strong>
                    <span style="color: #ff9e00; font-weight: bold;">${offer.action_required}</span>
                </div>
                ` : ''}
            </div>
            <div class="bid-actions">
                <button class="btn-action btn-view" onclick="viewOfferDetails('${offerId}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                ${status === 'open' ? `
                    <button class="btn-action btn-secondary" onclick="editOffer('${offerId}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action btn-secondary" onclick="withdrawOffer('${offerId}')">
                        <i class="fas fa-times"></i> Withdraw
                    </button>
                ` : ''}
                ${status === 'under_review' || status === 'requested' ? `
                    <a href="?tab=borrower-interest" class="btn-action btn-accept">
                        <i class="fas fa-handshake"></i> Review Request
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

// Render active offers
function renderActiveOffers() {
    const container = document.getElementById('active-bids-content');
    const activeOffers = dashboardData.filter(o => 
        o.status === 'open' || o.status === 'requested' || o.status === 'under_review'
    );
    
    if (activeOffers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-handshake"></i>
                <h3>No Active Offers</h3>
                <p>Create your first lending offer to get started.</p>
                <button class="btn-action btn-view" onclick="createNewOffer()" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> Create Offer
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activeOffers.map(offer => createOfferCard(offer)).join('');
}

// Render borrower interests
function renderBorrowerInterests() {
    const container = document.getElementById('borrower-interest-content');
    
    // Filter investments that have borrower requests (status = 'requested' or 'under_review')
    const borrowerInterests = dashboardData.filter(o => 
        o.status === 'requested' || o.status === 'under_review'
    );
    
    if (borrowerInterests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No New Interest</h3>
                <p>When borrowers show interest in your offers, they'll appear here.</p>
                <button class="btn-action btn-view" onclick="refreshDashboard()" style="margin-top: 20px;">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = borrowerInterests.map(offer => {
        const needsReview = offer.status === 'under_review';
        const actionText = offer.action_required || 'Review Request';
        
        return `
            <div class="bid-card borrower-interest" data-offer-id="${offer.id}">
                <div class="bid-card-header">
                    <div>
                        <h3>Borrower Interest Request</h3>
                        <div class="bid-id">Offer ID: ${offer.id}</div>
                    </div>
                </div>
                <div class="bid-details">
                    <div class="bid-detail">
                        <strong>Borrower Name</strong>
                        <span>${offer.borrower_name || 'Unknown Borrower'}</span>
                    </div>
                    <div class="bid-detail">
                        <strong>Loan Amount</strong>
                        <span>MWK ${parseFloat(offer.amount).toLocaleString()}</span>
                    </div>
                    <div class="bid-detail">
                        <strong>Interest Rate</strong>
                        <span>${offer.interest_rate}%</span>
                    </div>
                    <div class="bid-detail">
                        <strong>Tenure</strong>
                        <span>${offer.tenure_months} months</span>
                    </div>
                    <div class="bid-detail">
                        <strong>Contact</strong>
                        <span>${offer.masked_contact || 'N/A'}</span>
                    </div>
                </div>
                <div class="bid-actions">
                    ${needsReview ? `
                        <button class="btn-action btn-accept" onclick="acceptBorrowerRequest('${offer.id}')">
                            <i class="fas fa-check"></i> Accept Request
                        </button>
                        <button class="btn-action btn-decline" onclick="declineBorrowerRequest('${offer.id}')">
                            <i class="fas fa-times"></i> Decline
                        </button>
                    ` : ''}
                    <button class="btn-action btn-view" onclick="viewOfferDetails('${offer.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn-action btn-secondary" onclick="contactBorrower('${offer.id}')">
                        <i class="fas fa-phone"></i> Contact Borrower
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Render all offers
function renderAllOffers() {
    const container = document.getElementById('all-offers-content');
    
    if (dashboardData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-list"></i>
                <h3>No Offers Found</h3>
                <p>Create your first lending offer to get started.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = dashboardData.map(offer => createOfferCard(offer)).join('');
}

// Render funded loans
function renderFundedLoans() {
    const container = document.getElementById('funded-loans-content');
    const fundedLoans = dashboardData.filter(o => 
        o.status === 'funded' || o.status === 'accepted'
    );
    
    if (fundedLoans.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h3>No Funded Loans Yet</h3>
                <p>When you accept borrower requests and fund loans, they'll appear here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = fundedLoans.map(loan => `
        <div class="bid-card">
            <div class="bid-card-header">
                <div>
                    <h3>Funded Loan #${loan.id}</h3>
                    <div class="bid-id">Amount: MWK ${parseFloat(loan.amount).toLocaleString()}</div>
                </div>
                <div class="bid-status status-funded">FUNDED</div>
            </div>
            <div class="bid-details">
                <div class="bid-detail">
                    <strong>Borrower</strong>
                    <span>${loan.borrower_name || 'Unknown'}</span>
                </div>
                <div class="bid-detail">
                    <strong>Interest Rate</strong>
                    <span>${loan.interest_rate}%</span>
                </div>
                <div class="bid-detail">
                    <strong>Expected Monthly Return</strong>
                    <span>MWK ${calculateMonthlyReturn(loan.amount, loan.interest_rate, loan.tenure_months).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Render completed loans
function renderCompletedLoans() {
    const container = document.getElementById('completed-loans-content');
    const completedLoans = dashboardData.filter(o => 
        o.status === 'completed' || o.status === 'repaid'
    );
    
    if (completedLoans.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>No Completed Loans Yet</h3>
                <p>Completed loans will appear here once they're fully repaid.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = completedLoans.map(loan => `
        <div class="bid-card">
            <div class="bid-card-header">
                <div>
                    <h3>Completed Loan #${loan.id}</h3>
                    <div class="bid-id">Amount: MWK ${parseFloat(loan.amount).toLocaleString()}</div>
                </div>
                <div class="bid-status status-closed">COMPLETED</div>
            </div>
            <div class="bid-details">
                <div class="bid-detail">
                    <strong>Borrower</strong>
                    <span>${loan.borrower_name || 'Unknown'}</span>
                </div>
                <div class="bid-detail">
                    <strong>Total Interest Earned</strong>
                    <span>MWK ${calculateTotalInterest(loan.amount, loan.interest_rate, loan.tenure_months).toLocaleString()}</span>
                </div>
                <div class="bid-detail">
                    <strong>ROI</strong>
                    <span>${calculateROI(loan.amount, loan.interest_rate, loan.tenure_months)}%</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return 'Invalid date';
    }
}

function formatTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return formatDate(timestamp);
    }
}

function calculateMonthlyReturn(principal, annualRate, months) {
    const monthlyRate = (annualRate || 0) / 100 / 12;
    const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / 
                   (Math.pow(1 + monthlyRate, months) - 1);
    return isNaN(payment) ? 0 : Math.round(payment);
}

function calculateTotalInterest(principal, annualRate, months) {
    const monthlyPayment = calculateMonthlyReturn(principal, annualRate, months);
    return Math.round((monthlyPayment * months) - principal);
}

function calculateROI(principal, annualRate, months) {
    const totalInterest = calculateTotalInterest(principal, annualRate, months);
    const annualROI = (totalInterest / principal) * (12 / months) * 100;
    return annualROI.toFixed(1);
}

// Action functions
function refreshDashboard() {
    document.getElementById('borrower-interest-content').innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner"></i>
            <p>Refreshing...</p>
        </div>
    `;
    fetchDashboardData();
}

function acceptBorrowerRequest(offerId) {
    if (confirm('Accept this borrower\'s request and transfer funds?')) {
        fetch(`${API_BASE_URL}/p2p_investments/${offerId}/accept`, {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data.success) {
                alert(`✅ ${data.message}`);
                fetchDashboardData(); // Refresh dashboard
            } else {
                alert(`❌ ${data.error || 'Failed to accept request'}`);
            }
        })
        .catch(error => {
            console.error('Error accepting request:', error);
            alert('Error accepting request. Please try again.');
        });
    }
}

// Update declineBorrowerRequest function
function declineBorrowerRequest(offerId) {
    if (confirm('Decline this borrower\'s request?')) {
        fetch(`${API_BASE_URL}/p2p_investments/${offerId}/decline`, {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data.success) {
                alert(`✅ ${data.message}`);
                fetchDashboardData(); // Refresh dashboard
            } else {
                alert(`❌ ${data.error || 'Failed to decline request'}`);
            }
        })
        .catch(error => {
            console.error('Error declining request:', error);
            alert('Error declining request. Please try again.');
        });
    }
}


function viewOfferDetails(offerId) {
    alert(`Viewing offer details for ID: ${offerId}`);
    // window.location.href = `offer-details.html?id=${offerId}`;
}

function editOffer(offerId) {
    alert(`Editing offer ID: ${offerId}`);
    // window.location.href = `edit-offer.html?id=${offerId}`;
}

function withdrawOffer(offerId) {
    if (confirm('Are you sure you want to withdraw this offer?')) {
        fetch(`${API_BASE_URL}/p2p_investments/${offerId}/withdraw`, {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data.success) {
                alert(`✅ ${data.message}`);
                fetchDashboardData(); // Refresh dashboard
            } else {
                alert(`❌ ${data.error || 'Failed to withdraw offer'}`);
            }
        })
        .catch(error => {
            console.error('Error withdrawing offer:', error);
            alert('Error withdrawing offer. Please try again.');
        });
    }
}

function contactBorrower(offerId) {
    const offer = dashboardData.find(o => o.id === offerId);
    if (offer && offer.masked_contact && offer.masked_contact !== 'N/A') {
        alert(`Contact borrower for offer ${offerId}: ${offer.masked_contact}`);
    } else {
        alert('Contact information not available for this borrower.');
    }
}

function createNewOffer() {
    window.location.href = 'lender_form.html';
}

// Check for new requests periodically
function checkForNewRequests() {
    setTimeout(() => {
        fetchDashboardData();
        checkForNewRequests();
    }, 30000); // Check every 30 seconds
}

// Start checking for new requests
checkForNewRequests();