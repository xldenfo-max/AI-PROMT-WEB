import { db } from "../firebase-config.js";
import { collection, getDocs, doc, updateDoc, increment, query, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const CATEGORIES = ["All", "Gaming", "Love & Romance", "Sci-Fi & Cyberpunk", "Anime & Fantasy", "Photorealistic", "Nature & Landscapes", "3D & Concept Art"];

// Real AI Logos (SVG / PNG Icons)
const TOOL_ICONS = {
    'ChatGPT': '<img src="https://cdn.worldvectorlogo.com/logos/chatgpt-6.svg" class="w-4 h-4 object-contain" alt="ChatGPT">',
    'Gemini': '<img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a61134.svg" class="w-4 h-4 object-contain" alt="Gemini">',
    'Midjourney': '<img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Midjourney_Emblem.png" class="w-4 h-4 object-contain" alt="Midjourney">',
    'DALL·E 3': '<img src="https://cdn.worldvectorlogo.com/logos/openai-2.svg" class="w-4 h-4 object-contain" alt="DALL-E">',
    'Leonardo AI': '<img src="https://cdn.worldvectorlogo.com/logos/leonardo-ai.svg" class="w-4 h-4 object-contain" alt="Leonardo">',
    'Stable Diffusion': '<img src="https://stability.ai/favicon.ico" class="w-4 h-4 object-contain" alt="Stable Diffusion">',
    'Claude': '<img src="https://upload.wikimedia.org/wikipedia/commons/7/70/Claude_AI_logo.svg" class="w-4 h-4 object-contain" alt="Claude">'
};

let allPrompts = [];
let filteredPrompts = [];
let selectedCategory = "All";
let currentPage = 1;
const itemsPerPage = 9;


function formatLikes(count) {
    if (!count || isNaN(count)) return '0';
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function renderCategories() {
    const container = document.getElementById('categoryContainer');
    if (!container) return;
    container.innerHTML = '';

    CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        const isActive = selectedCategory === cat;
        
        btn.className = `px-5 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-200 shadow-sm ${
            isActive 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105' 
                : 'bg-white/80 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-blue-100'
        }`;
        btn.innerText = cat === "All" ? "✨ All Prompts" : `# ${cat}`;
        
        btn.onclick = () => {
            selectedCategory = cat;
            renderCategories();
            applyFilters();
        };
        container.appendChild(btn);
    });
}

async function fetchPrompts() {
    const promptsGrid = document.getElementById('promptsGrid');
    try {
        const q = query(collection(db, "ai_posts"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        allPrompts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFilters();
    } catch (error) {
        console.error("Error fetching prompts: ", error);
        if (promptsGrid) {
            promptsGrid.innerHTML = `<div class="col-span-full text-center text-red-500 py-12 glass-card rounded-2xl">Error loading prompts.</div>`;
        }
    }
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    filteredPrompts = allPrompts.filter(p => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch = (p.title && p.title.toLowerCase().includes(searchTerm)) ||
                              (p.promptText && p.promptText.toLowerCase().includes(searchTerm));
        return matchesCategory && matchesSearch;
    });

    renderPage(1);
}

function renderPage(page) {
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredPrompts.slice(start, end);

    renderPrompts(pageItems);
    renderPagination();
    checkUrlParamAndScroll();
}

function renderPrompts(prompts) {
    const promptsGrid = document.getElementById('promptsGrid');
    if (!promptsGrid) return;
    promptsGrid.innerHTML = '';

    if (prompts.length === 0) {
        promptsGrid.innerHTML = `
            <div class="col-span-full text-center text-slate-500 py-16 glass-card rounded-2xl">
                <i class="fa-solid fa-folder-open text-4xl mb-3 text-blue-300"></i>
                <p class="font-medium">No prompts found matching your criteria.</p>
            </div>`;
        return;
    }

    let likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}');

    prompts.forEach((prompt, index) => {
        const card = document.createElement('div');
        card.id = `prompt-card-${prompt.id}`;
        card.className = "glass-card rounded-2xl overflow-hidden group flex flex-col h-full hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border border-blue-100 animate-card";
        card.style.animationDelay = `${index * 0.08}s`;

        const cleanTitle = escapeHTML(prompt.title || '');
        const cleanCategory = escapeHTML(prompt.category || '');
        const cleanPromptText = escapeHTML(prompt.promptText || '');
        const toolName = prompt.aiTool || 'ChatGPT';
        const toolIcon = TOOL_ICONS[toolName] || '<i class="fa-solid fa-robot text-blue-500"></i>';

        const isLiked = likedPosts[prompt.id] === true;
        const heartClass = isLiked ? "text-red-500" : "text-slate-400";

        card.innerHTML = `

            <div class="relative overflow-hidden aspect-[4/3] max-h-48 cursor-pointer bg-slate-900/5 flex items-center justify-center p-2" onclick="openModal('${prompt.imageUrl}')">
                <img src="${prompt.imageUrl}" alt="${cleanTitle}" class="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500 rounded-lg">
                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-blue-700 shadow-sm border border-blue-100">
                    #${cleanCategory}
                </div>
            </div>
            
            <div class="p-5 flex flex-col flex-grow">
                <h3 class="text-base font-bold mb-2 text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">${cleanTitle}</h3>
                
                <div class="bg-blue-50/60 border border-blue-100/80 rounded-xl p-3 flex-grow mb-3 relative overflow-y-auto max-h-28 hide-scrollbar">
                    <p class="text-slate-600 text-xs italic font-mono leading-relaxed" id="prompt-text-${prompt.id}">${cleanPromptText}</p>
                </div>

                <!-- Recommended AI Tool Badge (Real AI Logo සහිතව) -->
                <div class="flex items-center gap-1.5 mb-4 text-xs font-semibold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-md w-fit border border-slate-200/60">
                    ${toolIcon}
                    <span>${toolName}</span>
                </div>

                <div class="flex justify-between items-center border-t border-slate-100 pt-3 mt-auto">
                    <button onclick="handleLike('${prompt.id}')" class="flex items-center gap-1.5 ${heartClass} hover:text-red-500 transition-colors py-1 px-2.5 rounded-lg hover:bg-red-50" id="like-btn-${prompt.id}">
                        <i class="fa-solid fa-heart text-sm"></i>
                        <span id="like-count-${prompt.id}" class="text-xs font-bold text-slate-700">${formatLikes(prompt.likes)}</span>
                    </button>
                    <div class="flex gap-1">
                        <button onclick="handleCopy('${prompt.id}')" class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Copy Prompt">
                            <i class="fa-regular fa-copy text-sm"></i>
                        </button>
                        <button onclick="handleShare('${prompt.id}', '${cleanTitle}')" class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Share Prompt">
                            <i class="fa-solid fa-share-nodes text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        promptsGrid.appendChild(card);
    });
}

function renderPagination() {
    const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.className = `px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${
            i === currentPage 
                ? 'bg-blue-600 text-white scale-105 shadow-blue-500/25' 
                : 'bg-white text-slate-600 hover:bg-blue-50 border border-blue-100'
        }`;
        btn.onclick = () => renderPage(i);
        paginationContainer.appendChild(btn);
    }
}

window.handleLike = async (id) => {
    let likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}');
    const countSpan = document.getElementById(`like-count-${id}`);
    const btn = document.getElementById(`like-btn-${id}`);
    
    const promptItem = allPrompts.find(p => p.id === id);
    if (!promptItem) return;

    if (typeof promptItem.likes !== 'number') {
        promptItem.likes = 0;
    }

    let change = 0;
    if (likedPosts[id]) {
        likedPosts[id] = false;
        promptItem.likes = Math.max(0, promptItem.likes - 1);
        change = -1;
        if (btn) {
            btn.classList.remove("text-red-500");
            btn.classList.add("text-slate-400");
        }
    } else {
        likedPosts[id] = true;
        promptItem.likes += 1;
        change = 1;
        if (btn) {
            btn.classList.remove("text-slate-400");
            btn.classList.add("text-red-500");
        }
    }

    localStorage.setItem('liked_posts', JSON.stringify(likedPosts));
    
    if (countSpan) {
        countSpan.innerText = formatLikes(promptItem.likes);
    }

    try {
        const promptRef = doc(db, "ai_posts", id);
        await updateDoc(promptRef, { likes: increment(change) });
    } catch (error) {
        console.error("Error updating likes:", error);
    }
};

window.handleCopy = (id) => {
    const textElem = document.getElementById(`prompt-text-${id}`);
    if (textElem) {
        navigator.clipboard.writeText(textElem.innerText).then(() => showToast("Prompt Copied to Clipboard!"));
    }
};

window.handleShare = async (id, title) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const promptLink = `${baseUrl}?id=${id}`;

    if (navigator.share) {
        try {
            await navigator.share({ title: title, text: 'Check out this AI prompt!', url: promptLink });
        } catch (err) {
            console.log('Error sharing:', err);
        }
    } else {
        navigator.clipboard.writeText(promptLink).then(() => showToast("Direct Prompt Link Copied!"));
    }
};

function checkUrlParamAndScroll() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id');
    if (!targetId) return;

    const card = document.getElementById(`prompt-card-${targetId}`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-card');
        setTimeout(() => { card.classList.remove('highlight-card'); }, 3500);
    }
}

window.openModal = (url) => {
    const modalImg = document.getElementById('modalImg');
    const imageModal = document.getElementById('imageModal');
    if (modalImg && imageModal) {
        modalImg.src = url;
        imageModal.classList.remove('hidden');
    }
};

window.closeModal = () => {
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.classList.add('hidden');
    }
};

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
        toastMsg.innerText = message;
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => { toast.classList.add('translate-y-20', 'opacity-0'); }, 2500);
    }
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
}

renderCategories();
fetchPrompts();
