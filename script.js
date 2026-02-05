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

    if (error) console.error(error);
    
    const feed = document.getElementById('foodFeed');
    feed.innerHTML = '';

    data.forEach(post => {
        const card = document.createElement('div');
        card.className = 'food-card';
        card.innerHTML = `
            <img src="${post.image}">
            <h3>${post.title}</h3>
            <p>Von: <strong>${post.profiles?.username || 'Anonym'}</strong></p>
            <button onclick="openChat('${post.user_id}', '${post.title}')">Anfragen</button>
        `;
        feed.appendChild(card);
    });
}

async function handleUpload(e) {
    e.preventDefault();
    
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        alert("Du musst eingeloggt sein, um etwas zu posten!");
        return;
    }

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!base64Image) {
        alert("Bitte erst ein Foto hochladen!");
        return;
    }

    const title = document.getElementById('titleInput').value;
    const category = document.getElementById('categorySelect').value;
    const remarks = document.getElementById('remarksInput').value;
    const expiry = document.getElementById('expiryInput').value;
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
        document.getElementById('previewContainer').innerHTML = '';
        document.getElementById('dropzone-text').style.display = 'block';
        loadPosts();
    }
});

loadPosts();



window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        document.getElementById('authOverlay').style.display = 'none';
        loadPosts();
    }
};

async function handleSignUp() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const username = document.getElementById('usernameInput').value;

   
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        alert("Registrierungs-Fehler: " + error.message);
        return;
    }

    if (data.user) {
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([
                { 
                    id: data.user.id, 
                    username: username 
                }
            ]);

        if (profileError) {
            console.error("Profil konnte nicht gespeichert werden:", profileError);
            alert("Fehler beim Profil-Speichern: " + profileError.message);
        } else {
            alert("Registrierung und Profil erfolgreich!");
        }
    }
}

async function handleSignIn() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) alert("Login fehlgeschlagen: " + error.message);
    else {
        document.getElementById('authOverlay').style.display = 'none';
        loadPosts();
    }
};
