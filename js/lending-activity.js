// js/lending-activity.js
// Enhanced Lending Activity Notifications for Peer-to-Peer Lending Dashboard

(function() {
    'use strict';

    // API Base URL - same as lender-dashboard.js
    const API_BASE_URL = 'http://localhost:3000/api/v1';
    
    // Store original functions
    const originalRenderBorrowerInterests = window.renderBorrowerInterests;
    
    /**
     * Get auth token from localStorage
     */
    function getToken() {
        return localStorage.getItem("authToken");
    }
    
    /**
     * Check if user is authenticated
     */
    function isAuthenticated() {
        const token = getToken();
        if (!token) {
            console.log('No authentication token found');
            return false;
        }
        return true;
    }
    
    /**
     * Fetch dashboard data directly from API
     * This is a standalone fetch function that doesn't depend on lender-dashboard.js
     */
    window.fetchLendingActivityData = function() {
        return new Promise((resolve, reject) => {
            const token = getToken();
            
            if (!token) {
                console.error('No authentication token found');
                // Show login required state
                showLoginRequired();
                reject('No authentication token');
                return;
            }
            
            // Show loading state
            showLoading();
            
            fetch(`${API_BASE_URL}/lenders_dashboard`, {
                headers: { 
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            })
            .then(res => {
                if (res.status === 401) {
                    // Unauthorized - redirect to login
                    window.location.href = "login.html";
                    throw new Error('Unauthorized');
                }
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log('Lending activity data received:', data);
                // Store in global variable for compatibility
                window.dashboardData = data;
                // Render the data
                window.renderEnhancedBorrowerInterests();
                resolve(data);
            })
            .catch(error => {
                console.error('Error fetching lending activity data:', error);
                showError('Failed to load lending activity. Please try again.');
                reject(error);
            });
        });
    };
    
    /**
     * Show loading state in the notifications list
     */
    function showLoading() {
        const container = document.getElementById('borrowerInterestsList');
        if (!container) return;
        
        container.style.display = 'block';
        container.innerHTML = `
            <div class="loading" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary);"></i>
                <p style="margin-top: 20px; font-size: 1.1rem; color: var(--gray);">Loading borrower requests...</p>
            </div>
        `;
        
        // Hide empty state
        const noNotificationsEl = document.getElementById('noNotifications');
        if (noNotificationsEl) noNotificationsEl.style.display = 'none';
    }
    
    /**
     * Show error state
     */
    function showError(message) {
        const container = document.getElementById('borrowerInterestsList');
        if (!container) return;
        
        container.style.display = 'block';
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #dc3545; margin-bottom: 20px;"></i>
                <p style="font-size: 1.1rem; color: var(--dark); margin-bottom: 10px;">Unable to load data</p>
                <p style="color: var(--gray); margin-bottom: 25px;">${message}</p>
                <button onclick="window.fetchLendingActivityData()" 
                        style="background: var(--primary); color: white; border: none; padding: 12px 28px; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }
    
    /**
     * Show login required state
     */
    function showLoginRequired() {
        const container = document.getElementById('borrowerInterestsList');
        if (!container) return;
        
        container.style.display = 'block';
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-lock" style="font-size: 3rem; color: var(--gray); margin-bottom: 20px;"></i>
                <p style="font-size: 1.2rem; color: var(--dark); font-weight: 600; margin-bottom: 10px;">Sign in to view lending activity</p>
                <p style="color: var(--gray); margin-bottom: 25px;">Please sign in or create an account to start lending.</p>
                <a href="auth-landing.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; text-decoration: none;">
                    <i class="fas fa-sign-in-alt"></i> Sign In
                </a>
            </div>
        `;
        
        // Hide empty state
        const noNotificationsEl = document.getElementById('noNotifications');
        if (noNotificationsEl) noNotificationsEl.style.display = 'none';
    }
    
    /**
     * Format timestamp to relative time (e.g., "2 hours ago")
     */
    function getTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';
        
        try {
            const now = new Date();
            const date = new Date(timestamp);
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) {
                return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            } else if (diffDays < 7) {
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            } else {
                return formatDate(timestamp);
            }
        } catch (e) {
            return 'Recently';
        }
    }
    
    /**
     * Format date to readable string
     */
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
    
    /**
     * Get initials from full name
     */
    function getInitials(name) {
        if (!name || name === 'Unknown Borrower') return '??';
        return name.split(' ')
            .map(n => n.charAt(0))
            .filter(c => c)
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }
    
    /**
     * Get consistent gradient color based on name hash
     */
    function getAvatarGradient(name) {
        const gradients = [
            'linear-gradient(135deg, #4361ee, #3a56d4)', // Primary
            'linear-gradient(135deg, #7209b7, #560bad)', // Secondary
            'linear-gradient(135deg, #f72585, #b5179e)', // Accent
            'linear-gradient(135deg, #06d6a0, #05b58b)', // Success
            'linear-gradient(135deg, #ff9e00, #ff8c00)', // Warning
            'linear-gradient(135deg, #4895ef, #4361ee)', // Blue
            'linear-gradient(135deg, #9c89b8, #7b6c9c)', // Purple
            'linear-gradient(135deg, #2ec4b6, #20a4a4)'  // Teal
        ];
        
        if (!name) return gradients[0];
        
        // Simple hash to pick consistent gradient
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return gradients[hash % gradients.length];
    }
    
    /**
     * Generate consistent credit score based on name (650-780 range)
     */
    function getCreditScore(borrowerName, offer) {
        // If credit score is provided by API, use it
        if (offer && offer.credit_score) {
            return offer.credit_score.toString();
        }
        
        // Otherwise generate deterministic score from name
        if (!borrowerName) return '700';
        const hash = borrowerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (650 + (hash % 130)).toString();
    }
    
    /**
     * Calculate monthly repayment amount
     */
    function calculateMonthlyReturn(principal, annualRate, months) {
        const p = parseFloat(principal) || 0;
        const r = parseFloat(annualRate) || 0;
        const n = parseFloat(months) || 1;
        
        if (p === 0 || r === 0) return '0';
        
        const monthlyRate = r / 100 / 12;
        const payment = p * monthlyRate * Math.pow(1 + monthlyRate, n) / 
                       (Math.pow(1 + monthlyRate, n) - 1);
        
        return isNaN(payment) ? '0' : Math.round(payment).toLocaleString();
    }
    
    /**
     * Determine loan type based on purpose
     */
    function getLoanType(purpose) {
        if (!purpose) return 'Personal Loan';
        
        const purposeLower = purpose.toLowerCase();
        if (purposeLower.includes('business') || purposeLower.includes('trade')) {
            return 'Business Loan';
        } else if (purposeLower.includes('agri') || purposeLower.includes('farm')) {
            return 'Agri Loan';
        } else if (purposeLower.includes('civil') || purposeLower.includes('servant')) {
            return 'Civil Servant Loan';
        } else if (purposeLower.includes('defence') || purposeLower.includes('force')) {
            return 'Defence Forces Loan';
        } else if (purposeLower.includes('collateral')) {
            return 'Collateral Backed Loan';
        } else {
            return 'Personal Loan';
        }
    }
    
    /**
     * Determine risk level and colors based on credit score
     */
    function getRiskLevel(creditScore) {
        const score = parseInt(creditScore) || 700;
        
        if (score >= 750) {
            return {
                level: 'Low Risk',
                bgColor: '#e8f5e9',
                textColor: '#2e7d32',
                icon: 'fa-shield-alt'
            };
        } else if (score >= 680) {
            return {
                level: 'Medium Risk',
                bgColor: '#fff3e0',
                textColor: '#bf5b17',
                icon: 'fa-chart-line'
            };
        } else {
            return {
                level: 'High Risk',
                bgColor: '#ffebee',
                textColor: '#c62828',
                icon: 'fa-exclamation-triangle'
            };
        }
    }
    
    /**
     * Get masked contact number
     */
    function getMaskedContact(contact) {
        if (!contact) return '+265 *** *** ***';
        
        // If already masked, return as is
        if (contact.includes('*')) return contact;
        
        // Mask the middle digits
        const contactStr = contact.replace(/\s/g, '');
        if (contactStr.length >= 9) {
            return contactStr.substring(0, 4) + ' *** *** ' + contactStr.slice(-3);
        }
        return contact;
    }
    
    /**
     * Update statistics in the lending activity card
     */
    function updateActivityStats(investments) {
        if (!investments || !Array.isArray(investments)) {
            // Reset stats to zero
            const pendingCountEl = document.getElementById('pendingCount');
            const activeCountEl = document.getElementById('activeCount');
            const totalLentEl = document.getElementById('totalLent');
            const avgReturnEl = document.getElementById('avgReturn');
            const pendingBadgeEl = document.getElementById('pendingReviewBadge');
            
            if (pendingCountEl) pendingCountEl.textContent = '0';
            if (activeCountEl) activeCountEl.textContent = '0';
            if (totalLentEl) totalLentEl.textContent = 'MWK 0';
            if (avgReturnEl) avgReturnEl.textContent = '0%';
            
            if (pendingBadgeEl) {
                pendingBadgeEl.innerHTML = '0 pending reviews';
                pendingBadgeEl.style.background = 'rgba(108, 117, 125, 0.1)';
                pendingBadgeEl.style.color = 'var(--gray)';
            }
            return;
        }
        
        const pendingReviews = investments.filter(o => 
            o.status === 'requested' || o.status === 'under_review'
        ).length;
        
        const activeLoans = investments.filter(o => 
            o.status === 'funded' || o.status === 'accepted'
        ).length;
        
        const totalLentAmount = investments
            .filter(o => o.status === 'funded' || o.status === 'accepted')
            .reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
        
        // Calculate average interest rate from active/open offers
        const offersWithRate = investments.filter(o => o.interest_rate);
        const avgRate = offersWithRate.length > 0 
            ? offersWithRate.reduce((sum, o) => sum + (parseFloat(o.interest_rate) || 0), 0) / offersWithRate.length
            : 0;
        
        // Update DOM elements
        const pendingCountEl = document.getElementById('pendingCount');
        const activeCountEl = document.getElementById('activeCount');
        const totalLentEl = document.getElementById('totalLent');
        const avgReturnEl = document.getElementById('avgReturn');
        const pendingBadgeEl = document.getElementById('pendingReviewBadge');
        
        if (pendingCountEl) pendingCountEl.textContent = pendingReviews;
        if (activeCountEl) activeCountEl.textContent = activeLoans;
        if (totalLentEl) totalLentEl.textContent = `MWK ${totalLentAmount.toLocaleString()}`;
        if (avgReturnEl) avgReturnEl.textContent = `${avgRate.toFixed(1)}%`;
        
        if (pendingBadgeEl) {
            pendingBadgeEl.innerHTML = `${pendingReviews} pending ${pendingReviews === 1 ? 'review' : 'reviews'}`;
            pendingBadgeEl.style.background = pendingReviews > 0 
                ? 'rgba(67, 97, 238, 0.1)' 
                : 'rgba(108, 117, 125, 0.1)';
            pendingBadgeEl.style.color = pendingReviews > 0 
                ? 'var(--primary)' 
                : 'var(--gray)';
        }
    }
    
    /**
     * Enhanced render function for borrower interests
     */
    window.renderEnhancedBorrowerInterests = function() {
        const container = document.getElementById('borrowerInterestsList');
        if (!container) return;
        
        // Get dashboard data from global variable
        const dashboardData = window.dashboardData || [];
        
        // Filter investments that have borrower requests
        const borrowerInterests = dashboardData.filter(o => 
            o.status === 'requested' || o.status === 'under_review'
        );
        
        // Update stats
        updateActivityStats(dashboardData);
        
        // Handle empty state
        const noNotificationsEl = document.getElementById('noNotifications');
        if (borrowerInterests.length === 0) {
            container.style.display = 'none';
            if (noNotificationsEl) {
                noNotificationsEl.style.display = 'block';
                // Update empty state message based on authentication
                if (!isAuthenticated()) {
                    noNotificationsEl.innerHTML = `
                        <i class="fas fa-hand-holding-usd" style="font-size: 4rem; color: var(--light-gray); margin-bottom: 20px;"></i>
                        <p style="font-size: 1.3rem; color: var(--dark); font-weight: 600; margin-bottom: 10px;">Sign in to start lending</p>
                        <p class="subtext" style="color: var(--gray); max-width: 400px; margin: 0 auto 25px;">Please sign in to view your lending activity and borrower requests.</p>
                        <a href="auth-landing.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; text-decoration: none;">
                            <i class="fas fa-sign-in-alt"></i> Sign In
                        </a>
                    `;
                }
            }
            return;
        }
        
        // Show notifications, hide empty state
        container.style.display = 'block';
        if (noNotificationsEl) noNotificationsEl.style.display = 'none';
        
        // Generate HTML for each borrower interest
        container.innerHTML = borrowerInterests.map(offer => {
            const offerId = offer.id || offer.offer_id || 'N/A';
            const borrowerName = offer.borrower_name || 'Unknown Borrower';
            const initials = getInitials(borrowerName);
            const avatarGradient = getAvatarGradient(borrowerName);
            const creditScore = getCreditScore(borrowerName, offer);
            const riskLevel = getRiskLevel(creditScore);
            const timeAgo = getTimeAgo(offer.requested_at || offer.updated_at || offer.created_at);
            
            const amount = parseFloat(offer.amount || 0).toLocaleString();
            const interestRate = offer.interest_rate || '0';
            const tenure = offer.tenure_months || '12';
            const monthlyReturn = calculateMonthlyReturn(offer.amount, offer.interest_rate, offer.tenure_months);
            const loanType = getLoanType(offer.purpose);
            const maskedContact = getMaskedContact(offer.masked_contact);
            
            // Check if needs review (under_review status)
            const needsReview = offer.status === 'under_review';
            
            return `
                <div class="notification-item unread" data-bid-id="${offerId}" 
                     style="border-left-width: 6px; border-left-color: var(--primary); background: linear-gradient(to right, #f0f7ff, white); padding: 25px; border-radius: 18px; display: block; position: relative; margin-bottom: 16px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <!-- Avatar with Initials -->
                        <div style="flex-shrink: 0;">
                            <div style="width: 60px; height: 60px; background: ${avatarGradient}; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.3rem; box-shadow: 0 6px 15px rgba(67, 97, 238, 0.2);">
                                ${initials}
                            </div>
                        </div>
                        
                        <!-- Content -->
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                    <strong style="font-size: 1.2rem; color: var(--dark);">${borrowerName}</strong>
                                    <span style="background: rgba(6, 214, 160, 0.1); color: var(--success); padding: 4px 10px; border-radius: 100px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
                                        <i class="fas fa-check-circle"></i> Verified
                                    </span>
                                    <span style="background: var(--light-gray); color: var(--gray); padding: 4px 10px; border-radius: 100px; font-size: 0.8rem; font-weight: 600;">
                                        Credit Score: ${creditScore}
                                    </span>
                                </div>
                                <span class="notification-time" style="display: flex; align-items: center; gap: 5px; color: var(--gray);">
                                    <i class="far fa-clock"></i> ${timeAgo}
                                </span>
                            </div>
                            
                            <p style="font-size: 1.05rem; color: var(--dark); margin-bottom: 15px;">
                                Interested in your loan offer of <strong>MWK ${amount}</strong> at <strong>${interestRate}% interest</strong> for <strong>${tenure} months</strong>
                            </p>
                            
                            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                                <span style="background: #e3f2fd; color: #0a5e8c; padding: 6px 16px; border-radius: 100px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="fas fa-briefcase"></i> ${loanType}
                                </span>
                                <span style="background: ${riskLevel.bgColor}; color: ${riskLevel.textColor}; padding: 6px 16px; border-radius: 100px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="fas ${riskLevel.icon}"></i> ${riskLevel.level}
                                </span>
                                <span style="background: #fff3e0; color: #bf5b17; padding: 6px 16px; border-radius: 100px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="fas fa-calendar"></i> ${tenure} months
                                </span>
                                ${needsReview ? `
                                <span style="background: #fff3cd; color: #856404; padding: 6px 16px; border-radius: 100px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="fas fa-clock"></i> Action Required
                                </span>
                                ` : ''}
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; padding-top: 15px; border-top: 1px solid var(--light-gray);">
                                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                                    <span style="display: flex; align-items: center; gap: 6px; color: var(--gray); font-size: 0.9rem;">
                                        <i class="fas fa-coins"></i> Monthly: <strong style="color: var(--dark);">MWK ${monthlyReturn}</strong>
                                    </span>
                                    <span style="display: flex; align-items: center; gap: 6px; color: var(--gray); font-size: 0.9rem;">
                                        <i class="fas fa-phone"></i> ${maskedContact}
                                    </span>
                                    ${offer.previous_loans ? `
                                    <span style="display: flex; align-items: center; gap: 6px; color: var(--gray); font-size: 0.9rem;">
                                        <i class="fas fa-history"></i> ${offer.previous_loans} previous loans
                                    </span>
                                    ` : ''}
                                </div>
                                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                    <button onclick="acceptBorrowerRequest('${offerId}')" 
                                            style="background: var(--success); color: white; padding: 12px 28px; border: none; border-radius: 12px; font-weight: 600; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(6, 214, 160, 0.2);"
                                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 18px rgba(6, 214, 160, 0.3)';"
                                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(6, 214, 160, 0.2)';">
                                        <i class="fas fa-check-circle"></i> Accept
                                    </button>
                                    <button onclick="declineBorrowerRequest('${offerId}')" 
                                            style="background: white; color: var(--gray); border: 1.5px solid var(--light-gray); padding: 12px 28px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;"
                                            onmouseover="this.style.borderColor='#dc3545'; this.style.color='#dc3545';"
                                            onmouseout="this.style.borderColor='var(--light-gray)'; this.style.color='var(--gray)';">
                                        <i class="fas fa-times"></i> Decline
                                    </button>
                                    <a href="lender_dashboard.html?tab=borrower-interest&bid=${offerId}" 
                                       style="background: var(--primary); color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(67, 97, 238, 0.2);"
                                       onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 18px rgba(67, 97, 238, 0.3)';"
                                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(67, 97, 238, 0.2)';">
                                        Review <i class="fas fa-arrow-right"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };
    
    /**
     * Override the original renderBorrowerInterests function
     */
    window.renderBorrowerInterests = function() {
        window.renderEnhancedBorrowerInterests();
    };
    
    /**
     * Initialize the lending activity module
     */
    window.initLendingActivity = function() {
        console.log('Lending Activity Module initialized');
        
        // Check if user is authenticated
        if (!isAuthenticated()) {
            showLoginRequired();
            return;
        }
        
        // If dashboardData already exists, render immediately
        if (window.dashboardData) {
            window.renderEnhancedBorrowerInterests();
        } else {
            // Otherwise fetch data
            window.fetchLendingActivityData();
        }
        
        // Override fetchDashboardData if it exists (for compatibility with lender-dashboard.js)
        const originalFetch = window.fetchDashboardData;
        if (originalFetch) {
            window.fetchDashboardData = function() {
                // Call original function
                originalFetch.apply(this, arguments);
                
                // Also update our view when data changes
                setTimeout(() => {
                    window.renderEnhancedBorrowerInterests();
                }, 100);
            };
        }
        
        // Add refresh function
        window.refreshLendingActivity = function() {
            window.fetchLendingActivityData();
        };
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initLendingActivity);
    } else {
        window.initLendingActivity();
    }

})();