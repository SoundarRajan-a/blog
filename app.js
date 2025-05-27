// Initialize Appwrite
const client = new Appwrite.Client();
const account = new Appwrite.Account(client);
const database = new Appwrite.Databases(client);
const ID = Appwrite.ID;

// Appwrite Configuration - Replace with your details
const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = '6835f8490033b8ca51d2';
const DATABASE_ID = '6835f95600054595bc9f';
const COLLECTION_ID = '6835f98f003728c421d3';

client
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const createPostContainer = document.getElementById('createPostContainer');
const loginContainer = document.getElementById('loginContainer');
const registerContainer = document.getElementById('registerContainer');
const showPostsBtn = document.getElementById('showPostsBtn');
const createPostBtn = document.getElementById('createPostBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const postForm = document.getElementById('postForm');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Event Listeners
showPostsBtn.addEventListener('click', () => {
    showView(postsContainer);
    loadPosts();
});

createPostBtn.addEventListener('click', () => {
    showView(createPostContainer);
});

loginBtn.addEventListener('click', () => {
    showView(loginContainer);
});

logoutBtn.addEventListener('click', logout);

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showView(registerContainer);
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginContainer);
});

postForm.addEventListener('submit', createPost);
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);

// Initialize App
document.addEventListener('DOMContentLoaded', initializeApp);

// Core Functions
async function initializeApp() {
    try {
        await checkAuthStatus();
        await loadPosts();
    } catch (error) {
        console.error("Initialization error:", error);
        showError(postsContainer, "Failed to initialize application");
    }
}

function showView(element) {
    document.querySelectorAll('.container').forEach(container => {
        container.style.display = 'none';
    });
    element.style.display = 'block';
}

async function checkAuthStatus() {
    try {
        const user = await account.get();
        updateUIForAuth(true);
        return user;
    } catch (error) {
        updateUIForAuth(false);
        return null;
    }
}

function updateUIForAuth(isLoggedIn) {
    loginBtn.style.display = isLoggedIn ? 'none' : 'block';
    logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
    createPostBtn.style.display = isLoggedIn ? 'block' : 'none';
    
    if (!isLoggedIn && createPostContainer.style.display === 'block') {
        showView(postsContainer);
    }
}

async function loadPosts() {
    try {
        postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
        
        const response = await database.listDocuments(
            DATABASE_ID, 
            COLLECTION_ID,
            [
                Appwrite.Query.orderDesc('$createdAt')
            ]
        );
        
        if (response.documents.length === 0) {
            postsContainer.innerHTML = '<div class="post">No posts found. Be the first to create one!</div>';
            return;
        }
        
        displayPosts(response.documents);
    } catch (error) {
        console.error("Error loading posts:", error);
        showError(postsContainer, "Failed to load posts. Please try again later.");
    }
}

function displayPosts(posts) {
    postsContainer.innerHTML = '';
    
    posts.forEach(post => {
        const postDate = new Date(post.$createdAt).toLocaleString();
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content}</p>
            <p class="meta">Posted by ${post.user_name} on ${postDate}</p>
        `;
        postsContainer.appendChild(postElement);
    });
}

async function createPost(e) {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    
    if (!title || !content) {
        alert('Please fill in both title and content');
        return;
    }
    
    try {
        const user = await account.get();
        
        // Show loading state
        const submitBtn = postForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        const response = await database.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            {
                title,
                content,
                user_id: user.$id,
                user_name: user.name
            },
            [
                // Set permission so only the creator can modify this document
                `user:${user.$id}`
            ]
        );
        
        postForm.reset();
        showView(postsContainer);
        await loadPosts();
    } catch (error) {
        console.error("Error creating post:", error);
        alert(`Failed to create post: ${error.message}`);
    } finally {
        const submitBtn = postForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    try {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        await account.createEmailSession(email, password);
        loginForm.reset();
        updateUIForAuth(true);
        showView(postsContainer);
        await loadPosts();
    } catch (error) {
        console.error("Login error:", error);
        alert(`Login failed: ${error.message}`);
    } finally {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    
    if (!name || !email || !password) {
        alert('Please fill all registration fields');
        return;
    }
    
    try {
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        
        // Create account
        await account.create(ID.unique(), email, password, name);
        
        // Login immediately after registration
        await account.createEmailSession(email, password);
        
        registerForm.reset();
        updateUIForAuth(true);
        showView(postsContainer);
        await loadPosts();
    } catch (error) {
        console.error("Registration error:", error);
        alert(`Registration failed: ${error.message}`);
    } finally {
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
}

async function logout() {
    try {
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Logging out...';
        
        await account.deleteSession('current');
        updateUIForAuth(false);
        showView(postsContainer);
        await loadPosts();
    } catch (error) {
        console.error("Logout error:", error);
        alert(`Logout failed: ${error.message}`);
    } finally {
        logoutBtn.disabled = false;
        logoutBtn.textContent = 'Logout';
    }
}

function showError(container, message) {
    container.innerHTML = `
        <div class="error">
            <p>${message}</p>
            <button onclick="location.reload()">Refresh Page</button>
        </div>
    `;
}
