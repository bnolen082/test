 // menu-app.js - extracted JavaScript for AES Breezeway Menu App

// Use an empty API key placeholder. Provide key via environment or integrate securely when deploying.
const apiKey = "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

// --- View Switching Logic ---
function showView(viewId) {
    const views = ['landing-view', 'menu-view', 'orders-view'];
    views.forEach(id => {
        const view = document.getElementById(id);
        if (view) {
            if (id === viewId) {
                view.classList.remove('hidden');
                // Use a tiny delay to ensure transition applies
                requestAnimationFrame(() => {
                    view.style.opacity = 1;
                });
                // Start image generation only when loading the menu view
                if (id === 'menu-view') {
                     generateMainDishImage();
                }
            } else {
                view.style.opacity = 0;
                setTimeout(() => view.classList.add('hidden'), 300);
            }
        }
    });
}

// --- Image Generation Logic ---
async function generateMainDishImage() {
    const imageContainer = document.getElementById('image-container');
    const loader = document.getElementById('image-loader');
    
    // If the image already exists, do nothing
    if (imageContainer.querySelector('img')) {
        return;
    }

    // Show loader
    imageContainer.innerHTML = '<div class="loader" id="image-loader"></div>';

    // First, try to load a local image file if the user placed one in ./images
    const localCandidates = [
        './images/peri peri.jpeg',
        './images/peri%20peri.jpeg',
        './images/todays-menu.jpg',
        './images/todays-menu.jpeg',
        './images/todays-menu.png',
        './images/peri-peri.jpg',
        './images/peri-peri.jpeg'
    ];

    const tryLocalImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Image failed to load'));
            img.src = src;
        });
    };

    for (const candidate of localCandidates) {
        try {
            const img = await tryLocalImage(candidate);
            img.id = 'main-dish-image';
            img.alt = "Today's Special: Peri-Peri Chicken";
            imageContainer.innerHTML = '';
            imageContainer.appendChild(img);
            return; // success, don't call API
        } catch (err) {
            // try next candidate
            // console.debug('Local image not found:', candidate);
        }
    }

    const userPrompt = "A photorealistic, high-angle close-up of a delicious and healthy Peri-Peri Chicken Bowl with roasted vegetables and rice, presented cleanly in a modern school cafeteria setting. Bright, natural light. Minimalist style.";

    const payload = { 
        instances: { prompt: userPrompt }, 
        parameters: { "sampleCount": 1 } 
    };
    
    // Exponential backoff retry logic
    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
                const base64Data = result.predictions[0].bytesBase64Encoded;
                const imageUrl = `data:image/png;base64,${base64Data}`;
                
                // Create and insert the image element
                const img = document.createElement('img');
                img.id = 'main-dish-image';
                img.src = imageUrl;
                img.alt = "Today's Special: Peri-Peri Chicken Bowl";
                
                // Clear loader and insert image
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);
                return; // Success, exit the loop
            } else {
                throw new Error("Invalid response structure from image API.");
            }
        } catch (error) {
            console.error(`Attempt ${currentRetry + 1} failed:`, error);
            currentRetry++;
            if (currentRetry < maxRetries) {
                const delay = Math.pow(2, currentRetry) * 1000; // 2s, 4s, 8s
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // All retries failed, display an error message
                imageContainer.innerHTML = '<p class="text-red-600 text-center p-4">Could not load menu image.</p>';
                return;
            }
        }
    }
}

// --- Initialization ---
window.onload = function() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    showView('landing-view');
};
