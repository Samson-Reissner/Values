// js/borrow-options.js
// Borrow Options page logic - Separated from HTML
// Uses global config from config.global.js (window.API_BASE)

// Check authentication
const token = localStorage.getItem("token") || localStorage.getItem("authToken");

if (!token) {
    window.location.href = "login.html";
}

// Extract investment ID from URL
function getInvestmentIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const investmentId = urlParams.get('investment_id') || urlParams.get('id');
    console.log("Extracted investment ID from URL:", investmentId);
    return investmentId;
}

// Fetch specific investment based on URL parameter
async function fetchSpecificInvestment(investmentId) {
    try {
        console.log("Fetching specific investment with ID:", investmentId);
        
        // Using window.API_BASE from config.global.js
        const response = await fetch(`${window.API_BASE}/p2p_investments/${investmentId}`, {
            headers: { 
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        
        console.log("Specific investment response status:", response.status);
        
        if (response.status === 404 || response.status === 400) {
            console.log("Specific investment not found, will fetch all");
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const investment = await response.json();
        console.log("Specific investment data:", investment);
        return investment;
        
    } catch (error) {
        console.error("Error fetching specific investment:", error);
        return null;
    }
}

// Fetch all investments
async function fetchAllInvestments() {
    try {
        console.log("Fetching all investments...");
        // Using window.API_BASE from config.global.js
        const response = await fetch(`${window.API_BASE}/borrower/dashboard`, {
            headers: { 
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        
        console.log("All investments response status:", response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const investments = await response.json();
        console.log("All investments data:", investments);
        return investments;
        
    } catch (error) {
        console.error("Error fetching all investments:", error);
        return [];
    }
}

// Load investment data
async function loadInvestment() {
    const container = document.getElementById("investment-details");
    const otherInvestmentsContainer = document.getElementById("other-investments");
    const otherInvestmentsList = document.getElementById("other-investments-list");
    
    const investmentId = getInvestmentIdFromURL();
    
    try {
        let mainInvestment = null;
        let allInvestments = [];
        
        if (investmentId) {
            mainInvestment = await fetchSpecificInvestment(investmentId);
        }
        
        allInvestments = await fetchAllInvestments();
        
        if (!allInvestments || allInvestments.length === 0) {
            container.innerHTML = 
                '<div class="no-data">No investment offers available at the moment.</div>';
            return;
        }
        
        if (!mainInvestment && allInvestments.length > 0) {
            if (investmentId) {
                mainInvestment = allInvestments.find(inv => inv.id == investmentId);
            }
            
            if (!mainInvestment) {
                mainInvestment = allInvestments[0];
            }
        }
        
        if (mainInvestment) {
            displayInvestment(mainInvestment);
        } else {
            container.innerHTML = 
                '<div class="no-data">Investment not found. Please select another.</div>';
        }
        
        if (allInvestments.length > 1) {
            const otherInvestments = allInvestments.filter(inv => 
                mainInvestment ? inv.id != mainInvestment.id : true
            );
            
            if (otherInvestments.length > 0) {
                displayOtherInvestments(otherInvestments);
                otherInvestmentsContainer.style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error("Error loading investment:", error);
        container.innerHTML = 
            `<div class="error">Error loading investment details: ${error.message}</div>`;
    }
}

function displayInvestment(investment) {
    const container = document.getElementById("investment-details");
    
    const formattedAmount = new Intl.NumberFormat('en-MW', {
        style: 'currency',
        currency: 'MWK'
    }).format(investment.amount);
    
    container.innerHTML = `
        <div class="investment-card">
            <div class="investment-header">
                <h3>Investment Offer #${investment.id}</h3>
                <span class="investment-id">ID: ${investment.id}</span>
            </div>
            
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Lender</div>
                    <div class="detail-value">${investment.lender_name || 'Not specified'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Available Amount</div>
                    <div class="detail-value currency">${formattedAmount}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Interest Rate</div>
                    <div class="detail-value">${investment.interest_rate}% ${investment.interest_period || 'per annum'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Tenure</div>
                    <div class="detail-value">${investment.tenure_months} months</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${investment.status || 'Available'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Minimum Amount</div>
                    <div class="detail-value">MWK ${investment.min_amount || '1000'}</div>
                </div>
            </div>
            
            ${investment.masked_contact ? `
            <div class="contact-info">
                <div class="contact-label">Lender Contact</div>
                <div class="contact-value">${investment.masked_contact}</div>
            </div>
            ` : ''}
            
            <div class="borrow-options">
                <h4>Borrow from this offer</h4>
                <div class="input-group">
                    <input type="number" 
                           id="custom-amount" 
                           placeholder="Enter amount (MWK)" 
                           min="${investment.min_amount || 1000}" 
                           max="${investment.amount}"
                           step="1000"
                           value="${investment.amount}">
                </div>
                <div class="btn-group">
                    <button class="btn-full" onclick="borrowFullAmount(${investment.id}, ${investment.amount})">
                        Borrow Full Amount
                    </button>
                    <button class="btn-custom" onclick="borrowCustomAmount(${investment.id})">
                        Borrow Custom Amount
                    </button>
                </div>
            </div>
            
            <div class="info-note">
                <i>Note: The lender will review your request before funds are released.</i>
            </div>
        </div>
    `;
    
    container.className = '';
}

function displayOtherInvestments(investments) {
    const container = document.getElementById("other-investments-list");
    container.innerHTML = '';
    
    investments.forEach(investment => {
        const formattedAmount = new Intl.NumberFormat('en-MW', {
            style: 'currency',
            currency: 'MWK'
        }).format(investment.amount);
        
        const item = document.createElement('div');
        item.className = 'other-investment-item';
        item.innerHTML = `
            <div class="other-investment-details">
                <h4>Investment #${investment.id} - ${investment.lender_name || 'Anonymous Lender'}</h4>
                <p>Amount: ${formattedAmount} | Interest: ${investment.interest_rate}% | Tenure: ${investment.tenure_months} months</p>
            </div>
            <a href="borrow_options.html?investment_id=${investment.id}" class="view-other-btn">
                View & Borrow
            </a>
        `;
        
        container.appendChild(item);
    });
}

// Borrow functions
async function sendBorrowRequest(investmentId, amountParam) {
    try {
        let payload;
        
        if (amountParam === "full") {
            payload = { amount: "full" };
        } else {
            payload = { amount: amountParam };
        }
        
        console.log("Sending borrow request for investment", investmentId, "with payload:", payload);
        
        // Using window.API_BASE from config.global.js
        const response = await fetch(`${window.API_BASE}/p2p_investments/${investmentId}/borrow`, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        console.log("Response:", data);
        
        if (!response.ok) {
            throw new Error(data.error || data.message || "Borrow request failed");
        }
        
        alert("Borrow request submitted successfully!");
        window.location.href = "dashboard.html";
        
    } catch (error) {
        console.error("Borrow request error:", error);
        alert(`Error: ${error.message}\n\nPlease check if the lender is still available and try again.`);
    }
}

function borrowFullAmount(investmentId, amount) {
    if (confirm(`Are you sure you want to borrow the full amount of MWK ${amount.toLocaleString()}?`)) {
        sendBorrowRequest(investmentId, "full");
    }
}

function borrowCustomAmount(investmentId) {
    const input = document.getElementById('custom-amount');
    const amount = parseFloat(input.value);
    
    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        input.focus();
        return;
    }
    
    const maxAmount = parseFloat(input.max);
    if (amount > maxAmount) {
        alert(`Amount cannot exceed available MWK ${maxAmount.toLocaleString()}`);
        return;
    }
    
    const minAmount = parseFloat(input.min) || 1000;
    if (amount < minAmount) {
        alert(`Minimum borrow amount is MWK ${minAmount.toLocaleString()}`);
        return;
    }
    
    if (confirm(`Are you sure you want to borrow MWK ${amount.toLocaleString()}?`)) {
        sendBorrowRequest(investmentId, amount);
    }
}

// Load investment on page load
document.addEventListener('DOMContentLoaded', function() {
    loadInvestment();
});

// Allow pressing Enter in custom amount field
document.addEventListener('keypress', function(event) {
    if (event.target.id === 'custom-amount' && event.key === 'Enter') {
        const investmentId = getInvestmentIdFromURL();
        if (investmentId) {
            borrowCustomAmount(investmentId);
        }
    }
});

// Make functions available globally for onclick handlers
window.borrowFullAmount = borrowFullAmount;
window.borrowCustomAmount = borrowCustomAmount;