const SUPABASE_URL = 'https://kdsshxteunozizxotibn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HJmiLsA5ijBt3_Io_9sJ7A_BdbjDC8a';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const uploadForm = document.getElementById('uploadForm');
const foodFeed = document.getElementById('foodFeed');
const authOverlay = document.getElementById('authOverlay');

let base64Image = "";

// ==========================================
// 1. ZENTRALE AUTH-STEUERUNG
// ==========================================
async function initApp() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        console.log("Session aktiv.");
        if (authOverlay) authOverlay.style.display = 'none';
        
        // Daten erst laden, wenn wir sicher eingeloggt sind
        loadPosts();
        loadHeaderProfilePicture();
    } else {
        console.log("Keine Session.");
        if (authOverlay) authOverlay.style.display = 'flex';
    }
}

// Starte die App sofort beim Laden
document.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// 2. PROFILBILD IM HEADER LADEN
// ==========================================
async function loadHeaderProfilePicture() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

    const headerPfp = document.getElementById('userPfp');
    if (headerPfp && profile?.avatar_url) {
        headerPfp.src = profile.avatar_url;
        
        headerPfp.style.width = "45px";
        headerPfp.style.height = "45px";
        headerPfp.style.borderRadius = "50%";
        headerPfp.style.objectFit = "cover";
    }
}

// ==========================================
// 3. POSTS LADEN
// ==========================================
async function loadPosts() {
    if (!foodFeed) return;

    const { data, error } = await supabaseClient
        .from('posts')
        .select(`*, profiles ( username )`)
        .order('created_at', { ascending: false }); // Neueste zuerst

    if (error) return console.error(error);
    
    foodFeed.innerHTML = '';

    data.forEach(post => {
        const card = document.createElement('div');
        card.className = 'food-card';
        const expiryDate = post.expiry ? new Date(post.expiry).toLocaleDateString('de-DE') : 'k.A.';

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${post.image}" class="food-img">
                <span class="category-badge">${post.category || 'Food'}</span>
            </div>
            <div class="card-content">
                <div class="card-header">
                    <h3>${post.title}</h3>
                    <p class="remarks">${post.remarks || 'Keine weiteren Angaben'}</p>
                </div>
                <div class="card-footer">
                    <div class="user-info">
                        <span>⏳ ${expiryDate}</span>
                        <span>👤 ${post.profiles?.username || 'Anonym'}</span>
                    </div>
                    <button class="request-btn" onclick="openChat('${post.user_id}', '${post.title}')">Anfragen</button>
                </div>
            </div>
        `;
        foodFeed.appendChild(card);
    });
}

// ==========================================
// 4. LOGIN / SIGNUP LOGIK
// ==========================================
async function handleSignIn() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Login fehlgeschlagen: " + error.message);
    } else {
        location.reload(); // Seite neu laden, um initApp zu triggern
    }
}

async function handleSignUp() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const username = document.getElementById('usernameInput').value.trim();

    const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { username } }
    });

    if (error) alert("Fehler: " + error.message);
    else alert("Check deine E-Mails zur Bestätigung!");
}

async function handleSignOut() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// ==========================================
// 5. PROFILFUNKTIONEN
// ==========================================
function goToProfile() {
    window.location.href = 'profile.html';
}

async function uploadPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    // Cache-Busting durch Zufallszahl im Namen
    const filePath = `avatars/${user.id}-${Date.now()}.png`;

    const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) return alert("Upload-Fehler: " + uploadError.message);

    const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);

    await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    
    // UI Update
    const display = document.getElementById('profileDisplay');
    if (display) display.src = publicUrl;
    alert("Profilbild aktualisiert!");
    loadHeaderProfilePicture();
}

// ==========================================
// 6. UPLOAD FORMULAR FÜR POSTS
// ==========================================
if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user || !base64Image) return alert("Bitte Foto und Login prüfen!");

        const { error } = await supabaseClient.from('posts').insert([{ 
            title: document.getElementById('titleInput').value, 
            user_id: user.id,
            category: document.getElementById('categorySelect').value, 
            remarks: document.getElementById('remarksInput').value, 
            image: base64Image,
            expiry: document.getElementById('expiryInput').value || null
        }]);

        if (error) alert(error.message);
        else {
            alert("Erfolgreich geteilt!");
            location.reload();
        }
    });
}
