const SUPABASE_URL = 'https://kdsshxteunozizxotibn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HJmiLsA5ijBt3_Io_9sJ7A_BdbjDC8a';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const uploadForm = document.getElementById('uploadForm');
const foodFeed = document.getElementById('foodFeed');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');

let base64Image = "";

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
        base64Image = reader.result;
        document.getElementById('previewContainer').innerHTML = `<img src="${base64Image}" style="width:100%; border-radius:10px;">`;
        document.getElementById('dropzone-text').style.display = 'none';
    };
    if (file) reader.readAsDataURL(file);
});

async function loadPosts() {
    const { data, error } = await supabaseClient
        .from('posts')
        .select(`
            *,
            profiles ( username )
        `);

    if (error) {
        console.error(error);
        return;
    }
    
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
                <button class="request-btn" onclick="openChat('${post.user_id}', '${post.title}')">
                    Anfragen
                </button>
            </div>
        </div>
    `;
    foodFeed.appendChild(card);
});
}


async function handleUpload(e) {
    e.preventDefault();
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        alert("Du musst eingeloggt sein, um etwas zu posten!");
        return;
    }

    if (!base64Image) {
        alert("Bitte erst ein Foto hochladen!");
        return;
    }

    const title = document.getElementById('titleInput').value;
    const category = document.getElementById('categorySelect').value;
    const remarks = document.getElementById('remarksInput').value;
    const expiryValue = document.getElementById('expiryInput').value;

    const { error } = await supabaseClient
        .from('posts')
        .insert([{ 
            title: title, 
            user_id: user.id,
            category: category, 
            remarks: remarks, 
            image: base64Image,
            expiry: expiryValue === "" ? null : expiryValue
        }]);

    if (error) {
        alert("Fehler: " + error.message);
    } else {
        alert("Erfolgreich geteilt!");
        uploadForm.reset();
        base64Image = ""; 
        document.getElementById('previewContainer').innerHTML = '';
        document.getElementById('dropzone-text').style.display = 'block';
        loadPosts();
    }
}


uploadForm.addEventListener('submit', handleUpload);


window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        document.getElementById('authOverlay').style.display = 'none';
        loadPosts();
    }
};

async function handleSignUp() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const username = document.getElementById('usernameInput').value.trim();

    if (!email || !password || !username) {
        alert("Bitte alle Felder ausfüllen!");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { username: username }
        }
    });

    if (error) {
        alert("Registrierungs-Fehler: " + error.message);
    } else {
        alert("Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
    }
}
    
async function handleSignIn() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Login fehlgeschlagen: " + error.message);
    } else {
        document.getElementById('authOverlay').style.display = 'none';
        loadPosts();
    }
}

async function updateProfileCircle() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

        if (profile?.avatar_url) {
            document.getElementById('userPfp').src = profile.avatar_url;
        }
    }
}

function goToProfile() {
    window.location.href = 'profile.html';
}

async function uploadPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    const filePath = `${user.id}-${Math.random()}.png`; 
    const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) return alert("Fehler: " + uploadError.message);

    const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);

    await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    
    document.getElementById('profileDisplay').src = publicUrl;
    alert("Profilbild aktualisiert!");
}

async function handleSignOut() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

async function loadHeaderProfilePicture() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

       
        if (profile && profile.avatar_url) {
            const headerPfp = document.getElementById('userPfp');
            if (headerPfp) {
                headerPfp.src = profile.avatar_url;
            }
        }
    }
}


document.addEventListener('DOMContentLoaded', loadHeaderProfilePicture);

async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        const authOverlay = document.getElementById('authOverlay');
        if (authOverlay) {
            authOverlay.style.display = 'none'; 
        }
        loadPosts(); 
        loadHeaderProfilePicture(); 
    } else {
        document.getElementById('authOverlay').style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', checkUserSession);
