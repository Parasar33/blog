// GitHub configuration
// These values will be replaced by GitHub Actions during deployment
// For local development, manually update these values or use the .env file values
const GITHUB_TOKEN = '__GITHUB_TOKEN__';
const GITHUB_USERNAME = '__GITHUB_USERNAME__';
const REPO_NAME = '__REPO_NAME__';
const BRANCH = '__BRANCH__';

// Admin password hash (SHA-256 of the password)
// This will be replaced by GitHub Actions during deployment
const ADMIN_PASSWORD_HASH = '__ADMIN_PASSWORD_HASH__';

// SHA256 function
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Login validation
async function validateLogin(event) {
    event.preventDefault();
    const password = document.getElementById('password').value;
    const hashedPassword = await sha256(password);

    // Check against the admin password hash
    if (hashedPassword === ADMIN_PASSWORD_HASH) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadExistingArtwork();
    } else {
        showMessage('Invalid password', 'error');
    }
}

// Show message function
function showMessage(message, type) {
    const messageBox = document.getElementById('messageBox');
    const messageIcon = messageBox.querySelector('.message-icon i');
    
    messageBox.className = `message-box ${type}`;
    messageBox.querySelector('.message-text').textContent = message;
    
    // Update icon based on type
    if (type === 'success') {
        messageIcon.className = 'fas fa-check';
    } else {
        messageIcon.className = 'fas fa-times';
    }
    
    messageBox.style.display = 'flex';

    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000);
}

// Close message on click
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.querySelector('.close-message');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('messageBox').style.display = 'none';
        });
    }
});

// Validate file type
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// File preview handler
document.getElementById('artworkFile').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const dropzone = document.querySelector('.upload-dropzone');
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            showMessage('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.', 'error');
            this.value = '';
            dropzone.classList.remove('has-preview');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            showMessage('File too large. Maximum size is 5MB.', 'error');
            this.value = '';
            dropzone.classList.remove('has-preview');
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            dropzone.classList.add('has-preview');
        };
        reader.readAsDataURL(file);
    } else {
        dropzone.classList.remove('has-preview');
    }
});

async function uploadToGitHub(content, metadata) {
    try {
        console.log('[uploadToGitHub] Start', { content, metadata });
        // Validate file
        if (!content.file) {
            console.error('[uploadToGitHub] No file selected');
            throw new Error('No file selected');
        }

        // Create safe filename
        const timestamp = Date.now();
        const safeTitle = metadata.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-');
        const fileExtension = content.file.name.split('.').pop();
        const filename = `${timestamp}-${safeTitle}`;

        // Define image path
        const imagePath = `images/${filename}.${fileExtension}`;
        console.log('[uploadToGitHub] Image path:', imagePath);

        // Upload image
        const imageContent = await readFileAsBase64(content.file);
        console.log('[uploadToGitHub] Image content (base64, first 100 chars):', imageContent.slice(0, 100));
        await uploadFile(imagePath, imageContent, true);

        // Update metadata.json
        const newArtwork = {
            id: timestamp,
            title: metadata.title,
            type: metadata.type,
            medium: metadata.medium,
            dimensions: metadata.dimensions,
            creationDate: metadata.creationDate,
            description: content.description,
            tags: metadata.tags,
            imagePath: imagePath,
            timestamp: new Date().toISOString()
        };
        console.log('[uploadToGitHub] New artwork metadata:', newArtwork);
        await updateMetadataIndex(newArtwork);

        console.log('[uploadToGitHub] Success');
        return true;
    } catch (error) {
        console.error('[uploadToGitHub] Upload error:', error);
        showMessage(error.message, 'error');
        throw error;
    }
}

async function uploadFile(path, content, isBase64 = false) {
    try {
        console.log('[uploadFile] Start', { path, isBase64, contentPreview: content.slice ? content.slice(0, 100) : content });
        const encodedContent = isBase64 ? content : btoa(unescape(encodeURIComponent(content)));
        console.log('[uploadFile] Encoded content (first 100 chars):', encodedContent.slice(0, 100));

        // Check if file exists
        let sha;
        try {
            const checkUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`;
            console.log('[uploadFile] Checking if file exists:', checkUrl);
            const checkResponse = await fetch(checkUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                }
            });
            if (checkResponse.ok) {
                const fileData = await checkResponse.json();
                sha = fileData.sha;
                console.log('[uploadFile] File exists, sha:', sha);
            } else {
                console.log('[uploadFile] File does not exist, status:', checkResponse.status);
            }
        } catch (error) {
            console.log('[uploadFile] Error checking file existence (expected if file does not exist):', error);
        }

        const body = {
            message: `Add ${path}`,
            content: encodedContent,
            branch: BRANCH
        };

        if (sha) {
            body.sha = sha;
        }

        const uploadUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`;
        console.log('[uploadFile] Uploading file to:', uploadUrl, 'with body:', body);
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[uploadFile] Failed to upload ${path}:`, response.status, response.statusText, errorText);
            throw new Error(`Failed to upload ${path}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('[uploadFile] Upload success:', result);
        return result;
    } catch (error) {
        console.error(`[uploadFile] Error uploading ${path}:`, error);
        throw error;
    }
}

async function updateMetadataIndex(newArtwork) {
    const indexPath = 'content/metadata.json';
    let currentMetadata = [];

    try {
        console.log('[updateMetadataIndex] Start', { newArtwork });
        // Fetch existing metadata.json
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${indexPath}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentMetadata = JSON.parse(atob(data.content));
            console.log('[updateMetadataIndex] Current metadata:', currentMetadata);
        } else {
            console.log('[updateMetadataIndex] metadata.json does not exist or cannot be fetched, status:', response.status);
        }

        // Add new artwork
        currentMetadata.push(newArtwork);

        // Sort by creation date
        currentMetadata.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));

        console.log('[updateMetadataIndex] Updated metadata:', currentMetadata);

        // Upload updated metadata.json
        const uploadResponse = await uploadFile(indexPath, JSON.stringify(currentMetadata, null, 2));
        console.log('[updateMetadataIndex] Upload response:', uploadResponse);
    } catch (error) {
        console.error('[updateMetadataIndex] Error updating metadata:', error);
        throw error;
    }
}


function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const base64Content = reader.result.split(',')[1];
                resolve(base64Content);
            } catch (error) {
                reject(new Error('Failed to read file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Load existing artwork
async function loadExistingArtwork() {
    const container = document.getElementById('existingArtwork');
    container.innerHTML = `
        <div class="loading-placeholder">
            <div class="loader">
                <div class="loader-inner"></div>
            </div>
            <p>Loading artworks...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/content/metadata.json`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const metadata = JSON.parse(atob(data.content));
            displayExistingArtwork(metadata);
        } else {
            displayExistingArtwork([]);
        }
    } catch (error) {
        console.error('Error loading existing artwork:', error);
        container.innerHTML = `
            <div class="loading-placeholder">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                <p>Error loading artworks. Please refresh.</p>
            </div>
        `;
    }
}

// Display existing artwork
function displayExistingArtwork(metadata) {
    const container = document.getElementById('existingArtwork');
    
    if (metadata.length === 0) {
        container.innerHTML = `
            <div class="loading-placeholder">
                <i class="fas fa-images" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p>No artworks yet. Upload your first piece!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = metadata.map(item => `
        <div class="artwork-item">
            <img src="https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/${item.imagePath}" 
                 alt="${item.title}"
                 onerror="this.src='images/placeholder.jpg'">
            <div class="info">
                <h4>${item.title}</h4>
                <p><i class="fas fa-calendar-alt"></i> ${new Date(item.creationDate).toLocaleDateString()}</p>
            </div>
            <div class="actions">
                <button onclick="deleteArtwork('${item.id}')" class="delete-btn">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Form submission handler
document.getElementById('contentForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Uploading...</span>';

    try {
        const formData = {
            artworkType: document.getElementById('artworkType').value,
            title: document.getElementById('title').value.trim(),
            file: document.getElementById('artworkFile').files[0],
            description: document.getElementById('artworkDescription').value.trim(),
            medium: document.getElementById('medium').value.trim(),
            dimensions: document.getElementById('dimensions').value.trim(),
            creationDate: document.getElementById('creationDate').value,
            tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        // Validate required fields
        if (!formData.title || !formData.file || !formData.description) {
            throw new Error('Please fill in all required fields');
        }

        const content = {
            file: formData.file,
            description: formData.description
        };

        const metadata = {
            type: formData.artworkType,
            title: formData.title,
            medium: formData.medium,
            dimensions: formData.dimensions,
            creationDate: formData.creationDate,
            tags: formData.tags
        };

        await uploadToGitHub(content, metadata);
        showMessage('Artwork uploaded successfully!', 'success');
        this.reset();
        document.getElementById('imagePreview').src = '';
        document.querySelector('.upload-dropzone').classList.remove('has-preview');
        loadExistingArtwork();

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Upload Artwork</span>';
    }
});

// Delete artwork function
async function deleteArtwork(artworkId) {
    if (!confirm('Are you sure you want to delete this artwork?')) return;

    try {
        // Get current metadata
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/content/metadata.json`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch metadata');
        }

        const data = await response.json();
        let metadata = JSON.parse(atob(data.content));

        // Find artwork to delete
        const artworkToDelete = metadata.find(item => item.id === parseInt(artworkId));
        if (!artworkToDelete) {
            throw new Error('Artwork not found');
        }

        // Delete image file
        await deleteFile(artworkToDelete.imagePath);

        // Update metadata.json
        metadata = metadata.filter(item => item.id !== parseInt(artworkId));
        await uploadFile('content/metadata.json', JSON.stringify(metadata, null, 2));

        showMessage('Artwork deleted successfully', 'success');
        loadExistingArtwork();
    } catch (error) {
        console.error('Error deleting artwork:', error);
        showMessage('Error deleting artwork', 'error');
    }
}

async function deleteFile(path) {
    try {
        // Get file SHA
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}`);
        }

        const data = await response.json();

        // Delete file
        const deleteResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Delete ${path}`,
                sha: data.sha,
                branch: BRANCH
            })
        });

        if (!deleteResponse.ok) {
            throw new Error(`Failed to delete ${path}`);
        }
    } catch (error) {
        console.error(`Error deleting ${path}:`, error);
        throw error;
    }
}

async function updateMetadataIndexAfterDelete(filename) {
    const indexPath = 'content/metadata.json';
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${indexPath}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch metadata index');
        }

        const data = await response.json();
        let metadata = JSON.parse(atob(data.content));

        // Remove deleted artwork
        metadata = metadata.filter(item => item.filename !== filename);

        // Upload updated metadata
        await uploadFile(indexPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
        console.error('Error updating metadata index:', error);
        throw error;
    }
}
