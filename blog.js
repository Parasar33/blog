// Configuration
const GITHUB_USERNAME = 'Parasar33';
const REPO_NAME = 'blog';

// State management
let allArtworks = [];
let filteredArtworks = [];
let currentFilter = 'all';
let currentSearch = '';
let isLoading = false;

// Loading state management
function setLoading(loading) {
    isLoading = loading;
    const contentGrid = document.querySelector('.content-grid');
    if (loading) {
        contentGrid.innerHTML = `
            <div class="loading-state" style="opacity: 0.7; text-align: center; padding: 20px;">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading artworks...</p>
            </div>
        `;
    }
}

// Error handling
function showError(message) {
    const contentGrid = document.querySelector('.content-grid');
    contentGrid.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Fetch content from GitHub
async function fetchContent() {
    try {
        setLoading(true);
        const rawMetadataUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/content/metadata.json`;
        
        const response = await fetch(rawMetadataUrl, {
            method: 'GET',
            cache: 'no-cache'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch metadata.json (${response.status})`);
        }

        allArtworks = await response.json();

        if (!Array.isArray(allArtworks)) {
            allArtworks = [];
        }

        allArtworks.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
        filteredArtworks = [...allArtworks];

        await displayArtworks();
        setupTags();
    } catch (error) {
        console.error('Error fetching content:', error);
        showError('Loading artworks...');
        setTimeout(fetchContent, 2000);
    } finally {
        setLoading(false);
    }
}

// Display artworks in grid
async function displayArtworks() {
    const contentGrid = document.querySelector('.content-grid');
    contentGrid.innerHTML = '';

    if (filteredArtworks.length === 0) {
        contentGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No artworks found matching your criteria.</p>
            </div>
        `;
        return;
    }

    for (const artwork of filteredArtworks) {
        const artworkElement = document.createElement('div');
        artworkElement.className = 'artwork-card';

        const imageUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${artwork.imagePath}`;
        
        artworkElement.innerHTML = `
            <img src="${imageUrl}" 
                alt="${artwork.title}" 
                class="artwork-image"
                loading="lazy"
                onerror="this.src='images/placeholder.jpg'">
            <div class="artwork-content">
                <h2 class="artwork-title">${artwork.title}</h2>
                <div class="artwork-metadata">
                    <span><i class="fas fa-calendar"></i> ${formatDate(artwork.creationDate)}</span>
                    <span><i class="fas fa-palette"></i> ${artwork.type}</span>
                    ${artwork.medium ? `<span><i class="fas fa-paint-brush"></i> ${artwork.medium}</span>` : ''}
                </div>
                <p class="artwork-description">${artwork.description.substring(0, 100)}${artwork.description.length > 100 ? '...' : ''}</p>
                <div class="artwork-tags">
                    ${artwork.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;

        artworkElement.addEventListener('click', () => openModal(artwork));
        contentGrid.appendChild(artworkElement);
    }
}

function openModal(artwork) {
    const modal = document.getElementById('postModal');
    const modalBody = modal.querySelector('.modal-body');
    
    const imageUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${artwork.imagePath}`;

    modalBody.innerHTML = `
        <img src="${imageUrl}" 
            alt="${artwork.title}" 
            class="modal-image"
            onerror="this.src='images/placeholder.jpg'">
    `;

    modal.style.display = 'block';
}

// Filter functions
function filterArtworks() {
    filteredArtworks = allArtworks.filter(artwork => {
        const matchesFilter = currentFilter === 'all' || 
            artwork.type.toLowerCase() === currentFilter.toLowerCase();

        const matchesSearch = currentSearch === '' || 
            artwork.title.toLowerCase().includes(currentSearch) ||
            artwork.description.toLowerCase().includes(currentSearch) ||
            artwork.tags.some(tag => tag.toLowerCase().includes(currentSearch)) ||
            (artwork.medium && artwork.medium.toLowerCase().includes(currentSearch));

        return matchesFilter && matchesSearch;
    });

    displayArtworks();
}

function setupTags() {
    const tagsContainer = document.querySelector('.tags-container');
    const allTags = new Set();

    allArtworks.forEach(artwork => {
        artwork.tags.forEach(tag => allTags.add(tag));
    });

    // Start with the "All" tag
    tagsContainer.innerHTML = `<span class="tag active" onclick="filterByTag('all')">All</span>` +
        Array.from(allTags)
            .sort()
            .map(tag => `<span class="tag" onclick="filterByTag('${tag}')">${tag}</span>`)
            .join('');
}

// Modify the filterByTag function to handle the "All" tag
function filterByTag(tag) {
    const searchInput = document.getElementById('searchInput');
    const tags = document.querySelectorAll('.tags-container .tag');
    
    // Remove active class from all tags
    tags.forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tag
    event.target.classList.add('active');

    if (tag.toLowerCase() === 'all') {
        searchInput.value = '';
        currentSearch = '';
    } else {
        searchInput.value = tag;
        currentSearch = tag.toLowerCase();
    }
    
    filterArtworks();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const welcomeModal = document.getElementById('welcomeModal');
    
    // Show welcome modal immediately
    welcomeModal.style.display = 'block';
    
    // Handle welcome modal closing
    document.querySelector('.close-welcome').addEventListener('click', function() {
        welcomeModal.style.display = 'none';
    });
    
    // Allow escape key for welcome modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && welcomeModal.style.display === 'block') {
            welcomeModal.style.display = 'none';
        }
    });
    
    // Allow clicking outside for welcome modal
    window.addEventListener('click', function(e) {
        if (e.target === welcomeModal) {
            welcomeModal.style.display = 'none';
        }
    });

    // Modal close handlers
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('postModal').style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('postModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Navigation filters
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('nav a.active')?.classList.remove('active');
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            filterArtworks();
        });
    });

    // Search handler with debounce
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value.toLowerCase();
            filterArtworks();
        }, 300);
    });

    // Initial load
    fetchContent();
});