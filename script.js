const SUPABASE_URL = 'https://kdsshxteunozizxotibn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HJmiLsA5ijBt3_Io_9sJ7A_BdbjDC8a';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

const uploadForm = document.getElementById('uploadForm');
const foodFeed = document.getElementById('foodFeed');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');

let base64Image = "";

async function checkUserSession() {
    const authOverlay = document.getElementById('authOverlay');
    
    // 1. Session abfragen
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        console.log("Kein User - Login wird eingeblendet");
        if (authOverlay) authOverlay.style.display = 'flex';
    } else {
        console.log("User eingeloggt - lade Inhalte");
        if (authOverlay) authOverlay.style.display = 'none';
        
        // Funktionen nur ausführen, wenn sie existieren
        if (typeof loadPosts === "function") loadPosts();
        if (typeof loadHeaderProfilePicture === "function") loadHeaderProfilePicture();
    }
}

// Ausführen
checkUserSession();
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


//CHAT FUNKTION

let currentReceiverId = "";
let currentPostTitle = "";

async function openChat(receiverId, postTitle) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return alert("Logge dich ein, um zu chatten!");
    if (user.id === receiverId) return alert("Du kannst dir nicht selbst schreiben!");

    currentReceiverId = receiverId;
    currentPostTitle = postTitle;
    
    document.getElementById('chatTitle').innerText = "Anfrage: " + postTitle;
    document.getElementById('chatOverlay').style.display = 'flex';
    
    loadMessages();
}

function closeChat() {
    document.getElementById('chatOverlay').style.display = 'none';
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient.from('messages').insert([{
        sender_id: user.id,
        receiver_id: currentReceiverId,
        post_title: currentPostTitle,
        content: message
    }]);

    if (error) alert("Fehler beim Senden");
    else {
        input.value = "";
        loadMessages(); // Liste aktualisieren
    }
}

async function loadMessages() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // Holt alle Nachrichten zwischen diesen zwei Personen für dieses Essen
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${currentReceiverId}),and(sender_id.eq.${currentReceiverId},receiver_id.eq.${user.id})`)
        .eq('post_title', currentPostTitle)
        .order('created_at', { ascending: true });

    const chatBox = document.getElementById('chatMessages');
    chatBox.innerHTML = "";

    data?.forEach(msg => {
        const msgDiv = document.createElement('div');
        const isMe = msg.sender_id === user.id;
        
        msgDiv.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
        msgDiv.style.background = isMe ? '#2ecc71' : '#eee';
        msgDiv.style.color = isMe ? 'white' : 'black';
        msgDiv.style.padding = '8px 12px';
        msgDiv.style.borderRadius = '12px';
        msgDiv.style.maxWidth = '80%';
        msgDiv.innerText = msg.content;
        
        chatBox.appendChild(msgDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}
