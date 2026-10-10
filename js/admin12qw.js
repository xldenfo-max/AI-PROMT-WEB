import { auth, db } from "../firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const IMGBB_API_KEY = "c5e299237500f4c7b80c9e0a7b5f9cd0"; 

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const adminControls = document.getElementById('adminControls');
const uploadStatus = document.getElementById('uploadStatus');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let loadedPosts = [];

// Like Format Function (1k, 1M)
function formatLikes(count) {
    if (!count || isNaN(count)) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return count.toString();
}

// Authentication Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (loginSection) loginSection.classList.add('hidden');
        if (dashboardSection) dashboardSection.classList.remove('hidden');
        if (adminControls) adminControls.classList.remove('hidden');
        fetchAdminPosts();
    } else {
        if (loginSection) loginSection.classList.remove('hidden');
        if (dashboardSection) dashboardSection.classList.add('hidden');
        if (adminControls) adminControls.classList.add('hidden');
    }
});

// Admin Login Form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            if (errorDiv) errorDiv.classList.add('hidden');
        } catch (error) {
            if (errorDiv) {
                errorDiv.innerText = "Invalid Email or Password.";
                errorDiv.classList.remove('hidden');
            }
        }
    });
}

// Admin Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}

// Fetch Posts in Admin Panel
async function fetchAdminPosts() {
    const listDiv = document.getElementById('adminPostsList');
    if (!listDiv) return;

    try {
        const q = query(collection(db, "ai_posts"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        loadedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (loadedPosts.length === 0) {
            listDiv.innerHTML = '<p class="text-gray-400 text-center py-4">No uploaded posts found.</p>';
            return;
        }

        listDiv.innerHTML = '';
        loadedPosts.forEach(post => {
            const item = document.createElement('div');
            item.className = "flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-800/60 border border-gray-700/50 rounded-xl";
            item.innerHTML = `
                <div class="flex items-center gap-4 w-full sm:w-auto">
                    <img src="${post.imageUrl}" class="w-16 h-16 object-contain bg-gray-900 rounded-lg border border-gray-600">
                    <div>
                        <h4 class="font-bold text-white line-clamp-1">${post.title || 'Untitled'}</h4>
                        <div class="flex flex-wrap items-center gap-2 mt-1">
                            <span class="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">#${post.category}</span>
                            <span class="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"><i class="fa-solid fa-robot mr-1"></i>${post.aiTool || 'ChatGPT'}</span>
                            <span class="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20"><i class="fa-solid fa-heart mr-1"></i>${formatLikes(post.likes)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 w-full sm:w-auto justify-end">
                    <button onclick="editPost('${post.id}')" class="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-sm transition-colors">
                        <i class="fa-solid fa-pen-to-square mr-1"></i> Edit
                    </button>
                    <button onclick="deletePost('${post.id}')" class="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm transition-colors">
                        <i class="fa-solid fa-trash mr-1"></i> Delete
                    </button>
                </div>
            `;
            listDiv.appendChild(item);
        });
    } catch (err) {
        console.error(err);
        listDiv.innerHTML = '<p class="text-red-400 text-center py-4">Error loading posts.</p>';
    }
}

// Edit Post Handler
window.editPost = (id) => {
    const post = loadedPosts.find(p => p.id === id);
    if (!post) return;

    document.getElementById('editPostId').value = post.id;
    document.getElementById('promptTitle').value = post.title || '';
    document.getElementById('promptCategory').value = post.category || '';
    document.getElementById('aiTool').value = post.aiTool || 'ChatGPT';
    document.getElementById('promptText').value = post.promptText || '';
    document.getElementById('initialLikes').value = post.likes || 0;

    document.getElementById('formTitle').innerText = "Edit Prompt";
    document.getElementById('submitBtnText').innerText = "Update Prompt";
    
    const imageInput = document.getElementById('promptImage');
    if (imageInput) imageInput.required = false;

    const imageHelp = document.getElementById('imageHelp');
    if (imageHelp) imageHelp.classList.remove('hidden');

    if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', resetForm);
}

function resetForm() {
    const form = document.getElementById('uploadForm');
    if (form) form.reset();

    document.getElementById('editPostId').value = '';
    document.getElementById('formTitle').innerText = "Upload New Prompt";
    document.getElementById('submitBtnText').innerText = "Upload to Hub";

    const imageInput = document.getElementById('promptImage');
    if (imageInput) imageInput.required = true;

    const imageHelp = document.getElementById('imageHelp');
    if (imageHelp) imageHelp.classList.add('hidden');

    if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
    if (uploadStatus) uploadStatus.classList.add('hidden');
}

// Delete Post Handler
window.deletePost = async (id) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
        await deleteDoc(doc(db, "ai_posts", id));
        if (document.getElementById('editPostId').value === id) {
            resetForm();
        }
        fetchAdminPosts();
    } catch (err) {
        console.error("Delete error:", err);
        alert("Failed to delete prompt.");
    }
};

// ImgBB Upload Function
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (data.success) {
        return data.data.url;
    } else {
        throw new Error("ImgBB Upload Failed");
    }
}

// Form Submit Handler (Upload/Update)
const uploadForm = document.getElementById('uploadForm');
if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editPostId').value;
        const btn = document.getElementById('submitBtn');
        const fileInput = document.getElementById('promptImage');
        const file = fileInput ? fileInput.files[0] : null;

        if (btn) btn.disabled = true;
        if (uploadStatus) {
            uploadStatus.classList.remove('hidden');
            uploadStatus.className = "text-sm p-3 rounded-lg bg-blue-500/20 text-blue-400";
            uploadStatus.innerText = editId ? "Updating post..." : "Uploading image to ImgBB...";
        }

        try {
            let downloadURL = null;

            if (file) {
                downloadURL = await uploadToImgBB(file);
            }

            if (editId) {
                const updateData = {
                    title: document.getElementById('promptTitle').value,
                    category: document.getElementById('promptCategory').value,
                    aiTool: document.getElementById('aiTool').value,
                    promptText: document.getElementById('promptText').value,
                    likes: parseInt(document.getElementById('initialLikes').value) || 0,
                };
                if (downloadURL) updateData.imageUrl = downloadURL;

                await updateDoc(doc(db, "ai_posts", editId), updateData);
                if (uploadStatus) uploadStatus.innerText = "Successfully updated!";
            } else {
                if (!file) {
                    alert("Please select an image file.");
                    if (btn) btn.disabled = false;
                    return;
                }
                await addDoc(collection(db, "ai_posts"), {
                    title: document.getElementById('promptTitle').value,
                    category: document.getElementById('promptCategory').value,
                    aiTool: document.getElementById('aiTool').value,
                    promptText: document.getElementById('promptText').value,
                    imageUrl: downloadURL,
                    likes: parseInt(document.getElementById('initialLikes').value) || 0,
                    timestamp: serverTimestamp()
                });
                if (uploadStatus) uploadStatus.innerText = "Successfully uploaded!";
            }

            if (uploadStatus) uploadStatus.className = "text-sm p-3 rounded-lg bg-green-500/20 text-green-400";
            resetForm();
            fetchAdminPosts();

            setTimeout(() => {
                if (uploadStatus) uploadStatus.classList.add('hidden');
            }, 4000);

        } catch (error) {
            console.error("Error:", error);
            if (uploadStatus) {
                uploadStatus.className = "text-sm p-3 rounded-lg bg-red-500/20 text-red-400";
                uploadStatus.innerText = "Operation failed. Check ImgBB API key or Network connection.";
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    });
}
