let currentCardId = null;
let currentCardType = 'card';
let currentParentId = null;
let currentCardLink = null;
let currentCardHasChildren = false;
let searchTimeout = null;
let currentSearchQuery = '';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    initializeSearch();
    initializeCardInteractions();
});

// Page initialization
function initializePage() {
    // Add scroll animations
    initializeScrollAnimations();

    // Add hover effects to cards
    initializeCardHoverEffects();
}

// Scroll animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe cards and other elements
    document.querySelectorAll('.card, .stat, .footer-section').forEach(el => {
        observer.observe(el);
    });
}

// Card hover effects
function initializeCardHoverEffects() {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Card interactions - Remove action modal, use double-click
function initializeCardInteractions() {
    const cards = document.querySelectorAll('.card:not(.add-card)');

    cards.forEach(card => {
        let clickTimer = null;
        
        // Single click handler - removed action modal
        card.addEventListener('click', function (e) {
            // Don't trigger if clicking on menu button
            if (e.target.closest('.card-menu-btn')) {
                return;
            }

            // Clear any existing timer
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                return;
            }

            // Set timer for double-click detection
            clickTimer = setTimeout(() => {
                clickTimer = null;
                // Single click does nothing now
            }, 300);
        });

        // Double click handler - open card immediately
        card.addEventListener('dblclick', function (e) {
            // Clear single click timer
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }

            // Don't trigger if clicking on menu button
            if (e.target.closest('.card-menu-btn')) {
                return;
            }

            const id = this.getAttribute('data-id');
            const type = this.getAttribute('data-type');
            const link = this.getAttribute('data-link');
            const hasChildren = this.getAttribute('data-has-children') === 'true';

            if (type === 'file') {
                // For files, directly open the link
                if (link) {
                    // Add click animation
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = '';
                        window.open(link, '_blank');
                    }, 150);
                } else {
                    showFileLinkError('This file');
                }
            } else {
                // For cards, navigate to card view immediately
                // Add click animation
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                    window.location.href = `/card/${id}`;
                }, 150);
            }
        });

        // Right-click context menu for admin (unchanged)
        card.addEventListener('contextmenu', function (e) {
            e.preventDefault();

            const isAdmin = document.querySelector('.admin-badge') !== null;
            if (isAdmin) {
                const id = this.getAttribute('data-id');
                const type = this.getAttribute('data-type');
                const parentId = this.getAttribute('data-parent-id');

                // Add visual feedback
                this.style.transform = 'scale(0.98)';
                setTimeout(() => this.style.transform = '', 200);

                showCardSettings(id, type, parentId);
            }
        });

        // Add keyboard navigation (unchanged)
        card.setAttribute('tabindex', '0');
        card.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                // Simulate double-click on keyboard
                const id = this.getAttribute('data-id');
                const type = this.getAttribute('data-type');
                const link = this.getAttribute('data-link');
                const hasChildren = this.getAttribute('data-has-children') === 'true';

                if (type === 'file') {
                    if (link) {
                        window.open(link, '_blank');
                    } else {
                        showFileLinkError('This file');
                    }
                } else {
                    window.location.href = `/card/${id}`;
                }
            }
        });
    });
}


// Scroll to content function
function scrollToContent() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Add visual feedback to search input
        setTimeout(() => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.classList.add('searching');
                setTimeout(() => searchInput.classList.remove('searching'), 1000);
            }
        }, 500);
    }
}

// Modal Functions
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'block';

    // Add animation
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);

    // Focus on username input
    setTimeout(() => {
        document.getElementById('username').focus();
    }, 300);
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
    modal.querySelector('.modal-content').style.opacity = '0';

    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('loginForm').reset();
    }, 300);
}

function showCardSettings(cardId, cardType = 'card', parentId = null) {
    currentCardId = cardId;
    currentCardType = cardType;
    currentParentId = parentId;

    const modal = document.getElementById('cardSettingsModal');
    const title = document.getElementById('settingsTitle');
    const addSubCardBtn = document.getElementById('addSubCardBtn');

    title.textContent = `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Settings`;

    // Hide "Add Sub-Card" for file types
    if (addSubCardBtn) {
        addSubCardBtn.style.display = cardType === 'file' ? 'none' : 'block';
    }

    // Load current card data
    loadCardData(cardId);

    modal.style.display = 'block';

    // Add animation
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);
}

function closeCardSettingsModal() {
    const modal = document.getElementById('cardSettingsModal');
    modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
    modal.querySelector('.modal-content').style.opacity = '0';

    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('cardSettingsForm').reset();
        currentCardId = null;
        currentCardType = 'card';
        currentParentId = null;
    }, 300);
}

// Action Modal Functions
function showActionModal(cardId, cardType, link, hasChildren) {
    currentCardId = cardId;
    currentCardType = cardType;
    currentCardLink = link;
    currentCardHasChildren = hasChildren;

    const modal = document.getElementById('actionModal');
    const title = document.getElementById('actionTitle');
    const viewContentsBtn = document.getElementById('viewContentsBtn');
    const proceedToLinkBtn = document.getElementById('proceedToLinkBtn');

    // Get card name for the title
    const cardElement = document.querySelector(`[data-id="${cardId}"]`);
    const cardName = cardElement ? cardElement.querySelector('h3').textContent : 'Item';

    title.textContent = `Choose Action for "${cardName}"`;

    // ALWAYS show View Contents for cards (even if no children yet)
    if (viewContentsBtn) {
        viewContentsBtn.style.display = cardType === 'card' ? 'block' : 'none';
        if (!hasChildren && cardType === 'card') {
            viewContentsBtn.innerHTML = '<i class="fas fa-folder-open"></i> Open Folder (Empty)';
        } else if (hasChildren && cardType === 'card') {
            viewContentsBtn.innerHTML = '<i class="fas fa-folder-open"></i> View Contents';
        }
    }

    // Show Proceed to Link only if link exists
    if (proceedToLinkBtn) {
        proceedToLinkBtn.style.display = link ? 'block' : 'none';
    }

    modal.style.display = 'block';

    // Add animation
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);
}

function closeActionModal() {
    const modal = document.getElementById('actionModal');
    modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
    modal.querySelector('.modal-content').style.opacity = '0';

    setTimeout(() => {
        modal.style.display = 'none';
        currentCardId = null;
        currentCardType = 'card';
        currentCardLink = null;
        currentCardHasChildren = false;
    }, 300);
}

function viewContents() {
    if (!currentCardId) return;

    // Navigate to card view page immediately
    window.location.href = `/card/${currentCardId}`;
}

function proceedToLink() {
    if (!currentCardLink) {
        showNotification('No link assigned to this item.', 'error');
        return;
    }

    // Open link immediately
    window.open(currentCardLink, '_blank');
    closeActionModal();
}

// Load current card data into the form
function loadCardData(cardId) {
    // Fetch current card data from server
    fetch('/api/cards')
        .then(response => response.json())
        .then(data => {
            const card = findCardById(data.cards, parseInt(cardId));
            if (card) {
                document.getElementById('cardId').value = card.id;
                document.getElementById('cardType').value = card.type;
                document.getElementById('parentId').value = currentParentId;
                document.getElementById('cardName').value = card.name;
                document.getElementById('cardSubtitle').value = card.subtitle || '';
                document.getElementById('cardLink').value = card.link || '';
            }
        })
        .catch(error => {
            console.error('Error loading card data:', error);
            showNotification('Error loading card data', 'error');
        });
}

// Find card by ID recursively
function findCardById(cards, cardId) {
    for (const card of cards) {
        if (card.id === cardId) {
            return card;
        }
        if (card.children && card.children.length > 0) {
            const found = findCardById(card.children, cardId);
            if (found) return found;
        }
    }
    return null;
}

// Save all card changes
function saveCardChanges() {
    if (!currentCardId) return;

    const name = document.getElementById('cardName').value;
    const subtitle = document.getElementById('cardSubtitle').value;
    const link = document.getElementById('cardLink').value;

    if (!name.trim()) {
        showNotification('Please enter a card name', 'warning');
        return;
    }

    const updates = {
        name: name,
        subtitle: subtitle,
        link: link
    };

    updateCard(updates);
}

// Card Management Functions
function addNewCard(parentId = null) {
    const cardData = {
        name: 'New Folder',
        type: 'card',
        subtitle: '',
        link: '',
        parent_id: parentId
    };

    fetch('/api/cards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                showNotification('Error adding card: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error adding card', 'error');
        });
}

function addSubCard() {
    if (!currentCardId) return;

    const cardData = {
        name: 'New Sub-Folder',
        type: 'card',
        subtitle: '',
        link: '',
        parent_id: parseInt(currentCardId)
    };

    fetch('/api/cards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                showNotification('Error adding sub-card: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error adding sub-card', 'error');
        });
}

function addFileButton() {
    const parentId = currentCardId || currentParentId;

    const cardData = {
        name: 'New File',
        type: 'file',
        subtitle: '',
        link: '',
        parent_id: parentId ? parseInt(parentId) : null
    };

    fetch('/api/cards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                showNotification('Error adding file: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error adding file', 'error');
        });
}

function deleteCard() {
    if (!currentCardId) return;

    showConfirmationModal(
        'Delete Confirmation',
        'Are you sure you want to delete this item? This action cannot be undone.',
        'Delete',
        'Cancel',
        function () {
            // Proceed with deletion
            fetch(`/api/cards?id=${currentCardId}`, {
                method: 'DELETE'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        showNotification('Error deleting card: ' + data.error, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotification('Error deleting card', 'error');
                });
        }
    );
}

function updateCard(updates) {
    if (!currentCardId) return;

    fetch('/api/cards', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: parseInt(currentCardId),
            ...updates
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeCardSettingsModal();
                location.reload();
            } else {
                showNotification('Error updating card: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error updating card', 'error');
        });
}

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                showNotification('Login failed: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Login failed', 'error');
        });
});

// Logout Function
function logout() {
    showConfirmationModal(
        'Logout Confirmation',
        'Are you sure you want to logout?',
        'Logout',
        'Cancel',
        function () {
            window.location.href = '/logout';
        }
    );
}

// Create Options Modal Functions
function showCreateOptions(parentId = null) {
    currentParentId = parentId;
    const modal = document.getElementById('createOptionsModal');
    modal.style.display = 'block';

    // Add animation
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);
}

function closeCreateOptionsModal() {
    const modal = document.getElementById('createOptionsModal');
    modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
    modal.querySelector('.modal-content').style.opacity = '0';

    setTimeout(() => {
        modal.style.display = 'none';
        currentParentId = null;
    }, 300);
}

function addFileButtonFromCreate() {
    const parentId = currentParentId;

    const cardData = {
        name: 'New File',
        type: 'file',
        subtitle: '',
        link: '',
        parent_id: parentId ? parseInt(parentId) : null
    };

    fetch('/api/cards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                showNotification('Error adding file: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error adding file', 'error');
        });
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchOverlay = document.getElementById('searchOverlay');

    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        const query = e.target.value.trim();
        currentSearchQuery = query;

        // Add searching class for animation
        this.classList.add('searching');
        const searchIcon = this.parentElement.querySelector('.search-icon');
        if (searchIcon) searchIcon.classList.add('searching');

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Search after user stops typing for 300ms
        searchTimeout = setTimeout(() => {
            performSearch(query);
            this.classList.remove('searching');
            if (searchIcon) searchIcon.classList.remove('searching');
        }, 300);
    });

    searchInput.addEventListener('focus', function () {
        if (currentSearchQuery && currentSearchQuery.length >= 2) {
            showSearchResults();
        }
    });

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            performSearch(e.target.value.trim());
        }
    });

    // Close dropdown when clicking outside
    searchOverlay.addEventListener('click', function () {
        hideSearchResults();
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            hideSearchResults();
        }
    });
}

function performSearch(query) {
    console.log("Performing search for:", query);

    if (!query || query.length < 2) {
        console.log("Query too short, hiding results");
        hideSearchResults();
        return;
    }

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(response => {
            console.log("Search response status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("Search results:", data);
            displaySearchResults(data);
            showSearchResults();
        })
        .catch(error => {
            console.error('Search error:', error);
            displaySearchError();
            showSearchResults();
        });
}

function displaySearchResults(data) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    if (data.results.length === 0) {
        searchResults.innerHTML = `
            <div class="search-empty">
                <i class="fas fa-search"></i>
                <h3>No results found</h3>
                <p>Try different keywords or check your spelling</p>
            </div>
        `;
        return;
    }

    let resultsHTML = `
        <div class="search-stats">
            Found ${data.count} result${data.count !== 1 ? 's' : ''} for "${data.query}"
        </div>
    `;

    data.results.forEach(result => {
        const highlightedName = highlightText(result.name, data.query);
        const highlightedSubtitle = result.subtitle ? highlightText(result.subtitle, data.query) : '';

        // Add file-specific styling and icons
        const fileIcon = result.type === 'file' ? 'fa-file' : 'fa-folder';
        const fileClass = result.type === 'file' ? 'file-search-result' : '';

        resultsHTML += `
            <div class="search-result-item ${fileClass}" onclick="navigateToSearchResult(${JSON.stringify(result).replace(/"/g, '&quot;')})">
                <div class="search-result-icon">
                    <i class="fas ${fileIcon}"></i>
                </div>
                <div class="search-result-content">
                    <h4>${highlightedName}</h4>
                    ${highlightedSubtitle ? `<p>${highlightedSubtitle}</p>` : ''}
                    <div class="search-result-path">${result.path}</div>
                    ${result.type === 'file' && !result.link ? '<div class="search-result-warning"><i class="fas fa-exclamation-circle"></i> No link assigned</div>' : ''}
                </div>
            </div>
        `;
    });

    searchResults.innerHTML = resultsHTML;
}

function highlightText(text, query) {
    if (!query) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function showSearchResults() {
    const searchResults = document.getElementById('searchResults');
    const searchOverlay = document.getElementById('searchOverlay');

    if (searchResults && searchOverlay) {
        searchResults.classList.add('active');
        searchOverlay.classList.add('active');
    }
}

function hideSearchResults() {
    const searchResults = document.getElementById('searchResults');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');

    if (searchResults && searchOverlay) {
        searchResults.classList.remove('active');
        searchOverlay.classList.remove('active');
    }

    // Clear input if it's empty
    if (searchInput && searchInput.value.trim() === '') {
        searchInput.value = '';
    }
}

function clearSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.innerHTML = '';
    }
    hideSearchResults();
}

function displaySearchError() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.innerHTML = `
            <div class="search-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Search Error</h3>
                <p>Unable to perform search. Please try again.</p>
            </div>
        `;
    }
}

function navigateToSearchResult(cardInfo) {
    hideSearchResults();

    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // If it's a file, proceed to its link
    if (cardInfo.type === 'file') {
        if (cardInfo.link) {
            window.open(cardInfo.link, '_blank');
        } else {
            // Error handling for files without links
            showFileLinkError(cardInfo.name);
        }
    } else {
        // If it's a folder, navigate to the card view
        window.location.href = `/card/${cardInfo.id}`;
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: 'var(--primary-green)',
        error: '#dc3545',
        warning: 'var(--primary-orange)',
        info: 'var(--dark-gray)'
    };
    return colors[type] || 'var(--dark-gray)';
}

// Confirmation Modal
function showConfirmationModal(title, message, confirmText, cancelText, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="text-align: center; padding: 1rem 0;">
                    <p>${message}</p>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-danger" onclick="this.closest('.modal').querySelector('.confirm-btn').click()">
                        <i class="fas fa-check"></i> ${confirmText}
                    </button>
                    <button type="button" class="btn-cancel" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i> ${cancelText}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add event listener for confirm button
    const confirmBtn = modal.querySelector('.btn-danger');
    confirmBtn.addEventListener('click', function () {
        onConfirm();
        modal.remove();
    });

    // Add click outside to close
    modal.addEventListener('click', function (e) {
        if (e.target === this) {
            this.remove();
        }
    });

    // Add to body
    document.body.appendChild(modal);

    // Add animation
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);
}

// File link error modal
function showFileLinkError(fileName) {
    const errorModal = document.createElement('div');
    errorModal.className = 'modal';
    errorModal.style.display = 'block';
    errorModal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> File Not Accessible</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-file-excel"></i>
                    <h4 style="color: #dc3545; margin-bottom: 0.5rem;">No Link Assigned</h4>
                    <p>The file "<strong>${fileName}</strong>" doesn't have an assigned link.</p>
                    <p style="font-size: 0.9rem; color: var(--text-light); margin-top: 1rem;">
                        Please contact an administrator to assign a link to this file.
                    </p>
                </div>
                <div class="form-actions" style="margin-top: 1.5rem;">
                    <button type="button" class="btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()" style="width: 100%;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add click outside to close
    errorModal.addEventListener('click', function (e) {
        if (e.target === this) {
            this.remove();
        }
    });

    // Add to body
    document.body.appendChild(errorModal);

    // Add animation
    setTimeout(() => {
        errorModal.querySelector('.modal-content').style.transform = 'translateY(0)';
        errorModal.querySelector('.modal-content').style.opacity = '1';
    }, 10);

    // Add escape key to close
    const escapeHandler = function (e) {
        if (e.key === 'Escape') {
            errorModal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Global event listeners
window.addEventListener('click', function (e) {
    const loginModal = document.getElementById('loginModal');
    const cardSettingsModal = document.getElementById('cardSettingsModal');
    const actionModal = document.getElementById('actionModal');
    const createOptionsModal = document.getElementById('createOptionsModal');

    if (e.target === loginModal) {
        closeLoginModal();
    }
    if (e.target === cardSettingsModal) {
        closeCardSettingsModal();
    }
    if (e.target === actionModal) {
        closeActionModal();
    }
    if (e.target === createOptionsModal) {
        closeCreateOptionsModal();
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeLoginModal();
        closeCardSettingsModal();
        closeActionModal();
        closeCreateOptionsModal();
    }
});

// Add CSS for new animations
const style = document.createElement('style');
style.textContent = `
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
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.2rem;
        border-radius: 4px;
        transition: background 0.3s ease;
    }
    
    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease-out;
    }
`;

// Footer functionality
function initializeFooter() {
    createFooterParticles();
    initializeBackToTop();
    initializeFooterInteractions();
}

function createFooterParticles() {
    const footer = document.querySelector('.footer');
    if (!footer) return;

    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'footer-particles';

    for (let i = 0; i < 4; i++) {
        const particle = document.createElement('div');
        particle.className = 'footer-particle';
        particlesContainer.appendChild(particle);
    }

    footer.appendChild(particlesContainer);
}

function initializeBackToTop() {
    const backToTopBtn = document.querySelector('.back-to-top-btn');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', scrollToTop);
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function initializeFooterInteractions() {
    // Add click handlers for footer links
    const footerLinks = document.querySelectorAll('.footer-section a');
    footerLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            // Add ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
            `;

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);

            // Simulate navigation (you can replace this with actual navigation)
            showNotification(`Navigating to ${this.textContent}`, 'info');
        });
    });
}

// Add ripple animation to CSS
function addFooterAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Update the DOMContentLoaded event to include footer initialization
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    initializeSearch();
    initializeCardInteractions();
    initializeFooter();
    addFooterAnimations();
});

// Set initial zoom level to 70%
function setZoomLevel() {
    document.body.style.zoom = "0.9";

    // Fallback for browsers that don't support zoom
    if (document.body.style.zoom === undefined) {
        document.body.style.transform = "scale(0.9)";
        document.body.style.transformOrigin = "0 0";
        document.body.style.width = "142.857%"; // 100/0.9
        document.body.style.height = "142.857%";
    }
}


// Reset zoom for printing
window.addEventListener('beforeprint', function () {
    document.body.style.zoom = "1";
    document.body.style.transform = "scale(1)";
});

// Restore zoom after printing
window.addEventListener('afterprint', function () {
    setZoomLevel();
});

// Handle window resize
window.addEventListener('resize', function () {
    // Re-apply zoom on resize to maintain consistency
    setTimeout(setZoomLevel, 100);
});

document.head.appendChild(style);