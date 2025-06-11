// Configuration
const GITHUB_USERNAME = 'Parasar33';
const REPO_NAME = 'blog';
const GITHUB_TOKEN = process.env.TOKEN_GITHUB;

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
            <div class="loading-state">
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
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/content/metadata.json`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3.raw'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch content (${response.status})`);
        }

        const data = await response.json();
        
        if (!data.content) {
            throw new Error('No content found in metadata.json');
        }

        allArtworks = JSON.parse(atob(data.content));
        
        if (!Array.isArray(allArtworks)) {
            allArtworks = [];
        }

        // Sort by creation date
        allArtworks.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
        filteredArtworks = [...allArtworks];
        
        await displayArtworks();
        setupTags();
    } catch (error) {
        console.error('Error fetching content:', error);
        showError(`Failed to load artworks: ${error.message}`);
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
        <h2>${artwork.title}</h2>
        <div class="artwork-metadata">
            <p><i class="fas fa-calendar"></i> Created on ${formatDate(artwork.creationDate)}</p>
            <p><i class="fas fa-palette"></i> ${artwork.type}</p>
            ${artwork.medium ? `<p><i class="fas fa-paint-brush"></i> Medium: ${artwork.medium}</p>` : ''}
            ${artwork.dimensions ? `<p><i class="fas fa-ruler-combined"></i> Dimensions: ${artwork.dimensions}</p>` : ''}
        </div>
        <div class="artwork-description">
            <p>${artwork.description}</p>
        </div>
        <div class="artwork-tags">
            ${artwork.tags.map(tag => `
                <span class="tag" onclick="filterByTag('${tag}'); modal.style.display='none'">
                    ${tag}
                </span>`).join('')}
        </div>
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

    tagsContainer.innerHTML = Array.from(allTags)
        .sort()
        .map(tag => `<span class="tag" onclick="filterByTag('${tag}')">${tag}</span>`)
        .join('');
}

function filterByTag(tag) {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = tag;
    currentSearch = tag.toLowerCase();
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
