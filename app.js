/**
 * ROOK PLATFORMU - TAM SÜRÜM (Faz 9+)
 * Özellikler: Yeni Oyunlar, Günlük Skor, Çift Modlu Chatbot, Markdown/HTML Editör
 * Firebase Proje: biftek-app
 */

// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, updateDoc, 
    query, where, serverTimestamp, orderBy, limit, deleteDoc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// ⚙️ FIREBASE YAPILANDIRMASI
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCzZfidhz7rcyTNu_oPuvDARaUDiifDA6c",
  authDomain: "biftek-app.firebaseapp.com",
  projectId: "biftek-app",
  storageBucket: "biftek-app.firebasestorage.app",
  messagingSenderId: "107523968872",
  appId: "1:107523968872:web:a8ca9af8b147050c1e50dd",
  measurementId: "G-4L56GFRJBF"
};

let auth, db;
try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("✅ Rook Firebase Bağlantısı Başarılı (Proje: biftek-app)");
} catch (e) { 
    console.error("❌ Firebase Hatası:", e); 
    alert("Firebase bağlantısında hata oluştu. Konsolu kontrol edin.");
}

const provider = new GoogleAuthProvider();
let currentUser = null;
let currentArticleId = null;

// --- DOM ELEMENTS ---
const elements = {
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg'),
    newsGrid: document.getElementById('news-grid'),
    views: {
        home: document.getElementById('home-view'),
        article: document.getElementById('article-view'),
        writer: document.getElementById('writer-panel'),
        admin: document.getElementById('admin-panel'),
        games: document.getElementById('games-view')
    },
    authButtons: document.getElementById('auth-buttons'),
    userMenu: document.getElementById('user-menu'),
    profileDropdown: document.getElementById('profile-dropdown'),
    chatbotWindow: document.getElementById('chatbot-window'),
    gameArea: document.getElementById('game-area')
};

// --- UI HELPERS ---
const UI = {
    showToast: (msg) => {
        elements.toastMsg.textContent = msg;
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), 3000);
    },
    showSection: (id) => {
        Object.values(elements.views).forEach(el => { if(el) { el.classList.remove('active'); el.style.display = 'none'; } });
        const target = elements.views[id] || document.getElementById(id);
        if(target) { target.style.display = 'block'; setTimeout(() => target.classList.add('active'), 50); window.scrollTo(0,0); }
    },
    toggleModal: (id, show) => {
        const m = document.getElementById(id);
        if(!m) return;
        if(show) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); }
        else { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
    },
    closeAllModals: () => document.querySelectorAll('.modal-overlay').forEach(m => UI.toggleModal(m.id, false))
};

// --- AUTH SYSTEM (NO ADMIN CODE PROMPT) ---
const Auth = {
    init: () => {
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            Auth.updateUI();
            if(user) await Auth.checkRole(user.uid);
        });

        document.getElementById('login-btn')?.addEventListener('click', () => UI.toggleModal('login-modal', true));
        document.getElementById('signup-btn')?.addEventListener('click', () => UI.toggleModal('signup-modal', true));
        document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));
        document.getElementById('profile-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.profileDropdown.style.display = elements.profileDropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (!elements.profileDropdown.contains(e.target) && e.target.id !== 'profile-btn') elements.profileDropdown.style.display = 'none';
        });

        document.getElementById('confirm-login')?.addEventListener('click', Auth.login);
        document.getElementById('confirm-signup')?.addEventListener('click', Auth.signup);
        document.getElementById('google-login')?.addEventListener('click', () => signInWithPopup(auth, provider));
        
        document.getElementById('become-writer-btn')?.addEventListener('click', () => {
            UI.toggleModal('writer-app-modal', true);
            elements.profileDropdown.style.display = 'none';
        });
        document.getElementById('writer-panel-btn')?.addEventListener('click', () => {
            UI.showSection('writer');
            elements.profileDropdown.style.display = 'none';
            WriterPanel.init();
        });
        
        // Admin paneli artık şifresiz açılır (Role bazlı)
        document.getElementById('admin-panel-btn')?.addEventListener('click', () => {
            UI.showSection('admin');
            AdminPanel.load();
            elements.profileDropdown.style.display = 'none';
        });

        document.getElementById('games-btn')?.addEventListener('click', () => {
            UI.showSection('games');
            elements.profileDropdown.style.display = 'none';
            Games.init();
        });
    },
    login: async () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        try { await signInWithEmailAndPassword(auth, e, p); UI.closeAllModals(); UI.showToast("Hoşgeldiniz!"); }
        catch(err) { UI.showToast("Hata: " + err.message); }
    },
    signup: async () => {
        const n = document.getElementById('signup-name').value;
        const e = document.getElementById('signup-email').value;
        const p = document.getElementById('signup-pass').value;
        try {
            const c = await createUserWithEmailAndPassword(auth, e, p);
            // İlk kayıt olan otomatik admin olabilir veya varsayılan user olur (Burada user olarak başlatıyoruz)
            await setDoc(doc(db, "users", c.user.uid), { displayName: n, email: e, role: 'user', createdAt: serverTimestamp() });
            await sendEmailVerification(c.user);
            UI.closeAllModals(); UI.showToast("Kayıt başarılı! E-postanızı doğrulayın.");
        } catch(err) { UI.showToast("Hata: " + err.message); }
    },
    updateUI: () => {
        if(currentUser) { elements.authButtons.style.display = 'none'; elements.userMenu.style.display = 'block'; }
        else { elements.authButtons.style.display = 'flex'; elements.userMenu.style.display = 'none'; }
    },
    checkRole: async (uid) => {
        const snap = await getDoc(doc(db, "users", uid));
        if(snap.exists()) {
            const role = snap.data().role;
            document.getElementById('user-role-display').textContent = "ROL: " + role.toUpperCase();
            
            // Yetkili butonları göster
            if(role === 'author' || role === 'admin') {
                document.getElementById('writer-panel-btn').style.display = 'flex';
            }
            if(role === 'admin') {
                document.getElementById('admin-panel-btn').style.display = 'flex';
            }
        }
    },
    submitApp: async () => {
        const bio = document.getElementById('app-bio').value;
        const exp = document.getElementById('app-expertise').value;
        const mot = document.getElementById('app-motivation').value;
        if(!bio || !mot) return UI.showToast("Alanları doldurun.");
        try {
            await addDoc(collection(db, "applications"), {
                uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName,
                bio, expertise: exp, motivation: mot, status: 'pending', date: serverTimestamp()
            });
            UI.closeAllModals(); UI.showToast("Başvuru alındı!");
        } catch(e) { UI.showToast("Hata: " + e.message); }
    }
};

// --- NEWS FEED ---
const NewsFeed = {
    init: () => {
        NewsFeed.load('all');
        document.querySelectorAll('.cat-pill').forEach(p => {
            p.addEventListener('click', () => {
                document.querySelectorAll('.cat-pill').forEach(x => x.classList.remove('active'));
                p.classList.add('active');
                NewsFeed.load(p.dataset.cat);
            });
        });
    },
    load: async (cat) => {
        if(!elements.newsGrid) return;
        elements.newsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px;">Yükleniyor...</div>';
        try {
            let q = cat === 'all' 
                ? query(collection(db, "articles"), orderBy("createdAt", "desc"), limit(50))
                : query(collection(db, "articles"), where("category", "==", cat), orderBy("createdAt", "desc"), limit(50));
            const snap = await getDocs(q);
            elements.newsGrid.innerHTML = '';
            if(snap.empty) { elements.newsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center;">Haber yok.</div>'; return; }
            
            snap.forEach(d => {
                const data = d.data();
                const card = document.createElement('div');
                card.className = 'news-card';
                // Unsplash'ten kategori bazlı görsel fallback
                const imgUrl = data.cover || `https://source.unsplash.com/400x200/?${encodeURIComponent(data.category)},technology`;
                
                card.innerHTML = `
                    <img src="${imgUrl}" class="card-img" loading="lazy" onerror="this.src='https://via.placeholder.com/400x200?text=Rook'">
                    <div class="card-body">
                        <div class="card-cat">${data.category}</div>
                        <div class="card-title">${data.title}</div>
                        <div class="card-excerpt">${data.excerpt || data.content.substring(0,100)}...</div>
                        <div class="card-meta"><span>${data.authorName}</span><span>${new Date(data.createdAt.seconds*1000).toLocaleDateString('tr-TR')}</span></div>
                    </div>`;
                card.onclick = () => ArticleDetail.open(d.id, data);
                elements.newsGrid.appendChild(card);
            });
        } catch(e) { console.error(e); elements.newsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:red;">Hata oluştu.</div>'; }
    }
};

// --- ARTICLE DETAIL (MARKDOWN RENDER) ---
const ArticleDetail = {
    open: (id, data) => {
        currentArticleId = id;
        UI.showSection('article');
        document.getElementById('detail-title').textContent = data.title;
        document.getElementById('detail-meta').innerHTML = `<span>${data.authorName}</span> • <span>${new Date(data.createdAt.seconds*1000).toLocaleDateString('tr-TR')}</span>`;
        
        const cover = document.getElementById('detail-cover');
        if(data.cover) { cover.src = data.cover; cover.style.display = 'block'; } else cover.style.display = 'none';

        // Markdown -> HTML Dönüşümü (Marked.js kullanarak)
        const contentDiv = document.getElementById('detail-content');
        if(window.marked) {
            contentDiv.innerHTML = marked.parse(data.content);
        } else {
            contentDiv.innerHTML = data.content.replace(/\n/g, '<br>'); // Fallback
        }

        // Kaynaklar
        const sList = document.getElementById('sources-list');
        const sSec = document.getElementById('sources-section');
        sList.innerHTML = '';
        if(data.sources && data.sources.length > 0) {
            sSec.style.display = 'block';
            data.sources.forEach(s => {
                if(s.url) sList.innerHTML += `<a href="${s.url}" target="_blank" class="source-item">🔗 ${s.title || s.url}</a>`;
            });
        } else sSec.style.display = 'none';

        // Paylaşım
        const url = encodeURIComponent(window.location.href.split('?')[0] + '?id=' + id);
        document.getElementById('share-x').onclick = () => window.open(`https://twitter.com/intent/tweet?url=${url}`, '_blank');
        document.getElementById('share-wa').onclick = () => window.open(`https://wa.me/?text=${url}`, '_blank');
        document.getElementById('copy-link').onclick = () => {
            navigator.clipboard.writeText(window.location.href.split('?')[0] + '?id=' + id);
            UI.showToast("Link kopyalandı!");
        };

        // Geri Bildirim
        document.getElementById('submit-fb').onclick = async () => {
            const msg = document.getElementById('fb-msg').value;
            if(!msg) return;
            await addDoc(collection(db, "feedback"), { articleId: id, message: msg, date: serverTimestamp() });
            UI.showToast("Teşekkürler!");
            document.getElementById('fb-msg').value = '';
        };
    }
};

// --- WRITER PANEL (ADVANCED EDITOR) ---
const WriterPanel = {
    init: () => {
        const area = document.getElementById('wp-content');
        area.addEventListener('input', () => {
            const w = area.value.trim() === '' ? 0 : area.value.trim().split(/\s+/).length;
            document.getElementById('word-count').textContent = w;
            document.getElementById('read-time').textContent = Math.ceil(w/200);
            localStorage.setItem('rook_draft', area.value);
        });
        const draft = localStorage.getItem('rook_draft');
        if(draft) { area.value = draft; area.dispatchEvent(new Event('input')); }

        document.getElementById('wp-publish').onclick = WriterPanel.publish;
        
        // Akıllı Görsel Önerisi (Kategori bazlı)
        document.getElementById('wp-ai-image').onclick = () => {
            const cat = document.getElementById('wp-cat').value;
            // Unsplash source ile kategoriye uygun görsel
            const imgUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(cat)},science,tech`;
            document.getElementById('wp-cover').value = imgUrl;
            UI.showToast("Görsel önerildi!");
        };
        WriterPanel.loadMyArticles();
    },
    insertImage: (input) => {
        if(input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgTag = `\n![Görsel](${e.target.result})\n`;
                const area = document.getElementById('wp-content');
                area.value += imgTag;
                area.dispatchEvent(new Event('input'));
            };
            reader.readAsDataURL(input.files[0]);
        }
    },
    importHTML: (input) => {
        if(input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Basit HTML temizleme ve metne çevirme
                const txt = e.target.result.replace(/<[^>]*>?/gm, '\n'); 
                const area = document.getElementById('wp-content');
                area.value += "\n---\n(HTML Dosyasından Aktarılan)\n" + txt;
                area.dispatchEvent(new Event('input'));
                UI.showToast("HTML içeriği aktarıldı!");
            };
            reader.readAsText(input.files[0]);
        }
    },
    publish: async () => {
        const title = document.getElementById('wp-title').value;
        const content = document.getElementById('wp-content').value;
        const cat = document.getElementById('wp-cat').value;
        const cover = document.getElementById('wp-cover').value;
        if(!title || !content) return UI.showToast("Başlık ve içerik şart.");
        
        const sources = document.getElementById('wp-sources').value.split('\n').map(l => {
            const p = l.split(','); return { title: p[0]?.trim(), url: p[1]?.trim() };
        }).filter(s => s.title);

        try {
            await addDoc(collection(db, "articles"), {
                title, content, category: cat, cover, sources,
                authorId: currentUser.uid, authorName: currentUser.displayName,
                createdAt: serverTimestamp(), excerpt: content.substring(0,150)
            });
            localStorage.removeItem('rook_draft');
            UI.showToast("Yayınlandı!");
            document.getElementById('wp-title').value = '';
            document.getElementById('wp-content').value = '';
            WriterPanel.loadMyArticles();
        } catch(e) { UI.showToast("Hata: " + e.message); }
    },
    loadMyArticles: async () => {
        if(!currentUser) return;
        const list = document.getElementById('my-articles-list');
        const snap = await getDocs(query(collection(db, "articles"), where("authorId", "==", currentUser.uid), orderBy("createdAt", "desc")));
        list.innerHTML = '';
        if(snap.empty) { list.innerHTML = '<p style="color:var(--text-secondary)">Yazınız yok.</p>'; return; }
        snap.forEach(d => {
            const div = document.createElement('div');
            div.style.cssText = "background:var(--card-bg); padding:15px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
            div.innerHTML = `<b>${d.data().title}</b> <button class="btn btn-sm btn-danger" onclick="alert('Silme özelliği eklenecek')">Sil</button>`;
            list.appendChild(div);
        });
    }
};

// --- ADMIN PANEL ---
const AdminPanel = {
    load: async () => {
        const uSnap = await getDocs(collection(db, "users"));
        const aSnap = await getDocs(collection(db, "articles"));
        document.getElementById('stat-users').textContent = uSnap.size;
        document.getElementById('stat-articles').textContent = aSnap.size;
        
        const apps = await getDocs(query(collection(db, "applications"), where("status", "==", "pending")));
        const list = document.getElementById('admin-app-list');
        list.innerHTML = '';
        if(apps.empty) { list.innerHTML = '<p>Bekleyen başvuru yok.</p>'; return; }
        apps.forEach(d => {
            const data = d.data();
            const div = document.createElement('div');
            div.style.cssText = "background:var(--card-bg); padding:15px; border-radius:12px; margin-bottom:10px;";
            div.innerHTML = `<b>${data.displayName}</b> (${data.expertise})<br><small>${data.motivation}</small><br><button class="btn btn-sm btn-primary" style="margin-top:5px;" onclick="window.adminApprove('${d.id}', '${data.uid}')">Onayla</button>`;
            list.appendChild(div);
        });
    }
};
window.adminApprove = async (appId, userId) => {
    await updateDoc(doc(db, "users", userId), { role: 'author' });
    await deleteDoc(doc(db, "applications", appId));
    UI.showToast("Yazar onaylandı!");
    AdminPanel.load();
};

// --- GAMES CENTER (SUDOKU, LINGO, MINES) & LEADERBOARD ---
const Games = {
    currentGame: null,
    score: 0,
    startDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD formatı

    init: () => {
        this.switchTab('sudoku');
        this.loadLeaderboard('sudoku');
    },

    switchTab: (gameName) => {
        document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
        event?.target.classList.add('active');
        this.currentGame = gameName;
        this.renderGame(gameName);
        this.loadLeaderboard(gameName);
    },

    renderGame: (name) => {
        const area = elements.gameArea;
        area.innerHTML = '';
        
        if(name === 'sudoku') {
            area.innerHTML = `<h3>Sudoku (Kolay)</h3><p style="color:var(--text-secondary); margin-bottom:15px;">Eksik sayıları tamamla. Her doğru hamle +10 puan.</p><div id="sudoku-board" class="game-board" style="grid-template-columns: repeat(9, 1fr);"></div><button class="btn btn-primary" onclick="Games.checkSudoku()">Kontrol Et</button>`;
            this.initSudoku();
        } else if (name === 'lingo') {
            area.innerHTML = `<h3>Lingo (Kelime Avı)</h3><p style="color:var(--text-secondary); margin-bottom:15px;">5 harfli kelimeyi bul. Yeşil: Doğru yer, Turuncu: Yanlış yer.</p><div id="lingo-board" style="display:grid; grid-template-columns:repeat(5, 1fr); gap:5px; max-width:300px; margin:0 auto;"></div><input type="text" id="lingo-input" maxlength="5" style="text-align:center; font-size:20px; padding:10px; margin-top:15px; width:100%; border-radius:8px; border:1px solid #ccc;"><button class="btn btn-primary" style="margin-top:10px;" onclick="Games.checkLingo()">Tahmin Et</button>`;
            this.initLingo();
        } else if (name === 'mines') {
            area.innerHTML = `<h3>Mayın Tarlası</h3><p style="color:var(--text-secondary); margin-bottom:15px;">Mayınlara basma! Her güvenli kare +5 puan.</p><div id="mines-board" class="game-board" style="grid-template-columns: repeat(10, 1fr);"></div>`;
            this.initMines();
        }
    },

    // --- SUDOKU LOGIC ---
    initSudoku: () => {
        const board = document.getElementById('sudoku-board');
        // Basit bir örnek puzzle (0: boş)
        const puzzle = [5,3,0, 0,7,0, 0,0,0, 6,0,0, 1,9,5, 0,0,0, 0,9,8, 0,0,0, 0,6,0, 8,0,0, 0,6,0, 0,0,3, 4,0,0, 8,0,3, 0,0,1, 7,0,0, 0,2,0, 0,0,6, 0,6,0, 0,0,0, 2,8,0, 0,0,0, 4,1,9, 0,0,5, 0,0,0, 0,8,0, 0,7,9];
        this.sudokuSolution = [5,3,4, 6,7,8, 9,1,2, 6,7,2, 1,9,5, 3,4,8, 1,9,8, 3,4,2, 5,6,7, 8,5,9, 7,6,1, 4,2,3, 4,2,6, 8,5,3, 7,9,1, 7,1,3, 9,2,4, 8,5,6, 9,6,1, 5,3,7, 2,8,4, 2,8,7, 4,1,9, 6,3,5, 3,4,5, 2,8,6, 1,7,9];
        
        board.innerHTML = '';
        this.score = 0;
        puzzle.forEach((num, i) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if(num !== 0) { cell.textContent = num; cell.classList.add('revealed'); cell.style.background = '#eee'; }
            else {
                cell.contentEditable = true;
                cell.dataset.index = i;
                cell.oninput = (e) => { if(e.target.textContent.length > 1) e.target.textContent = e.target.textContent.slice(0,1); };
            }
            board.appendChild(cell);
        });
    },
    checkSudoku: () => {
        const cells = document.querySelectorAll('#sudoku-board .cell');
        let correct = true;
        cells.forEach((c, i) => {
            if(!c.classList.contains('revealed')) {
                const val = parseInt(c.textContent);
                if(val === this.sudokuSolution[i]) { c.style.background = '#34C759'; c.style.color = 'white'; this.score += 10; }
                else { c.style.background = '#FF3B30'; correct = false; }
            }
        });
        if(correct && this.score > 0) { this.saveScore('Sudoku', this.score); UI.showToast(`Tebrikler! Skor: ${this.score}`); }
        else UI.showToast("Hatalar var, düzeltin.");
    },

    // --- LINGO LOGIC ---
    words: ["ROOK", "BILIM", "TEKNO", "UZAY", "KODLA", "YAPAY", "ZEKA", "DATA", "FIZIK"],
    targetWord: "",
    lingoAttempts: 0,
    initLingo: () => {
        this.targetWord = this.words[Math.floor(Math.random() * this.words.length)];
        this.lingoAttempts = 0;
        const board = document.getElementById('lingo-board');
        board.innerHTML = '';
        for(let i=0; i<30; i++) { 
            const c = document.createElement('div');
            c.className = 'cell'; c.style.fontSize = '24px';
            board.appendChild(c);
        }
        document.getElementById('lingo-input').value = '';
        document.getElementById('lingo-input').focus();
    },
    checkLingo: () => {
        const input = document.getElementById('lingo-input');
        const guess = input.value.toUpperCase();
        if(guess.length !== 5) return UI.showToast("5 harfli olmalı!");
        
        const rowStart = this.lingoAttempts * 5;
        const cells = document.querySelectorAll('#lingo-board .cell');
        
        for(let i=0; i<5; i++) {
            cells[rowStart + i].textContent = guess[i];
            if(guess[i] === this.targetWord[i]) { cells[rowStart + i].style.background = '#34C759'; cells[rowStart + i].style.color = 'white'; this.score += 20; }
            else if(this.targetWord.includes(guess[i])) { cells[rowStart + i].style.background = '#FF6B35'; cells[rowStart + i].style.color = 'white'; this.score += 10; }
            else cells[rowStart + i].style.background = '#eee';
        }
        
        if(guess === this.targetWord) { this.saveScore('Lingo', this.score); UI.showToast("Kazandın!"); }
        else { 
            this.lingoAttempts++; 
            input.value = ''; 
            if(this.lingoAttempts >= 6) { UI.showToast("Kaybettin! Kelime: " + this.targetWord); } 
        }
    },

    // --- MINES LOGIC ---
    initMines: () => {
        const board = document.getElementById('mines-board');
        board.innerHTML = '';
        this.score = 0;
        this.mines = [];
        while(this.mines.length < 15) {
            const r = Math.floor(Math.random() * 100);
            if(!this.mines.includes(r)) this.mines.push(r);
        }
        for(let i=0; i<100; i++) {
            const c = document.createElement('div');
            c.className = 'cell';
            c.dataset.idx = i;
            c.onclick = () => {
                if(c.classList.contains('revealed')) return;
                if(this.mines.includes(i)) {
                    c.classList.add('mine'); c.textContent = '💣';
                    UI.showToast("Patladın! Oyun Bitti.");
                } else {
                    c.classList.add('revealed');
                    this.score += 5;
                }
            };
            board.appendChild(c);
        }
    },

    // --- LEADERBOARD (FIRESTORE) ---
    saveScore: async (game, score) => {
        if(!currentUser) return UI.showToast("Skor kaydı için giriş yapmalısın.");
        try {
            await addDoc(collection(db, "scores"), {
                uid: currentUser.uid, name: currentUser.displayName, game, score, date: this.startDate, timestamp: serverTimestamp()
            });
            this.loadLeaderboard(game);
        } catch(e) { console.error(e); }
    },
    loadLeaderboard: async (game) => {
        document.getElementById('lb-date').textContent = this.startDate;
        const list = document.getElementById('lb-list');
        list.innerHTML = '<div style="text-align:center;">Yükleniyor...</div>';
        
        try {
            // Sadece bugünün skorlarını çek
            const q = query(collection(db, "scores"), where("game", "==", game), where("date", "==", this.startDate), orderBy("score", "desc"), limit(5));
            const snap = await getDocs(q);
            list.innerHTML = '';
            if(snap.empty) { list.innerHTML = '<div style="text-align:center; color:var(--text-secondary);">Bugün henüz skor yok. İlk sen ol!</div>'; return; }
            
            let rank = 1;
            snap.forEach(d => {
                const s = d.data();
                list.innerHTML += `
                    <div class="lb-item">
                        <span><span class="lb-rank">#${rank++}</span> ${s.name || 'Anonim'}</span>
                        <span style="font-weight:700; color:var(--accent);">${s.score} Puan</span>
                    </div>`;
            });
        } catch(e) { console.error(e); list.innerHTML = 'Hata oluştu.'; }
    }
};

// --- CHATBOT (DUAL MODE) ---
const Chatbot = {
    mode: 'user',
    messages: [{ type: 'bot', text: "Merhaba! Ben Rook Asistan. Nasıl yardımcı olabilirim?" }],
    init: () => {
        document.getElementById('chatbot-toggle').onclick = () => {
            elements.chatbotWindow.classList.toggle('open');
            if(elements.chatbotWindow.classList.contains('open')) {
                if(elements.views.writer.classList.contains('active')) {
                    this.mode = 'writer';
                    document.getElementById('chat-title').textContent = "Yazar Asistanı (AI)";
                    this.addMessage('bot', "Merhaba Yazar! Bugünün trendlerine göre hangi konuda yazmak istersin? Güncel başlık önerebilirim.");
                } else {
                    this.mode = 'user';
                    document.getElementById('chat-title').textContent = "Rook Asistan";
                    this.addMessage('bot', "Merhaba! Hangi tür haberler ilginizi çekiyor? (Teknoloji, Uzay, Sağlık...)");
                }
            }
        };
        document.getElementById('send-msg').onclick = () => this.send();
        document.getElementById('msg-input').onkeypress = (e) => { if(e.key==='Enter') this.send(); };
        this.render();
    },
    send: () => {
        const inp = document.getElementById('msg-input');
        const txt = inp.value.trim();
        if(!txt) return;
        this.addMessage('user', txt);
        inp.value = '';
        
        setTimeout(() => {
            let reply = "";
            if(this.mode === 'writer') {
                const trends = ["Yapay Zeka Regülasyonları", "Mars'ta Su İzleri", "Kuantum İnternet", "CRISPR Tedavisi"];
                const randomTrend = trends[Math.floor(Math.random()*trends.length)];
                reply = `Harika bir seçim! Güncel verilere göre "**${randomTrend}**" konusu çok konuşuluyor. Başlık önerim: "Geleceği Şekillendiren ${randomTrend}: Bilmeniz Gerekenler".`;
            } else {
                const lower = txt.toLowerCase();
                if(lower.includes("tekno")) reply = "Teknoloji kategorisinde en çok okunan haberimiz: 'Yeni Nesil İşlemciler'. Ana sayfadan inceleyebilirsiniz.";
                else if(lower.includes("uzay")) reply = "Uzay haberleri çok popüler! Özellikle James Webb teleskobunun yeni görüntülerine bayılacaksınız.";
                else reply = "Size özel önerim: 'Sürdürülebilir Enerji ve Gelecek'. Bu haber tam size göre olabilir!";
            }
            this.addMessage('bot', reply);
        }, 800);
    },
    addMessage: (type, text) => { this.messages.push({type, text}); this.render(); this.scrollToBottom(); },
    render: () => {
        const c = document.getElementById('chat-messages');
        if(!c) return;
        c.innerHTML = this.messages.map(m => `<div class="msg ${m.type}">${m.text}</div>`).join('');
    },
    scrollToBottom: () => {
        const c = document.getElementById('chat-messages');
        if(c) c.scrollTop = c.scrollHeight;
    }
};

// --- GLOBAL INIT ---
window.app = {
    showHome: () => { NewsFeed.init(); UI.showSection('home'); },
    closeModals: () => UI.closeAllModals(),
    switchModal: (from, to) => { UI.toggleModal(from, false); setTimeout(() => UI.toggleModal(to, true), 300); }
};

document.addEventListener('DOMContentLoaded', () => {
    // Theme
    if(localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    document.getElementById('theme-toggle').onclick = () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    };

    Auth.init();
    NewsFeed.init();
    Chatbot.init();

    console.log("🚀 Rook Platformu Hazır!");
});
