const SUPABASE_URL = 'https://kdsshxteunozizxotibn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HJmiLsA5ijBt3_Io_9sJ7A_BdbjDC8a';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});


let currentReceiverId = null;
let currentPostTitle = "";

const uploadForm = document.getElementById('uploadForm');
const foodFeed = document.getElementById('foodFeed');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');

let base64Image = "";

async function checkUserSession() {
    const authOverlay = document.getElementById('authOverlay');
    
    // Wir holen uns die Session
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error || !session) {
        console.log("Kein User - zeige Login");
        if (authOverlay) authOverlay.style.display = 'flex';
    } else {
        console.log("User eingeloggt");
        if (authOverlay) authOverlay.style.display = 'none';
        
        // Erst jetzt laden wir die Daten
        if (typeof loadPosts === "function") loadPosts();
        if (typeof loadHeaderProfilePicture === "function") loadHeaderProfilePicture();
        if (typeof checkUnreadMessages === "function") checkUnreadMessages();
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

async function loadPosts(searchTerm = "", category = "Alles") {
    const foodFeed = document.getElementById('foodFeed');
    if (!foodFeed) return;
  
    foodFeed.style.display = 'flex';
    foodFeed.style.justifyContent = 'center';
    foodFeed.style.alignItems = 'center';
    foodFeed.style.minHeight = '300px'; // Damit es nicht ganz oben klebt
    
    foodFeed.innerHTML = `
        <div style="text-align:center;">
            <span style="font-size: 3rem; display: block; margin-bottom: 10px; animation: bounce 1s infinite;">🍲</span>
            <p style="font-weight:bold; color:#2ecc71; margin:0;">Leckeres Essen wird geladen...</p>
        </div>
    `;
    let query = supabaseClient
        .from('posts')
        .select(`*, profiles ( username )`);

    // Filter 1: Textsuche (Titel)
    if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
    }

    // Filter 2: Kategorie (wenn nicht "Alles" gewählt ist)
    if (category !== "Alles") {
        query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Fehler beim Laden der Posts:", error);
        foodFeed.innerHTML = '<p>Fehler beim Laden der Speisen.</p>';
        return;
    }
    
    foodFeed.style.display = 'grid'; // Oder 'block', je nach deinem CSS
    foodFeed.innerHTML = '';

    if (data.length === 0) {
        foodFeed.innerHTML = '<p style="text-align:center;">Aktuell gibt es leider kein Essen in deiner Nähe.</p>';
        return;
    }

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

async function openChat(receiverId, postTitle) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return alert("Logge dich ein, um zu chatten!");
    if (user.id === receiverId) return alert("Du kannst dir nicht selbst schreiben!");

    currentReceiverId = receiverId;
    currentPostTitle = postTitle;
    
    document.getElementById('chatTitle').innerText = "Anfrage: " + postTitle;
    document.getElementById('chatOverlay').style.display = 'flex';

    try {
        await markAsRead(receiverId, postTitle);
    } catch (e) {
        console.warn("Konnte Nachrichten nicht als gelesen markieren.");
    }
    
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
    if (!user || !currentReceiverId) return;

    // Holt alle Nachrichten zwischen mir und dem Partner, die diesen Post betreffen
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${currentReceiverId}),and(sender_id.eq.${currentReceiverId},receiver_id.eq.${user.id})`)
        .eq('post_title', currentPostTitle)
        .order('created_at', { ascending: true });

    if (error) return console.error("Fehler beim Laden:", error);

    const chatBox = document.getElementById('chatMessages');
    chatBox.innerHTML = "";

    data.forEach(msg => {
        const isMe = msg.sender_id === user.id;
        const msgDiv = document.createElement('div');
        
        msgDiv.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
        msgDiv.style.background = isMe ? '#2ecc71' : '#ffffff';
        msgDiv.style.color = isMe ? 'white' : '#333';
        msgDiv.style.padding = '10px 15px';
        msgDiv.style.borderRadius = '15px';
        msgDiv.style.border = isMe ? 'none' : '1px solid #eee';
        msgDiv.style.maxWidth = '75%';
        msgDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        
        // Nachrichtentext + Uhrzeit klein drunter
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgDiv.innerHTML = `
            <div style="font-size: 1rem;">${msg.content}</div>
            <div style="font-size: 0.7rem; text-align: right; margin-top: 4px; opacity: 0.8;">${time}</div>
        `;
        
        chatBox.appendChild(msgDiv);
    });

    // Immer nach ganz unten scrollen
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function loadChatOverview() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Alle Nachrichten laden, an denen ich beteiligt bin
    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

    const chatList = document.getElementById('chatList');
    chatList.innerHTML = "";

    if (messages.length === 0) {
    chatList.innerHTML = `
        <div style="text-align:center; margin-top: 50px; color: #ccc;">
            <span style="font-size: 50px;">✉️</span>
            <p>Noch keine Nachrichten.<br>Frag doch mal jemanden an!</p>
        </div>`;
    return;
    }

    // Chats gruppieren (nach Gesprächspartner + Post)
    const chats = {};
    messages.forEach(m => {
        const partnerId = (m.sender_id === user.id) ? m.receiver_id : m.sender_id;
        const chatKey = partnerId + "_" + m.post_title;
        
        if (!chats[chatKey]) {
            chats[chatKey] = {
                partnerId: partnerId,
                lastMessage: m.content,
                postTitle: m.post_title,
                unread: (m.receiver_id === user.id && !m.is_read),
                timestamp: m.created_at
            };
        }
    });

    for (const key in chats) {
        const chat = chats[key];
        
        // Zeit formatieren (Heute nur Uhrzeit, sonst Datum)
        const msgDate = new Date(chat.timestamp);
        const isToday = msgDate.toDateString() === new Date().toDateString();
        const timeString = isToday 
            ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : msgDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', chat.partnerId)
            .single();

        const item = document.createElement('div');
        item.className = 'chat-item';
        item.onclick = () => {
              console.log("Öffne Chat mit:", chat.partnerId); // Test für die Konsole
              openChat(chat.partnerId, chat.postTitle);
        };
        
        item.innerHTML = `
            <img src="${profile?.avatar_url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKsAAACUCAMAAADbGilTAAAASFBMVEXp7e6vsrvt8fGrrrjEyMzp7eysr7fo7O+3usKusLvi5ujr7/Kvsrmytb3c4OLY3ODHytLV2N/Mz9S9wMjS1tnp7PO/wsbi5etrA41bAAADKklEQVR4nO2aC5KkIAxABeWjiCgyev+bLvb0TttOK860QHYr7wSvUgkJhKJAEARBEARBEARBEARBEARBEORfgXpyO5xCNMb2vXWmKVTBWG6dXahqrGx5eYOMtskttIMPIS0qzWtyo/YQXSkKMbKMqUGX5JlSO4iulPZ/Y/qEBVdmrPh4rUq4ze22hSnLX5kumdvnlttAzZ6qlzUFqKQV+mUCfKJBHQZ0NwM+s0DlFlwxy/bAlUiRW3DFcGRKSOtyCz5Q41EKEM7H3IYPhDyOK9G5DR802976LQngTDFdeVhafi4wUKZDasKuUI5YOgRd4YxbJ+IKxrUL1RbvwLjOAVV/DkDpXELIg8llQeZWXHE4usCat5UJpECX23CFmA4PghFKti4cXQs8BtL8WtBpX7acoDStT1ij91Rr3YAKq7/H7pcXpMJaYIUaXjcv3oF7zPAH18C/52zNDUBVxtQ8bp5eWj7Oub32EFauEoFzaRXAqN5RwknuU6GuScmlAXYAbKFUdM5W1nYCbkgfeEelYEd0DYNyFfxfoE/ktnnNosXE3Llq9EjPOFbWdY0QwDKCFsK4XuplW/TVvNp62RzpsXJGgKk0WgyVJPwmuelbbbu0BCLH4QNAQihh/J0gcDX0MyyfjCjy+S7bt8bK42vhajaQ1vexPNngh5UPbxp4cVnLEj8fZMpcMZDzpvdUIIap9FsZ2kxlOE+31LyaaeojjAbfhXaZ014VWeFebzTD+FIcVMrIUvfDRH3GJUwDaspfRvUe23SXMNrtPgacRKe7hh2vs84ENtXCi9rQM3aY0iVqCu9mgKfVSVype191Ka8UroHl60nKMUVgm9Dy9RS1TLD2DL23n4TrFM+H9q028EWZYt9RXaJKeJXA9ZJ0vbWD6NUl2mtygNQi+namu+LEWiijFxd17zfYu+sQe9ii1VWuvI/syuhFpeVdp8i1xcRbF4IndOzaaq5zjf65aLjqGFhGrbhJcPzJ8YeuLnJx9dflAIndZafrVPkUV7UJ/Wz5CXKO+rTVkfI6dNzXoqa6ksiHFr2SuKoIgiAIgiAIgiAIgiAIgiAIgpzkD93kIp5StnC6AAAAAElFTkSuQmCC'}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">
            <div class="chat-info">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4>${profile?.username || 'Anonym'}</h4>
                    <span class="chat-time">${timeString}</span>
                </div>
                <p><strong>${chat.postTitle}:</strong> ${chat.lastMessage.substring(0, 30)}...</p>
            </div>
            ${chat.unread ? '<span class="unread-badge"></span>' : ''}
        `;
        chatList.appendChild(item);
    }
}

async function markAsRead(senderId, postTitle) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        await supabaseClient
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', user.id)
            .eq('sender_id', senderId)
            .eq('post_title', postTitle);
        
        // Aktualisiert den roten Punkt
        if (typeof checkUnreadMessages === "function") checkUnreadMessages();
    } catch (err) {
        console.error("Fehler beim Markieren als gelesen:", err);
    }
}

async function checkUnreadMessages() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { count, error } = await supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

    if (error) return console.error(error);

    const dot = document.getElementById('unreadDot');
    if (dot) {
        dot.style.display = (count > 0) ? 'block' : 'none';
    }
}

// Intervall starten, damit der Punkt auch erscheint, wenn man nicht neu lädt
setInterval(checkUnreadMessages, 10000); // Alle 10 Sekunden prüfen

/////////////////////////////////////
////////////SUCHFUNKTION/////////////
/////////////////////////////////////

let currentCategory = 'Alles';
let searchTimeout;

// 1. Funktion für die Texteingabe (Searchbar)
const searchBar = document.getElementById('searchBar');
if (searchBar) {
    searchBar.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadPosts(searchBar.value, currentCategory);
        }, 400);
    });
}

document.querySelectorAll('.cat-badge').forEach(badge => {
    badge.addEventListener('click', function() {
        // 1. Optisches Feedback
        document.querySelectorAll('.cat-badge').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // 2. Text bereinigen
        // Wir entfernen Emojis und nehmen den reinen Text
        let rawText = this.innerText;
        
        // Spezialfall: Wenn Emojis drin sind, schneiden wir sie ab oder mappen sie
        let categoryToSearch = rawText;
        if (rawText.includes("🍎")) categoryToSearch = "Obst & Gemüse";
        if (rawText.includes("🍞")) categoryToSearch = "Backwaren";
        if (rawText.includes("🥛")) categoryToSearch = "Kühlregal";
        if (rawText.includes("🥫")) categoryToSearch = "Vorrat";
        if (rawText.includes("🍫")) categoryToSearch = "Snacks & Süßwaren";
        if (rawText.includes("🍽️")) categoryToSearch = "Sonstiges";
        if (rawText === "Alles") categoryToSearch = "Alles";

        currentCategory = categoryToSearch;
        
        // Suche neu ausführen
        const term = document.getElementById('searchBar').value;
        loadPosts(term, currentCategory);
    });
});



/////////////////////////////////////////
///////////////SETTINGS//////////////////
/////////////////////////////////////////

// Sicherstellen, dass der Code erst läuft, wenn alles geladen ist
document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settingsBtn');
    const drawer = document.getElementById('settingsDrawer');
    const overlay = document.getElementById('drawerOverlay');

    if (settingsBtn && drawer && overlay) {
        settingsBtn.addEventListener('click', () => {
            console.log("Zahnrad geklickt!"); // Teste das in der Konsole (F12)
            drawer.classList.add('open');
            overlay.style.display = 'block';
        });
    } else {
        console.error("Einstellungen-Elemente nicht gefunden!");
    }
});

function closeSettings() {
    document.getElementById('settingsDrawer').classList.remove('open');
    document.getElementById('drawerOverlay').style.display = 'none';
}
// 1. Username ändern per Prompt (einfachste Lösung)
async function changeUsername() {
    const newName = prompt("Gib deinen neuen Usernamen ein:");
    if (!newName) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    const { error } = await supabaseClient
        .from('profiles')
        .update({ username: newName })
        .eq('id', user.id);

    if (!error) {
        document.getElementById('usernameDisplay').innerText = newName;
        showPopup("Username erfolgreich geändert!");
    }
}

// 2. Passwort Reset E-Mail
async function requestPasswordReset() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { error } = await supabaseClient.auth.resetPasswordForEmail(user.email);
    
    if (!error) {
        showPopup("Check deine E-Mails zum Zurücksetzen! 📧");
    }
}

// 3. Darkmode Toggle
function toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle').checked;
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
}
