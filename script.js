/**
 * PEER-2-PEER PROJECT - UPDATED FOR CLOUDFLARE R2
 */

// --- 1. SIDEBAR TOGGLE LOGIC ---
const openNav = document.getElementById('openNav');
const closeNav = document.getElementById('closeNav');
const sideMenu = document.getElementById('side-menu');

openNav.onclick = () => sideMenu.style.width = "300px";
closeNav.onclick = () => sideMenu.style.width = "0";

// --- 2. AUTHENTICATION & UI ---
document.addEventListener('DOMContentLoaded', () => {
    const userName = localStorage.getItem('userName');
    const userType = localStorage.getItem('userType');
    const navRight = document.querySelector('.nav-right');

    if (userName && navRight) {
        navRight.innerHTML = `
            <span class="user-welcome" style="color:white; margin-right:10px;">Hi, ${userName}</span>
            <button onclick="logout()" style="background:none; border:1px solid white; color:white; cursor:pointer; padding:5px 10px; border-radius:5px;">Logout</button>
            <span id="openNavTrigger" style="margin-left:10px; cursor:pointer;">☰</span>
        `;
        document.getElementById('openNavTrigger').onclick = () => sideMenu.style.width = "300px";
    }
    checkAuth();
});

function checkAuth() {
    const dropZone = document.getElementById('drop-zone');
    const userName = localStorage.getItem('userName');
    if (!userName && dropZone) {
        dropZone.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p>Please login to share and upload study materials.</p>
                <a href="login.html" class="auth-btn login" style="display:inline-block; margin-top:10px; text-decoration:none;">Login to Upload</a>
            </div>`;
    }
}

function logout() {
    localStorage.clear(); 
    window.location.href = 'login.html';
}

// --- 3. UPDATED UPLOAD LOGIC FOR CLOUDFLARE ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const customFileName = document.getElementById('customFileName');

async function handleUpload(file) {
    const userName = localStorage.getItem('userName');
    if (!userName) return alert("Please login first!");

    const fileName = customFileName.value.trim() || file.name;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', fileName);
    formData.append('user', userName);

    try {
        // Change the URL to your Cloudflare Pages Function endpoint
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert("Upload successful!");
            window.location.href = "resources.html";
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error(error);
        alert("Upload failed. Check your Cloudflare R2 connection.");
    }
}

// --- 4. EVENT LISTENERS ---
if (dropZone && fileInput) {
    dropZone.onclick = () => { if(localStorage.getItem('userName')) fileInput.click(); };
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.border = "2px solid #4a90e2"; };
    dropZone.ondragleave = () => { dropZone.style.border = "2px dashed #ccc"; };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        if (localStorage.getItem('userName') && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };
    fileInput.onchange = () => { if (fileInput.files.length > 0) handleUpload(fileInput.files[0]); };
}