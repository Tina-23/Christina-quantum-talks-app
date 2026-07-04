document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let updates = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;
    let isLoading = false;
    let selectedHashtags = new Set();
    
    // DOM Elements
    const feedList = document.getElementById('feed-list');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const lastUpdatedText = document.getElementById('last-updated-time');
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    
    // Filter Buttons
    const filterAll = document.getElementById('filter-all');
    const filterIbm = document.getElementById('filter-ibm');
    const filterPl = document.getElementById('filter-pl');
    
    // Composer Elements
    const composerPlaceholder = document.getElementById('composer-placeholder');
    const composerActive = document.getElementById('composer-active');
    const previewSource = document.getElementById('preview-source');
    const previewTitle = document.getElementById('preview-title');
    const previewLink = document.getElementById('preview-link');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const hashtagChipsContainer = document.getElementById('hashtag-chips');
    const tweetBtn = document.getElementById('tweet-btn');
    const charProgressRing = document.getElementById('char-progress-ring');
    const charCountText = document.getElementById('char-count');
    
    // Hashtags list
    const SUGGESTED_HASHTAGS = ['#QuantumComputing', '#Qiskit', '#PennyLane', '#Physics', '#TechNews'];
    
    // -------------------------------------------------------------
    // Core Functions
    // -------------------------------------------------------------
    
    // Load data from backend API
    async function loadUpdates(forceRefresh = false) {
        if (isLoading) return;
        
        setLoadingState(true);
        try {
            const response = await fetch(`/api/updates?refresh=${forceRefresh}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                updates = data.updates;
                // Format and display last updated
                lastUpdatedText.textContent = `Last updated: ${data.last_updated}`;
                
                // If the backend had to use mock fallback
                if (data.last_updated.includes('Fallback')) {
                    showToast('Offline Mode: Loaded cached/fallback updates.', 'warning');
                } else if (forceRefresh) {
                    showToast('Feed updated successfully!', 'success');
                }
            } else {
                throw new Error('API returned unsuccessful status');
            }
        } catch (error) {
            console.error('Error fetching updates:', error);
            showToast('Failed to fetch live updates. Showing cached data.', 'error');
        } finally {
            setLoadingState(false);
            renderFeed();
        }
    }
    
    // Update UI loading states
    function setLoadingState(loading) {
        isLoading = loading;
        if (loading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
            statusDot.classList.add('loading');
            statusLabel.textContent = 'Updating...';
            renderSkeletons();
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
            statusDot.classList.remove('loading');
            statusLabel.textContent = 'Live Feed Connected';
        }
    }
    
    // Render Loading Skeletons
    function renderSkeletons() {
        feedList.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            feedList.innerHTML += `
                <div class="feed-card skeleton-card">
                    <div class="card-header">
                        <div class="skeleton-item skeleton-badge"></div>
                        <div class="skeleton-item" style="width: 60px; height: 14px;"></div>
                    </div>
                    <div class="skeleton-item skeleton-title"></div>
                    <div class="skeleton-item skeleton-desc"></div>
                    <div class="skeleton-item skeleton-desc-short"></div>
                    <div class="card-footer" style="border: none;">
                        <div class="skeleton-item skeleton-footer"></div>
                    </div>
                </div>
            `;
        }
    }
    
    // Filter and Search Logic, then Render
    function renderFeed() {
        if (isLoading) return;
        
        feedList.innerHTML = '';
        
        // Apply Filter and Search
        const filtered = updates.filter(item => {
            const matchesFilter = 
                currentFilter === 'all' || 
                (currentFilter === 'ibm' && item.source === 'IBM Quantum') ||
                (currentFilter === 'pennylane' && item.source === 'PennyLane');
                
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = 
                query === '' ||
                item.title.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.tags.some(tag => tag.toLowerCase().includes(query)) ||
                item.authors.some(author => author.toLowerCase().includes(query));
                
            return matchesFilter && matchesSearch;
        });
        
        if (filtered.length === 0) {
            feedList.innerHTML = `
                <div class="feed-empty-state fade-in">
                    <div class="empty-icon">🔍</div>
                    <h3>No updates found</h3>
                    <p style="margin-top: 0.5rem; color: var(--text-secondary)">Try adjusting your search query or filter</p>
                </div>
            `;
            return;
        }
        
        filtered.forEach((item, index) => {
            const isSelected = selectedUpdate && selectedUpdate.id === item.id;
            const sourceClass = item.source === 'IBM Quantum' ? 'ibm' : 'pl';
            const cardSourceClass = item.source === 'IBM Quantum' ? 'ibm-card' : 'pennylane-card';
            
            // Build author and tag list
            let metaHtml = '';
            item.authors.forEach(author => {
                metaHtml += `<span class="author-pill">${author}</span>`;
            });
            item.tags.forEach(tag => {
                metaHtml += `<span class="tag-pill">${tag}</span>`;
            });
            
            const card = document.createElement('div');
            card.className = `feed-card ${cardSourceClass} ${isSelected ? 'selected' : ''} fade-in`;
            card.style.animationDelay = `${index * 0.05}s`;
            card.dataset.id = item.id;
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="source-badge ${sourceClass}">${item.source}</span>
                    <span class="post-date">${item.display_date}</span>
                </div>
                <h3 class="post-title">${escapeHTML(item.title)}</h3>
                <p class="post-desc">${escapeHTML(item.description)}</p>
                <div class="card-footer">
                    <div class="meta-group">
                        ${metaHtml}
                    </div>
                    <div class="card-action-hint">
                        <span>Select to tweet</span>
                        <span>→</span>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => selectArticle(item));
            feedList.appendChild(card);
        });
    }
    
    // Select an Article for tweeting
    function selectArticle(item) {
        selectedUpdate = item;
        
        // Visual selection update
        document.querySelectorAll('.feed-card').forEach(card => {
            if (card.dataset.id === item.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Show active composer
        composerPlaceholder.style.display = 'none';
        composerActive.style.display = 'flex';
        
        // Populate preview details
        previewSource.textContent = item.source;
        previewSource.className = `source-badge ${item.source === 'IBM Quantum' ? 'ibm' : 'pl'} preview-source-badge`;
        previewTitle.textContent = item.title;
        previewLink.textContent = item.link;
        previewLink.href = item.link;
        
        // Clear previous hashtags selection
        selectedHashtags.clear();
        
        // Create initial tweet text
        const handle = item.source === 'IBM Quantum' ? '@IBMQuantum' : '@PennyLaneAI';
        const defaultText = `Check out this latest quantum computing update from ${handle}: "${item.title}" 🚀\n\nRead more here: ${item.link}`;
        tweetTextarea.value = defaultText;
        
        // Render hashtags chips
        renderHashtags();
        updateCharCount();
    }
    
    // Render suggested hashtag chips
    function renderHashtags() {
        hashtagChipsContainer.innerHTML = '';
        SUGGESTED_HASHTAGS.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = `hashtag-chip ${selectedHashtags.has(tag) ? 'active' : ''}`;
            chip.textContent = tag;
            chip.addEventListener('click', () => toggleHashtag(tag));
            hashtagChipsContainer.appendChild(chip);
        });
    }
    
    // Toggle hashtag inside the tweet body
    function toggleHashtag(tag) {
        let currentText = tweetTextarea.value;
        
        if (selectedHashtags.has(tag)) {
            // Remove hashtag
            selectedHashtags.delete(tag);
            // Replace hashtag (plus any leading spaces)
            const regex = new RegExp(`\\s*${tag}`, 'g');
            currentText = currentText.replace(regex, '');
        } else {
            // Add hashtag
            selectedHashtags.add(tag);
            // Append hashtag at the end before links if possible, or simply at the end
            currentText = `${currentText.trim()} ${tag}`;
        }
        
        tweetTextarea.value = currentText;
        renderHashtags();
        updateCharCount();
    }
    
    // Handle character counting and visual ring progress
    function updateCharCount() {
        const text = tweetTextarea.value;
        const length = text.length;
        const limit = 280;
        const remaining = limit - length;
        
        charCountText.textContent = remaining;
        
        // Progress Ring Drawing
        const circle = charProgressRing;
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        let percent = (length / limit) * 100;
        if (percent > 100) percent = 100;
        
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        // Color coding warning thresholds
        if (remaining < 0) {
            circle.style.stroke = 'var(--accent-error)';
            charCountText.classList.add('warn');
            tweetBtn.disabled = true;
        } else if (remaining <= 20) {
            circle.style.stroke = '#f59e0b'; // warning yellow
            charCountText.classList.remove('warn');
            tweetBtn.disabled = length === 0;
        } else {
            circle.style.stroke = 'var(--accent)';
            charCountText.classList.remove('warn');
            tweetBtn.disabled = length === 0;
        }
    }
    
    // Open Twitter Web Intent in a popup window
    function handleTweet() {
        if (!selectedUpdate) return;
        
        const tweetText = tweetTextarea.value;
        if (tweetText.length === 0 || tweetText.length > 280) return;
        
        // Generate Twitter Intent URL
        const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        
        // Center the popup window on screen
        const width = 550;
        const height = 420;
        const left = (window.innerWidth - width) / 2 + window.screenX;
        const top = (window.innerHeight - height) / 2 + window.screenY;
        
        window.open(
            xUrl, 
            'Share on X', 
            `width=${width},height=${height},top=${top},left=${left},status=0,resizable=yes`
        );
        
        showToast('Opening tweet composer on X...', 'success');
    }
    
    // -------------------------------------------------------------
    // Helper & UI Utilities
    // -------------------------------------------------------------
    
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Simple UI Toast Notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '2rem';
        toast.style.right = '2rem';
        toast.style.padding = '0.75rem 1.5rem';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = '1000';
        toast.style.fontFamily = 'var(--font-body)';
        toast.style.fontSize = '0.9rem';
        toast.style.fontWeight = '500';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '0.5rem';
        toast.style.boxShadow = 'var(--shadow-lg)';
        toast.style.animation = 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        let bgColor = 'var(--bg-surface)';
        let border = '1px solid var(--border-color)';
        let textColor = 'var(--text-primary)';
        let icon = 'ℹ️';
        
        if (type === 'success') {
            bgColor = 'rgba(16, 185, 129, 0.15)';
            border = '1px solid var(--accent-success)';
            textColor = '#34d399';
            icon = '✓';
        } else if (type === 'error') {
            bgColor = 'rgba(239, 68, 68, 0.15)';
            border = '1px solid var(--accent-error)';
            textColor = '#f87171';
            icon = '✕';
        } else if (type === 'warning') {
            bgColor = 'rgba(245, 158, 11, 0.15)';
            border = '1px solid #f59e0b';
            textColor = '#fbbf24';
            icon = '⚠';
        }
        
        toast.style.backgroundColor = bgColor;
        toast.style.border = border;
        toast.style.color = textColor;
        toast.innerHTML = `<span style="font-weight: bold">${icon}</span> <span>${message}</span>`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
    
    // -------------------------------------------------------------
    // Event Listeners
    // -------------------------------------------------------------
    
    // Filter controls
    filterAll.addEventListener('click', () => {
        currentFilter = 'all';
        [filterAll, filterIbm, filterPl].forEach(b => b.classList.remove('active'));
        filterAll.classList.add('active');
        renderFeed();
    });
    
    filterIbm.addEventListener('click', () => {
        currentFilter = 'ibm';
        [filterAll, filterIbm, filterPl].forEach(b => b.classList.remove('active'));
        filterIbm.classList.add('active');
        renderFeed();
    });
    
    filterPl.addEventListener('click', () => {
        currentFilter = 'pennylane';
        [filterAll, filterIbm, filterPl].forEach(b => b.classList.remove('active'));
        filterPl.classList.add('active');
        renderFeed();
    });
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderFeed();
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        loadUpdates(true);
    });
    
    // Textarea input
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Tweet button click
    tweetBtn.addEventListener('click', handleTweet);
    
    // -------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------
    loadUpdates(false);
});
