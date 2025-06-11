// // GitHub configuration
// const GITHUB_TOKEN = process.env.TOKEN_GITHUB;
// const GITHUB_USERNAME = 'Parasar33';
// const REPO_NAME = 'blog';
// const BRANCH = 'main';

// // SHA256 function
// async function sha256(message) {
//     const msgBuffer = new TextEncoder().encode(message);
//     const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
//     const hashArray = Array.from(new Uint8Array(hashBuffer));
//     const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
//     return hashHex;
// }

// // Login validation
// async function validateLogin(event) {
//     event.preventDefault();
//     const password = document.getElementById('password').value;
//     const hashedPassword = await sha256(password);

//     // Replace this with your actual hashed password
//     const correctHashes = [
//   "d2fb5ab1e777e77584a410b16fc065c2efb3ee4b16f2bbc83700f51e6a59f441",
//   "120f6e5b4ea32f65bda68452fcfaaef06b0136e1d0e4a6f60bc3771fa0936dd6"
// ];

// const wrongHashes = [
//   "d554b517829a040cb3e3c4f993b7b6deadef6ce60d495554e38aeb70ffaeba86",
//   "d2dbfb841b242f49bb7cabea98ea5a93d6808c5e28b52a601600fa2f66affb1e",
//   "86c963bb0a9ac56ef0686c2d70976792393c8bbfbb948a3ee316d5ba7f9a92b5",
//   "bd71d54f58134445b39195c8e06eeb26a443a4238b2b6be1a17829c9e878afa3"
// ];

// if (correctHashes.includes(hashedPassword)) {
//   document.getElementById('loginForm').style.display = 'none';
//   document.getElementById('adminPanel').style.display = 'block';
//   loadExistingArtwork();
// } else if (wrongHashes.includes(hashedPassword)) {
//   showMessage('You are not that smart Buddy!!', 'error');
// } else {
//   showMessage('Invalid password', 'error');
// }
// }

// // Show message function
// function showMessage(message, type) {
//     const messageBox = document.getElementById('messageBox');
//     messageBox.className = `message-box ${type}`;
//     messageBox.querySelector('.message-text').textContent = message;
//     messageBox.style.display = 'block';

//     setTimeout(() => {
//         messageBox.style.display = 'none';
//     }, 3000);
// }

// // Validate file type
// const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// // File preview handler
// document.getElementById('artworkFile').addEventListener('change', function (event) {
//     const file = event.target.files[0];
//     if (file) {
//         if (!ALLOWED_FILE_TYPES.includes(file.type)) {
//             showMessage('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.', 'error');
//             this.value = '';
//             return;
//         }
//         if (file.size > MAX_FILE_SIZE) {
//             showMessage('File too large. Maximum size is 5MB.', 'error');
//             this.value = '';
//             return;
//         }
//         const reader = new FileReader();
//         reader.onload = function (e) {
//             const preview = document.getElementById('imagePreview');
//             preview.src = e.target.result;
//             preview.style.display = 'block';
//         };
//         reader.readAsDataURL(file);
//     }
// });

// async function uploadToGitHub(content, metadata) {
//     try {
//         // Validate file
//         if (!content.file) {
//             throw new Error('No file selected');
//         }

//         // Create safe filename
//         const timestamp = Date.now();
//         const safeTitle = metadata.title
//             .toLowerCase()
//             .replace(/[^a-z0-9]/g, '-')
//             .replace(/-+/g, '-');
//         const fileExtension = content.file.name.split('.').pop();
//         const filename = `${timestamp}-${safeTitle}`;

//         // Define image path
//         const imagePath = `images/${filename}.${fileExtension}`;

//         // Upload image
//         const imageContent = await readFileAsBase64(content.file);
//         await uploadFile(imagePath, imageContent, true);

//         // Update metadata.json
//         await updateMetadataIndex({
//             id: timestamp,
//             title: metadata.title,
//             type: metadata.type,
//             medium: metadata.medium,
//             dimensions: metadata.dimensions,
//             creationDate: metadata.creationDate,
//             description: content.description,
//             tags: metadata.tags,
//             imagePath: imagePath,
//             timestamp: new Date().toISOString()
//         });

//         return true;
//     } catch (error) {
//         console.error('Upload error:', error);
//         showMessage(error.message, 'error');
//         throw error;
//     }
// }

// async function uploadFile(path, content, isBase64 = false) {
//     try {
//         const encodedContent = isBase64 ? content : btoa(unescape(encodeURIComponent(content)));

//         // Check if file exists
//         let sha;
//         try {
//             const checkResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`, {
//                 headers: {
//                     'Authorization': `token ${GITHUB_TOKEN}`,
//                 }
//             });
//             if (checkResponse.ok) {
//                 const fileData = await checkResponse.json();
//                 sha = fileData.sha;
//             }
//         } catch (error) {
//             // File doesn't exist, continue with upload
//         }

//         const body = {
//             message: `Add ${path}`,
//             content: encodedContent,
//             branch: BRANCH
//         };

//         if (sha) {
//             body.sha = sha;
//         }

//         const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`, {
//             method: 'PUT',
//             headers: {
//                 'Authorization': `token ${GITHUB_TOKEN}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(body)
//         });

//         if (!response.ok) {
//             throw new Error(`Failed to upload ${path}: ${response.statusText}`);
//         }

//         return await response.json();
//     } catch (error) {
//         console.error(`Error uploading ${path}:`, error);
//         throw error;
//     }
// }

// async function updateMetadataIndex(newArtwork) {
//     const indexPath = 'content/metadata.json';
//     let currentMetadata = [];

//     try {
//         // Fetch existing metadata.json
//         const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${indexPath}`, {
//             headers: {
//                 'Authorization': `token ${GITHUB_TOKEN}`
//             }
//         });

//         if (response.ok) {
//             const data = await response.json();
//             currentMetadata = JSON.parse(atob(data.content));
//         }

//         console.log('Current Metadata:', currentMetadata);

//         // Add new artwork
//         currentMetadata.push(newArtwork);

//         // Sort by creation date
//         currentMetadata.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));

//         console.log('Updated Metadata:', currentMetadata);

//         // Upload updated metadata.json
//         const uploadResponse = await uploadFile(indexPath, JSON.stringify(currentMetadata, null, 2));
//         console.log('Upload Response:', uploadResponse);
//     } catch (error) {
//         console.error('Error updating metadata:', error);
//         throw error;
//     }
// }


// function readFileAsBase64(file) {
//     return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => {
//             try {
//                 const base64Content = reader.result.split(',')[1];
//                 resolve(base64Content);
//             } catch (error) {
//                 reject(new Error('Failed to read file'));
//             }
//         };
//         reader.onerror = () => reject(new Error('Failed to read file'));
//         reader.readAsDataURL(file);
//     });
// }

// // Load existing artwork
// async function loadExistingArtwork() {
//     try {
//         const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/content/metadata.json`, {
//             headers: {
//                 'Authorization': `token ${GITHUB_TOKEN}`
//             }
//         });

//         if (response.ok) {
//             const data = await response.json();
//             const metadata = JSON.parse(atob(data.content));
//             displayExistingArtwork(metadata);
//         }
//     } catch (error) {
//         console.error('Error loading existing artwork:', error);
//         showMessage('Error loading existing artwork', 'error');
//     }
// }

// // Display existing artwork
// function displayExistingArtwork(metadata) {
//     const container = document.getElementById('existingArtwork');
//     container.innerHTML = metadata.map(item => `
//         <div class="artwork-item">
//             <img src="https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/${item.imagePath}" 
//                  alt="${item.title}"
//                  onerror="this.src='images/placeholder.jpg'">
//             <div class="info">
//                 <h4>${item.title}</h4>
//                 <p>${new Date(item.creationDate).toLocaleDateString()}</p>
//             </div>
//             <div class="actions">
//                 <button onclick="deleteArtwork('${item.id}')" class="delete-btn">Delete</button>
//             </div>
//         </div>
//     `).join('');
// }

// // Form submission handler
// document.getElementById('contentForm').addEventListener('submit', async function (event) {
//     event.preventDefault();

//     const submitButton = this.querySelector('button[type="submit"]');
//     submitButton.disabled = true;
//     submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

//     try {
//         const formData = {
//             artworkType: document.getElementById('artworkType').value,
//             title: document.getElementById('title').value.trim(),
//             file: document.getElementById('artworkFile').files[0],
//             description: document.getElementById('artworkDescription').value.trim(),
//             medium: document.getElementById('medium').value.trim(),
//             dimensions: document.getElementById('dimensions').value.trim(),
//             creationDate: document.getElementById('creationDate').value,
//             tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
//         };

//         // Validate required fields
//         if (!formData.title || !formData.file || !formData.description) {
//             throw new Error('Please fill in all required fields');
//         }

//         const content = {
//             file: formData.file,
//             description: formData.description
//         };

//         const metadata = {
//             type: formData.artworkType,
//             title: formData.title,
//             medium: formData.medium,
//             dimensions: formData.dimensions,
//             creationDate: formData.creationDate,
//             tags: formData.tags
//         };

//         await uploadToGitHub(content, metadata);
//         showMessage('Artwork uploaded successfully!', 'success');
//         this.reset();
//         document.getElementById('imagePreview').style.display = 'none';
//         loadExistingArtwork();

//     } catch (error) {
//         showMessage(error.message, 'error');
//     } finally {
//         submitButton.disabled = false;
//         submitButton.innerHTML = 'Upload Artwork';
//     }
// });

// // Delete artwork function
// async function deleteArtwork(artworkId) {
//     if (!confirm('Are you sure you want to delete this artwork?')) return;

//     try {
//         // Get current metadata
//         const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/content/metadata.json`, {
//             headers: {
//                 'Authorization': `token ${GITHUB_TOKEN}`
//             }
//         });

//         if (!response.ok) {
//             throw new Error('Failed to fetch metadata');
//         }

//         const data = await response.json();
//         let metadata = JSON.parse(atob(data.content));

//         // Find artwork to delete
//         const artworkToDelete = metadata.find(item => item.id === parseInt(artworkId));
//         if (!artworkToDelete) {
//             throw new Error('Artwork not found');
//         }

//         // Delete image file
//         await deleteFile(artworkToDelete.imagePath);

//         // Update metadata.json
//         metadata = metadata.filter(item => item.id !== parseInt(artworkId));
//         await uploadFile('content/metadata.json', JSON.stringify(metadata, null, 2));

//         showMessage('Artwork deleted successfully', 'success');
//         loadExistingArtwork();
//     } catch (error) {
//         console.error('Error deleting artwork:', error);
//         showMessage('Error deleting artwork', 'error');
//     }
// }

// async function deleteFile(path) {
//     try {
//         // Get file SHA
//         const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`, {
//             headers: {
//                 'Authorization': `token ${GITHUB_TOKEN}`
//             }
//         });

//         if (!response.ok) {
//             throw new Error(`Failed to fetch ${path}`);
//         }

//         const data = await response.json();

//         // Delete file
//         const deleteResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`, {
//             method: 'DELETE',
//             headers: {
//                 'Authorization': `token ${GITHUB_TOKEN}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 message: `Delete ${path}`,
//                 sha: data.sha,
//                 branch: BRANCH
//             })
//         });

//         if (!deleteResponse.ok) {
//             throw new Error(`Failed to delete ${path}`);
//         }
//     } catch (error) {
//         console.error(`Error deleting ${path}:`, error);
//         throw error;
//     }
// }

// async function updateMetadataIndexAfterDelete(filename) {
//     const indexPath = 'content/metadata.json';
//     try {
//         const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${indexPath}`, {
//             headers: {
//                 'Authorization': `token ${GITHUB_TOKEN}`
//             }
//         });

//         if (!response.ok) {
//             throw new Error('Failed to fetch metadata index');
//         }

//         const data = await response.json();
//         let metadata = JSON.parse(atob(data.content));

//         // Remove deleted artwork
//         metadata = metadata.filter(item => item.filename !== filename);

//         // Upload updated metadata
//         await uploadFile(indexPath, JSON.stringify(metadata, null, 2));
//     } catch (error) {
//         console.error('Error updating metadata index:', error);
//         throw error;
//     }
// }
