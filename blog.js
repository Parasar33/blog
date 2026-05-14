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
        const response = await fetch(rawMetadataUrl, { method: 'GET', cache: 'no-cache' });
        if (!response.ok) throw new Error(`Failed to fetch metadata.json (${response.status})`);

        allArtworks = await response.json();
        if (!Array.isArray(allArtworks)) allArtworks = [];

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
        const githubLink = `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/blob/main/${artwork.imagePath}`;

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
                    ${artwork.tags.map(tag => `<span class="tag" onclick="filterByTag('${tag}')">${tag}</span>`).join('')}
                </div>
                <button class="comment-btn"><i class="fas fa-comment-dots"></i> Comment</button>
            </div>
        `;

        // Open artwork modal on click
        artworkElement.querySelector('.artwork-image').addEventListener('click', () => openModal(artwork));

        // Comment button per artwork
        artworkElement.querySelector('.comment-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openCommentModalForArtwork(artwork.title, githubLink, artwork.tags);
        });

        contentGrid.appendChild(artworkElement);
    }
}

// Open artwork modal
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
    modal.style.display = 'flex';
}

// Filter functions
function filterArtworks() {
    filteredArtworks = allArtworks.filter(artwork => {
        const matchesFilter = currentFilter === 'all' || artwork.type.toLowerCase() === currentFilter.toLowerCase();
        const matchesSearch = currentSearch === '' || artwork.title.toLowerCase().includes(currentSearch) ||
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

    allArtworks.forEach(artwork => artwork.tags.forEach(tag => allTags.add(tag)));
    tagsContainer.innerHTML = `<span class="tag active" onclick="filterByTag('all')">All</span>` +
        Array.from(allTags).sort().map(tag => `<span class="tag" onclick="filterByTag('${tag}')">${tag}</span>`).join('');
}

// Filter by tag
function filterByTag(tag) {
    const searchInput = document.getElementById('searchInput');
    const tags = document.querySelectorAll('.tags-container .tag');
    tags.forEach(t => t.classList.remove('active'));
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

// Comment modal for specific artwork
function openCommentModalForArtwork(title, link, tags) {
    const commentModal = document.getElementById('commentModal');
    const commentTagInput = document.getElementById('commentTag');
    commentTagInput.value = title;
    commentTagInput.dataset.link = link;
    commentTagInput.dataset.tags = tags.join(', ');
    commentModal.style.display = 'flex';
}

// Close comment modal
const commentModal = document.getElementById('commentModal');
commentModal.querySelector('.close-modal').addEventListener('click', () => commentModal.style.display = 'none');
const commentOverlay = commentModal.querySelector('.modal-overlay');
if (commentOverlay) commentOverlay.addEventListener('click', () => commentModal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === commentModal) commentModal.style.display = 'none'; });

// Comment form
const form = document.getElementById('commentForm');
form.addEventListener('submit', handleForm);
function handleForm(e) {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    const msg = document.getElementById('msg');
    const artworkTitle = form.querySelector('input[name="Tag"]').value;
    const artworkLink = form.querySelector('input[name="Tag"]').dataset.link;
    const artworkTags = form.querySelector('input[name="Tag"]').dataset.tags;

    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            access_key: "04967c76-a642-4d04-a468-d31c89fc36c8",
            title: "PARASAR- NEW COMMENT FROM BLOG",
            name: form.querySelector('input[name="Name"]').value,
            message: `Artwork Title: [${artworkTitle}]
Tags: [${artworkTags}]
Link: ${artworkLink}
Message: ${form.querySelector('textarea[name="Message"]').value}`
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                msg.innerHTML = "Thank you for your comment 🤍";
                msg.style.color = "#7CFC98";
                form.reset();
            } else throw new Error();
        })
        .catch(() => {
            msg.innerHTML = "Something went wrong. Please try again.";
            msg.style.color = "#ff5555";
        })
        .finally(() => {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            setTimeout(() => { msg.innerHTML = ""; commentModal.style.display = 'none'; }, 2500);
        });
}

// Utility
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const welcomeModal = document.getElementById('welcomeModal');
    welcomeModal.style.display = 'block';

    // Close welcome modal - support multiple close elements
    document.querySelectorAll('.close-welcome').forEach(el => {
        el.addEventListener('click', () => welcomeModal.style.display = 'none');
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && welcomeModal.style.display === 'block') welcomeModal.style.display = 'none'; });
    window.addEventListener('click', e => { if (e.target === welcomeModal) welcomeModal.style.display = 'none'; });

    // Post modal close
    const postModal = document.getElementById('postModal');
    postModal.querySelector('.close-modal').addEventListener('click', () => postModal.style.display = 'none');
    const postOverlay = postModal.querySelector('.modal-overlay');
    if (postOverlay) postOverlay.addEventListener('click', () => postModal.style.display = 'none');
    window.addEventListener('click', e => { if (e.target === postModal) postModal.style.display = 'none'; });

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelector('nav a.active')?.classList.remove('active');
            e.target.closest('a').classList.add('active');
            currentFilter = e.target.closest('a').dataset.filter;
            filterArtworks();
        });
    });

    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value.toLowerCase();
            filterArtworks();
        }, 300);
    });

    fetchContent();
});
