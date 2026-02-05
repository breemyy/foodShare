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


async function loadFeed() {
    foodFeed.innerHTML = '<p>Lade leckeres Essen...</p>';
    
    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    foodFeed.innerHTML = '';
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'food-card';
        card.innerHTML = `
            <img src="${item.image}" alt="Essen">
            <div class="food-info">
                <h3>${item.title}</h3>
                <p><strong>Kategorie:</strong> ${item.category}</p>
                <p>${item.remarks || ''}</p>
                <p><small>Haltbar bis: ${item.expiry || 'k.A.'}</small></p>
            </div>
        `;
        foodFeed.appendChild(card);
    });
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
        loadFeed();
    }
});

loadFeed();



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

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) return alert("Fehler: " + error.message);
    
    
    if (data.user) {
        await supabaseClient.from('profiles').insert([{ id: data.user.id, username: username }]);
        alert("Account erstellt! Du kannst dich jetzt einloggen.");
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
}
