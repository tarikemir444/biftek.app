/**
 * BİFTEK - Bilim, Fen ve Teknoloji Kulübü Haber Sitesi
 * FAZ 1-8 TAM SÜRÜM (Hatasız, Temizlenmiş, Firebase Entegreli)
 * 
 * KURULUM:
 * Bu dosya doğrudan Firebase v10+ Modular SDK kullanır.
 * Lütfen index.html ile birlikte bir web sunucusu (Live Server, Vercel, Netlify) üzerinde çalıştırın.
 */

// --- FIREBASE SDK IMPORTS (Modular v10+) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, 
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, updateDoc, 
    query, where, serverTimestamp, orderBy, limit, deleteDoc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// ⚙️ 1. FIREBASE YAPILANDIRMASI
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

// Firebase Başlatma ve Hata Yakalama
let auth, db;
try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("✅ Firebase başarıyla başlatıldı.");
} catch (error) {
    console.error("❌ Firebase başlatma hatası:", error);
    alert("HATA: Firebase bağlantısı kurulamadı. Konsolu kontrol edin.");
}

const provider = new GoogleAuthProvider();

// ==========================================
// 🌍 2. GLOBAL DEĞİŞKENLER VE DURUM
// ==========================================
let currentUser = null;
let currentArticleId = null;
let gameAnimationFrame = null;
let activeGame = null;
let currentGameInstance = null;

// DOM Elementleri
const elements = {
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg'),
    newsGrid: document.getElementById('news-grid'),
    views: {
        home: document.getElementById('home-view'),
        article: document.getElementById('article-view'),
        writer: document.getElementById('writer-panel'),
        admin: document.getElementById('admin-panel')
    },
    authButtons: document.getElementById('auth-buttons'),
    userMenu: document.getElementById('user-menu'),
    profileDropdown: document.getElementById('profile-dropdown'),
    chatbotWindow: document.getElementById('chatbot-window'),
    gameCanvas: document.getElementById('game-canvas')
};

// ==========================================
// 🎨 3. ARAYÜZ YARDIMCILARI (UI HELPERS)
// ==========================================
const UI = {
    showToast: (message) => {
        if (!elements.toast) return;
        elements.toastMsg.textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), 3000);
    },

    showSection: (sectionId) => {
        // Tüm ana bölümleri gizle
        Object.values(elements.views).forEach(el => {
            if (el) {
                el.classList.remove('active');
                setTimeout(() => {
                    if (!el.classList.contains('active')) el.style.display = 'none';
                }, 400);
            }
        });

        // İstenen bölümü göster
        const target = elements.views[sectionId] || document.getElementById(sectionId);
        if (target) {
            target.style.display = 'block';
            setTimeout(() => target.classList.add('active'), 50);
            window.scrollTo(0, 0);
        }
    },

    toggleModal: (modalId, show) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        if (show) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        } else {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    },

    closeAllModals: () => {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            UI.toggleModal(modal.id, false);
        });
    }
};

// ==========================================
// 🔐 4. KİMLİK DOĞRULAMA (AUTH)
// ==========================================
const Auth = {
    init: () => {
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            Auth.updateInterface();
            if (user) await Auth.checkUserRole(user.uid);
        });

        // Buton Event Listener'ları
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const profileBtn = document.getElementById('profile-btn');
        
        if(loginBtn) loginBtn.addEventListener('click', () => UI.toggleModal('login-modal', true));
        if(signupBtn) signupBtn.addEventListener('click', () => UI.toggleModal('signup-modal', true));
        if(logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));
        
        if(profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dd = elements.profileDropdown;
                dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
            });
        }
        
        document.addEventListener('click', (e) => {
            if (elements.profileDropdown && 
                !elements.profileDropdown.contains(e.target) && 
                e.target.id !== 'profile-btn') {
                elements.profileDropdown.style.display = 'none';
            }
        });

        // Modal Aksiyonları
        const confirmLogin = document.getElementById('confirm-login');
        const confirmSignup = document.getElementById('confirm-signup');
        const googleLogin = document.getElementById('google-login');
        const becomeWriterBtn = document.getElementById('become-writer-btn');
        const submitAppBtn = document.getElementById('submit-app');
        const adminPanelBtn = document.getElementById('admin-panel-btn');
        const verifyAdminCodeBtn = document.getElementById('verify-admin-code');
        const writerPanelBtn = document.getElementById('writer-panel-btn');
        const gamesBtn = document.getElementById('games-btn');

        if(confirmLogin) confirmLogin.addEventListener('click', Auth.login);
        if(confirmSignup) confirmSignup.addEventListener('click', Auth.signup);
        if(googleLogin) googleLogin.addEventListener('click', () => signInWithPopup(auth, provider));
        
        if(becomeWriterBtn) {
            becomeWriterBtn.addEventListener('click', () => {
                UI.toggleModal('writer-app-modal', true);
                if(elements.profileDropdown) elements.profileDropdown.style.display = 'none';
            });
        }
        if(submitAppBtn) submitAppBtn.addEventListener('click', Auth.submitApplication);

        if(adminPanelBtn) {
            adminPanelBtn.addEventListener('click', () => {
                UI.toggleModal('admin-code-modal', true);
                if(elements.profileDropdown) elements.profileDropdown.style.display = 'none';
            });
        }
        if(verifyAdminCodeBtn) verifyAdminCodeBtn.addEventListener('click', Auth.verifyAdminCode);

        if(writerPanelBtn) {
            writerPanelBtn.addEventListener('click', () => {
                UI.showSection('writer');
                if(elements.profileDropdown) elements.profileDropdown.style.display = 'none';
                WriterPanel.init();
            });
        }

        if(gamesBtn) {
            gamesBtn.addEventListener('click', () => {
                UI.toggleModal('games-modal', true);
                if(elements.profileDropdown) elements.profileDropdown.style.display = 'none';
            });
        }
    },

    login: async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        if (!email || !pass) return UI.showToast("Lütfen e-posta ve şifreyi girin.");
        
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            UI.closeAllModals();
            UI.showToast("Hoş geldiniz!");
        } catch (error) {
            let msg = "Giriş Hatası";
            if(error.code === 'auth/wrong-password') msg = "Hatalı şifre.";
            if(error.code === 'auth/user-not-found') msg = "Kullanıcı bulunamadı.";
            if(error.code === 'auth/invalid-email') msg = "Geçersiz e-posta.";
            UI.showToast(msg + " (" + error.code + ")");
        }
    },

    signup: async () => {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-pass').value;
        if (!name || !email || !pass) return UI.showToast("Tüm alanlar zorunludur.");

        try {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", cred.user.uid), {
                displayName: name,
                email: email,
                role: 'user',
                createdAt: serverTimestamp()
            });
            await sendEmailVerification(cred.user);
            UI.closeAllModals();
            UI.showToast("Kayıt başarılı! Lütfen e-postanızı doğrulayın.");
        } catch (error) {
            let msg = "Kayıt Hatası";
            if(error.code === 'auth/email-already-in-use') msg = "Bu e-posta zaten kullanılıyor.";
            if(error.code === 'auth/weak-password') msg = "Şifre çok zayıf (en az 6 karakter).";
            UI.showToast(msg + " (" + error.code + ")");
        }
    },

    updateInterface: () => {
        if (currentUser) {
            if(elements.authButtons) elements.authButtons.style.display = 'none';
            if(elements.userMenu) elements.userMenu.style.display = 'block';
        } else {
            if(elements.authButtons) elements.authButtons.style.display = 'flex';
            if(elements.userMenu) elements.userMenu.style.display = 'none';
            if(elements.profileDropdown) elements.profileDropdown.style.display = 'none';
            
            const wpBtn = document.getElementById('writer-panel-btn');
            const apBtn = document.getElementById('admin-panel-btn');
            if(wpBtn) wpBtn.style.display = 'none';
            if(apBtn) apBtn.style.display = 'none';
        }
    },

    checkUserRole: async (uid) => {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            let role = 'user';
            
            if (userDoc.exists()) {
                role = userDoc.data().role || 'user';
                const roleDisplay = document.getElementById('user-role-display');
                if(roleDisplay) roleDisplay.textContent = "Rol: " + role.toUpperCase();
            }

            if (role === 'author' || role === 'admin') {
                const wpBtn = document.getElementById('writer-panel-btn');
                if(wpBtn) wpBtn.style.display = 'flex';
            }
            if (role === 'admin') {
                const apBtn = document.getElementById('admin-panel-btn');
                if(apBtn) apBtn.style.display = 'flex';
                
                apBtn.onclick = () => {
                    UI.showSection('admin');
                    AdminPanel.load();
                    if(elements.profileDropdown) elements.profileDropdown.style.display = 'none';
                };
            }
        } catch (error) {
            console.error("Rol kontrol hatası:", error);
        }
    },

    submitApplication: async () => {
        const bio = document.getElementById('app-bio').value;
        const expertise = document.getElementById('app-expertise').value;
        const motivation = document.getElementById('app-motivation').value;
        const portfolio = document.getElementById('app-portfolio').value;

        if (!bio || !motivation) return UI.showToast("Biyografi ve motivasyon zorunludur.");

        try {
            await addDoc(collection(db, "applications"), {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || "Kullanıcı",
                bio, expertise, motivation, portfolio,
                status: 'pending',
                appliedAt: serverTimestamp()
            });
            UI.closeAllModals();
            UI.showToast("Başvurunuz alındı!");
        } catch (error) {
            UI.showToast("Hata: " + error.message);
        }
    },

    verifyAdminCode: async () => {
        const code = document.getElementById('admin-code-input').value;
        if (code === "BIFTEK-ADMIN-2024") {
            try {
                await updateDoc(doc(db, "users", currentUser.uid), { role: 'admin' });
                UI.closeAllModals();
                UI.showToast("Tebrikler! Yönetici yetkisi verildi.");
                setTimeout(() => location.reload(), 1500);
            } catch (error) {
                UI.showToast("Yetki güncellenemedi: " + error.message);
            }
        } else {
            UI.showToast("Hatalı yönetici kodu!");
        }
    }
};

// ==========================================
// 📰 5. HABER AKIŞI
// ==========================================
const NewsFeed = {
    init: () => {
        NewsFeed.load('all');
        document.querySelectorAll('.cat-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                NewsFeed.load(pill.dataset.cat);
            });
        });
    },

    load: async (category) => {
        if (!elements.newsGrid) return;
        elements.newsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-secondary);"><span class="material-icons-round" style="font-size:48px; opacity:0.5; margin-bottom:10px;">hourglass_empty</span><p>Haberler yükleniyor...</p></div>';
        
        try {
            let q;
            if (category === 'all') {
                q = query(collection(db, "articles"), orderBy("createdAt", "desc"), limit(50));
            } else {
                q = query(collection(db, "articles"), where("category", "==", category), orderBy("createdAt", "desc"), limit(50));
            }

            const snapshot = await getDocs(q);
            elements.newsGrid.innerHTML = '';
            
            if (snapshot.empty) {
                elements.newsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding:40px;">Bu kategoride henüz haber yok.</div>';
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const card = document.createElement('div');
                card.className = 'news-card';
                const coverUrl = data.cover && data.cover.trim() !== '' ? data.cover : `https://picsum.photos/seed/${docSnap.id}/400/200`;
                
                card.innerHTML = `
                    <img src="${coverUrl}" class="card-img" alt="Cover" loading="lazy" onerror="this.src='https://via.placeholder.com/400x200?text=BIFTEK'">
                    <div class="card-body">
                        <div class="card-cat">${data.category}</div>
                        <div class="card-title">${data.title}</div>
                        <div class="card-excerpt">${data.excerpt || (data.content ? data.content.substring(0, 100) + '...' : 'Detaylar için tıklayın.')}</div>
                        <div class="card-meta">
                            <span>${data.authorName || 'BİFTEK'}</span>
                            <span>${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : ''}</span>
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => ArticleDetail.open(docSnap.id, data));
                elements.newsGrid.appendChild(card);
            });
        } catch (error) {
            console.error("Haber yükleme hatası:", error);
            elements.newsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding:40px;">Haberler yüklenirken hata oluştu.<br><small>' + error.message + '</small></div>';
        }
    }
};

// ==========================================
// 📄 6. MAKALE DETAYI
// ==========================================
const ArticleDetail = {
    open: (id, data) => {
        currentArticleId = id;
        UI.showSection('article');
        
        const titleEl = document.getElementById('detail-title');
        const metaEl = document.getElementById('detail-meta');
        const coverEl = document.getElementById('detail-cover');
        const contentEl = document.getElementById('detail-content');
        const sourcesSection = document.getElementById('sources-section');
        const sourcesList = document.getElementById('sources-list');

        if(!titleEl || !metaEl || !contentEl) return;

        titleEl.textContent = data.title || 'Başlıksız Makale';
        metaEl.innerHTML = `
            <span><span class="material-icons-round" style="font-size:14px; vertical-align:middle;">person</span> ${data.authorName || 'Anonim'}</span>
            <span><span class="material-icons-round" style="font-size:14px; vertical-align:middle;">calendar_today</span> ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : ''}</span>
            <span><span class="material-icons-round" style="font-size:14px; vertical-align:middle;">category</span> ${data.category}</span>
        `;
        
        if (data.cover && data.cover.trim() !== '') {
            coverEl.src = data.cover;
            coverEl.style.display = 'block';
        } else {
            coverEl.style.display = 'none';
        }

        let htmlContent = data.content || 'İçerik bulunamadı.';
        htmlContent = htmlContent.replace(/\n/g, '<br>');
        htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        contentEl.innerHTML = htmlContent;

        sourcesList.innerHTML = '';
        if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
            sourcesSection.style.display = 'block';
            data.sources.forEach(src => {
                if(src.url && src.url.trim() !== '') {
                    const a = document.createElement('a');
                    a.href = src.url;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    a.className = 'source-item';
                    a.innerHTML = `<span class="material-icons-round" style="font-size:16px; vertical-align:middle; margin-right:5px;">link</span> ${src.title || src.url}`;
                    sourcesList.appendChild(a);
                }
            });
        } else {
            sourcesSection.style.display = 'none';
        }

        const currentUrl = encodeURIComponent(window.location.href.split('?')[0] + '?id=' + id);
        const shareText = encodeURIComponent(data.title + " - BİFTEK Haber Sitesi");
        
        const btnX = document.getElementById('share-x');
        const btnWa = document.getElementById('share-wa');
        const btnLi = document.getElementById('share-li');
        const btnCopy = document.getElementById('copy-link');

        if(btnX) btnX.onclick = () => window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${currentUrl}`, '_blank');
        if(btnWa) btnWa.onclick = () => window.open(`https://wa.me/?text=${shareText}%20${currentUrl}`, '_blank');
        if(btnLi) btnLi.onclick = () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`, '_blank');
        
        if(btnCopy) {
            btnCopy.onclick = () => {
                const fullUrl = window.location.href.split('?')[0] + '?id=' + id;
                navigator.clipboard.writeText(fullUrl).then(() => {
                    UI.showToast("Bağlantı panoya kopyalandı!");
                }).catch(() => {
                    UI.showToast("Kopyalama başarısız.");
                });
            };
        }

        document.getElementById('like-btn')?.addEventListener('click', () => UI.showToast("Beğeni kaydedildi!"));
        document.getElementById('bookmark-btn')?.addEventListener('click', () => UI.showToast("Favorilere eklendi!"));

        const submitFb = document.getElementById('submit-fb');
        if(submitFb) {
            submitFb.onclick = async () => {
                const name = document.getElementById('fb-name').value || 'Misafir';
                const msg = document.getElementById('fb-msg').value;
                if(!msg || msg.trim() === '') return UI.showToast("Lütfen bir mesaj yazın.");
                
                try {
                    await addDoc(collection(db, "feedback"), {
                        articleId: id,
                        name: name,
                        message: msg,
                        date: serverTimestamp()
                    });
                    UI.showToast("Geri bildiriminiz için teşekkürler!");
                    document.getElementById('fb-msg').value = '';
                    document.getElementById('fb-name').value = '';
                } catch(e) {
                    UI.showToast("Gönderim hatası: " + e.message);
                }
            };
        }

        const ttsBtn = document.getElementById('tts-btn');
        if(ttsBtn) {
            ttsBtn.onclick = () => {
                if(speechSynthesis.speaking) {
                    speechSynthesis.cancel();
                    ttsBtn.innerHTML = '<span class="material-icons-round" style="vertical-align: middle; margin-right:5px;">volume_up</span> Haberi Sesli Oku';
                    return;
                }
                const utterance = new SpeechSynthesisUtterance(data.content);
                utterance.lang = 'tr-TR';
                utterance.rate = 1.0;
                speechSynthesis.speak(utterance);
                ttsBtn.innerHTML = '<span class="material-icons-round" style="vertical-align: middle; margin-right:5px;">stop</span> Durdur';
                
                utterance.onend = () => {
                    ttsBtn.innerHTML = '<span class="material-icons-round" style="vertical-align: middle; margin-right:5px;">volume_up</span> Haberi Sesli Oku';
                };
            };
        }
    }
};

// ==========================================
// 🎮 7. RETRO OYUNLAR (TEMİZLENMİŞ)
// ==========================================
const GameHelper = {
    ctx: null,
    keys: {},
    init(canvas) {
        if (!canvas) return false;
        this.ctx = canvas.getContext('2d');
        this.ctx.font = '16px Inter, sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.imageSmoothingEnabled = false;
        
        if(Object.keys(this.keys).length === 0) {
            window.addEventListener('keydown', (e) => {
                this.keys[e.key] = true;
                if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                    e.preventDefault();
                }
            });
            window.addEventListener('keyup', (e) => this.keys[e.key] = false);
        }
        return true;
    },
    clear(canvas) {
        if(!this.ctx || !canvas) return;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    rect(x, y, w, h, color) {
        if(!this.ctx) return;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    },
    text(txt, x, y, color = '#fff', size = '16px') {
        if(!this.ctx) return;
        this.ctx.fillStyle = color;
        this.ctx.font = `${size} Inter, sans-serif`;
        this.ctx.fillText(txt, x, y);
    }
};

// --- OYUN: SNAKE ---
const SnakeGame = {
    snake: [], food: {x: 0, y: 0}, dx: 0, dy: 0, score: 0, gridSize: 20, lastRenderTime: 0, speed: 5,

    init(canvas) {
        if (!GameHelper.init(canvas)) return;
        this.reset();
        document.getElementById('start-game-btn').onclick = () => this.start();
        document.getElementById('pause-game-btn').onclick = () => this.pause();
        document.getElementById('stop-game-btn').onclick = () => this.stop();
    },

    reset() {
        const cols = Math.floor(elements.gameCanvas.width / this.gridSize);
        const rows = Math.floor(elements.gameCanvas.height / this.gridSize);
        this.snake = [{x: Math.floor(cols/2), y: Math.floor(rows/2)}];
        this.dx = 1; this.dy = 0;
        this.score = 0;
        this.generateFood();
        this.lastRenderTime = 0;
    },

    generateFood() {
        const cols = Math.floor(elements.gameCanvas.width / this.gridSize);
        const rows = Math.floor(elements.gameCanvas.height / this.gridSize);
        let newFood;
        do {
            newFood = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        this.food = newFood;
    },

    start() {
        if (gameAnimationFrame) return;
        activeGame = 'snake';
        currentGameInstance = this;
        
        const loop = (currentTime) => {
            if (activeGame !== 'snake') return;
            window.requestAnimationFrame(loop);
            const secondsSinceLastRender = (currentTime - this.lastRenderTime) / 1000;
            if (secondsSinceLastRender < 1 / this.speed) return;
            this.lastRenderTime = currentTime;
            this.update();
            this.draw();
        };
        window.requestAnimationFrame(loop);
    },

    pause() {
        if(activeGame === 'snake') {
            activeGame = 'paused';
            if(gameAnimationFrame) cancelAnimationFrame(gameAnimationFrame);
            gameAnimationFrame = null;
            GameHelper.text("DURAKLATILDI", elements.gameCanvas.width/2 - 60, elements.gameCanvas.height/2, '#fff', '24px');
        } else if (activeGame === 'paused') {
            activeGame = 'snake';
            this.start();
        }
    },

    stop() {
        if (gameAnimationFrame) { cancelAnimationFrame(gameAnimationFrame); gameAnimationFrame = null; }
        activeGame = null;
        currentGameInstance = null;
        GameHelper.clear(elements.gameCanvas);
        GameHelper.text("Oyun Durduruldu.", 150, 200, '#aaa');
    },

    update() {
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
        const cols = Math.floor(elements.gameCanvas.width / this.gridSize);
        const rows = Math.floor(elements.gameCanvas.height / this.gridSize);

        if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
            this.stop(); UI.showToast("Snake oyunu bitti! (Duvara çarptın)"); return;
        }
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.stop(); UI.showToast("Snake oyunu bitti! (Kendine çarptın)"); return;
        }

        this.snake.unshift(head);
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.speed = Math.min(15, 5 + Math.floor(this.score / 2));
            this.generateFood();
        } else {
            this.snake.pop();
        }

        if (GameHelper.keys['ArrowUp'] && this.dy === 0) { this.dx = 0; this.dy = -1; }
        if (GameHelper.keys['ArrowDown'] && this.dy === 0) { this.dx = 0; this.dy = 1; }
        if (GameHelper.keys['ArrowLeft'] && this.dx === 0) { this.dx = -1; this.dy = 0; }
        if (GameHelper.keys['ArrowRight'] && this.dx === 0) { this.dx = 1; this.dy = 0; }
    },

    draw() {
        GameHelper.clear(elements.gameCanvas);
        GameHelper.rect(0, 0, elements.gameCanvas.width, elements.gameCanvas.height, '#111');
        this.snake.forEach((segment, i) => {
            GameHelper.rect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize - 1, this.gridSize - 1, i === 0 ? '#0f0' : '#0b0');
        });
        GameHelper.rect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 1, this.gridSize - 1, '#f00');
        GameHelper.text(`Skor: ${this.score}`, 10, 25, '#fff', '18px');
    }
};

// --- OYUN: SPACE INVADERS ---
const SpaceInvadersGame = {
    player: { x: 0, width: 40, height: 20, speed: 5 },
    aliens: [], bullets: [], alienBullets: [],
    score: 0, lives: 3, alienRows: 4, alienCols: 8,
    alienSpeed: 1, alienDirection: 1, lastAlienShot: 0,

    init(canvas) {
        if (!GameHelper.init(canvas)) return;
        this.reset();
        document.getElementById('start-game-btn').onclick = () => this.start();
        document.getElementById('pause-game-btn').onclick = () => this.pause();
        document.getElementById('stop-game-btn').onclick = () => this.stop();
    },

    reset() {
        this.player.x = (elements.gameCanvas.width - this.player.width) / 2;
        this.bullets = []; this.alienBullets = []; this.aliens = [];
        this.score = 0; this.lives = 3; this.alienSpeed = 1;
        for (let r = 0; r < this.alienRows; r++) {
            for (let c = 0; c < this.alienCols; c++) {
                this.aliens.push({ x: c * 50 + 50, y: r * 40 + 50, width: 30, height: 20, alive: true });
            }
        }
    },

    start() {
        if (gameAnimationFrame) return;
        activeGame = 'space';
        currentGameInstance = this;
        const loop = (currentTime) => {
            if (activeGame !== 'space') return;
            window.requestAnimationFrame(loop);
            this.update(currentTime);
            this.draw();
        };
        window.requestAnimationFrame(loop);
    },

    pause() {
        if(activeGame === 'space') {
            activeGame = 'paused';
            if(gameAnimationFrame) cancelAnimationFrame(gameAnimationFrame);
            gameAnimationFrame = null;
            GameHelper.text("DURAKLATILDI", elements.gameCanvas.width/2 - 60, elements.gameCanvas.height/2, '#fff', '24px');
        } else if (activeGame === 'paused') {
            activeGame = 'space';
            this.start();
        }
    },

    stop() {
        if (gameAnimationFrame) { cancelAnimationFrame(gameAnimationFrame); gameAnimationFrame = null; }
        activeGame = null;
        currentGameInstance = null;
        GameHelper.clear(elements.gameCanvas);
        GameHelper.text("Oyun Durduruldu.", 150, 200, '#aaa');
    },

    update(currentTime) {
        if (GameHelper.keys['a'] || GameHelper.keys['ArrowLeft']) this.player.x = Math.max(0, this.player.x - this.player.speed);
        if (GameHelper.keys['d'] || GameHelper.keys['ArrowRight']) this.player.x = Math.min(elements.gameCanvas.width - this.player.width, this.player.x + this.player.speed);
        if ((GameHelper.keys[' '] || GameHelper.keys['Enter']) && this.canShoot()) this.shoot();

        this.bullets = this.bullets.filter(bullet => { bullet.y -= 7; return bullet.y > 0; });
        this.alienBullets = this.alienBullets.filter(bullet => { bullet.y += 5; return bullet.y < elements.gameCanvas.height; });

        let moveDown = false;
        let activeAliens = this.aliens.filter(a => a.alive);
        if(activeAliens.length === 0) { this.alienSpeed += 0.5; this.reset(); return; }

        activeAliens.forEach(alien => {
            alien.x += this.alienSpeed * this.alienDirection;
            if (alien.x <= 0 || alien.x + alien.width >= elements.gameCanvas.width) moveDown = true;
        });

        if (moveDown) {
            this.alienDirection *= -1;
            this.aliens.forEach(alien => alien.y += 20);
        }

        if (currentTime - this.lastAlienShot > 1000 && activeAliens.length > 0) {
            const shooter = activeAliens[Math.floor(Math.random() * activeAliens.length)];
            this.alienBullets.push({ x: shooter.x + shooter.width / 2, y: shooter.y + shooter.height });
            this.lastAlienShot = currentTime;
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.aliens.length - 1; j >= 0; j--) {
                if (this.aliens[j].alive && this.isColliding(this.bullets[i], this.aliens[j])) {
                    this.bullets.splice(i, 1);
                    this.aliens[j].alive = false;
                    this.score += 10;
                    break;
                }
            }
        }

        for (let i = this.alienBullets.length - 1; i >= 0; i--) {
            if (this.isColliding(this.alienBullets[i], this.player)) {
                this.alienBullets.splice(i, 1);
                this.lives--;
                if (this.lives <= 0) { this.stop(); UI.showToast("Space Invaders oyunu bitti! Skor: " + this.score); }
                break;
            }
        }
    },

    draw() {
        GameHelper.clear(elements.gameCanvas);
        GameHelper.rect(0, 0, elements.gameCanvas.width, elements.gameCanvas.height, '#000');
        GameHelper.rect(this.player.x, elements.gameCanvas.height - 30, this.player.width, this.player.height, '#0af');
        this.aliens.forEach(alien => {
            if(alien.alive) {
                GameHelper.rect(alien.x, alien.y, alien.width, alien.height, '#f0f');
                GameHelper.rect(alien.x + 5, alien.y + 5, 5, 5, '#000');
                GameHelper.rect(alien.x + 20, alien.y + 5, 5, 5, '#000');
            }
        });
        this.bullets.forEach(bullet => GameHelper.rect(bullet.x - 2, bullet.y, 4, 10, '#ff0'));
        this.alienBullets.forEach(bullet => GameHelper.rect(bullet.x - 2, bullet.y, 4, 10, '#f00'));
        GameHelper.text(`Skor: ${this.score}`, 10, 25, '#fff', '18px');
        GameHelper.text(`Can: ${'❤️'.repeat(this.lives)}`, 10, 45, '#fff', '18px');
    },

    canShoot() { return this.bullets.length === 0 || this.bullets[this.bullets.length - 1].y < elements.gameCanvas.height - 100; },
    shoot() { this.bullets.push({ x: this.player.x + this.player.width / 2, y: elements.gameCanvas.height - 30 }); },
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width && obj1.x + 4 > obj2.x && obj1.y < obj2.y + obj2.height && obj1.y + 10 > obj2.y;
    }
};

const Games = {
    stopAll: () => {
        if (gameAnimationFrame) cancelAnimationFrame(gameAnimationFrame);
        gameAnimationFrame = null;
        activeGame = null;
        currentGameInstance = null;
        if(elements.gameCanvas) GameHelper.clear(elements.gameCanvas);
    }
};

document.getElementById('play-snake')?.addEventListener('click', () => {
    Games.stopAll();
    SnakeGame.init(elements.gameCanvas);
    SnakeGame.start();
});
document.getElementById('play-space')?.addEventListener('click', () => {
    Games.stopAll();
    SpaceInvadersGame.init(elements.gameCanvas);
    SpaceInvadersGame.start();
});

// ==========================================
// 💬 8. CHATBOT
// ==========================================
const Chatbot = {
    messages: [
        { type: 'bot', text: "Merhaba! BİFTEK Konu Asistanı'na hoş geldin." },
        { type: 'bot', text: "Hangi alanda yazı yazmak istersin?" }
    ],
    init: () => {
        const toggleBtn = document.getElementById('chatbot-toggle');
        const sendBtn = document.getElementById('send-msg');
        const input = document.getElementById('msg-input');
        
        if(toggleBtn) toggleBtn.addEventListener('click', Chatbot.toggle);
        if(sendBtn) sendBtn.addEventListener('click', Chatbot.sendMessage);
        if(input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') Chatbot.sendMessage(); });
        Chatbot.render();
    },
    toggle: () => {
        if(elements.chatbotWindow) {
            elements.chatbotWindow.classList.toggle('open');
            if(elements.chatbotWindow.classList.contains('open')) setTimeout(() => document.getElementById('msg-input')?.focus(), 100);
        }
    },
    sendMessage: () => {
        const input = document.getElementById('msg-input');
        const msg = input?.value.trim();
        if (!msg) return;
        Chatbot.addMessage('user', msg);
        if(input) input.value = '';
        setTimeout(() => {
            Chatbot.addMessage('bot', Chatbot.getBotResponse(msg));
        }, 600);
    },
    addMessage: (type, text) => {
        Chatbot.messages.push({ type, text });
        Chatbot.render();
        Chatbot.scrollToBottom();
    },
    getBotResponse: (userMsg) => {
        const lowerMsg = userMsg.toLowerCase();
        if (lowerMsg.includes("merhaba")) return "Merhaba! Size nasıl yardımcı olabilirim?";
        if (lowerMsg.includes("robot")) return "Robotik harika! Arduino sensörleri veya otonom araçlar üzerine yazabilirsin.";
        if (lowerMsg.includes("kod")) return "Python ile veri analizi veya JavaScript ile web projeleri popülerdir.";
        if (lowerMsg.includes("teknoloji")) return "Yapay Zeka, Siber Güvenlik ve IoT güncel konulardır.";
        const suggestions = ["Kuantum Bilgisayarlar", "Mars Kolonizasyonu", "CRISPR Gen Düzenleme", "Füzyon Enerjisi"];
        return `Belki şuna değinmek istersin: "${suggestions[Math.floor(Math.random() * suggestions.length)]}"`;
    },
    render: () => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        container.innerHTML = Chatbot.messages.map(m => `<div class="msg ${m.type}">${m.text}</div>`).join('');
    },
    scrollToBottom: () => {
        const container = document.getElementById('chat-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }
};

// ==========================================
// 👩‍💻 9. YAZAR PANELİ
// ==========================================
const WriterPanel = {
    init: () => {
        const publishBtn = document.getElementById('wp-publish');
        const aiImgBtn = document.getElementById('wp-ai-image');
        const contentArea = document.getElementById('wp-content');
        
        if(publishBtn) publishBtn.addEventListener('click', WriterPanel.publish);
        if(aiImgBtn) {
            aiImgBtn.addEventListener('click', () => {
                const cat = document.getElementById('wp-cat').value;
                const randomUrl = `https://picsum.photos/seed/${cat}${Math.random()}/800/600`;
                document.getElementById('wp-cover').value = randomUrl;
                UI.showToast("Görsel önerildi!");
            });
        }
        if(contentArea) {
            contentArea.addEventListener('input', () => {
                const text = contentArea.value;
                const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
                document.getElementById('word-count').textContent = words;
                document.getElementById('read-time').textContent = Math.ceil(words / 200);
                localStorage.setItem('bifteck_draft', text);
            });
            const draft = localStorage.getItem('bifteck_draft');
            if(draft) { contentArea.value = draft; contentArea.dispatchEvent(new Event('input')); }
        }
        WriterPanel.loadMyArticles();
    },
    publish: async () => {
        const title = document.getElementById('wp-title').value;
        const content = document.getElementById('wp-content').value;
        const category = document.getElementById('wp-cat').value;
        const cover = document.getElementById('wp-cover').value;
        const sourcesRaw = document.getElementById('wp-sources').value;

        if (!title || !content) return UI.showToast("Başlık ve içerik zorunludur.");

        const sources = sourcesRaw.split('\n').filter(l => l.trim() !== '').map(line => {
            const parts = line.split(',');
            return { title: parts[0]?.trim(), url: parts[1]?.trim() || '#' };
        });

        try {
            await addDoc(collection(db, "articles"), {
                title, content, category, cover: cover || '', sources,
                authorId: currentUser.uid,
                authorName: currentUser.displayName || currentUser.email.split('@')[0],
                createdAt: serverTimestamp(),
                excerpt: content.substring(0, 150)
            });
            localStorage.removeItem('bifteck_draft');
            UI.showToast("Makale yayınlandı!");
            document.getElementById('wp-title').value = '';
            document.getElementById('wp-content').value = '';
            document.getElementById('wp-cover').value = '';
            document.getElementById('wp-sources').value = '';
            document.getElementById('word-count').textContent = '0';
            document.getElementById('read-time').textContent = '0';
            WriterPanel.loadMyArticles();
        } catch (error) {
            UI.showToast("Yayın hatası: " + error.message);
        }
    },
    loadMyArticles: async () => {
        if (!currentUser) return;
        const listEl = document.getElementById('my-articles-list');
        if (!listEl) return;
        try {
            const q = query(collection(db, "articles"), where("authorId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            listEl.innerHTML = '';
            if (snapshot.empty) {
                listEl.innerHTML = '<p style="color:var(--text-secondary); font-size:14px; text-align:center; padding:20px;">Henüz yazınız yok.</p>';
                return;
            }
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const item = document.createElement('div');
                item.style.cssText = "background:var(--card-bg); padding:15px; border-radius:12px; box-shadow:0 2px 5px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px;";
                item.innerHTML = `
                    <div style="flex:1; min-width:200px;">
                        <div style="font-weight:600; color:var(--text-primary);">${data.title}</div>
                        <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                            <span style="background:rgba(0,113,227,0.1); color:var(--accent); padding:2px 6px; border-radius:6px; font-weight:600;">${data.category}</span>
                            <span style="margin-left:10px;">${new Date(data.createdAt.seconds * 1000).toLocaleDateString('tr-TR')}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn btn-sm btn-outline" onclick="alert('Düzenleme yakında eklenecek.')">Düzenle</button>
                        <button class="btn btn-sm btn-danger" onclick="window.writerPanelDelete('${docSnap.id}')">Sil</button>
                    </div>
                `;
                listEl.appendChild(item);
            });
        } catch (error) {
            console.error("Yükleme hatası:", error);
            listEl.innerHTML = '<p style="color:var(--danger);">Hata oluştu.</p>';
        }
    },
    delete: async (id) => {
        if (!confirm("Silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, "articles", id));
            UI.showToast("Makale silindi.");
            WriterPanel.loadMyArticles();
        } catch (error) {
            UI.showToast("Silme hatası: " + error.message);
        }
    }
};

// ==========================================
// 👨‍💼 10. YÖNETİCİ PANELİ
// ==========================================
const AdminPanel = {
    load: async () => {
        AdminPanel.loadApplications();
        AdminPanel.loadUsers();
        AdminPanel.loadArticles();
        AdminPanel.loadStats();
    },
    loadStats: async () => {
        try {
            const usersSnap = await getDocs(collection(db, "users"));
            const artsSnap = await getDocs(collection(db, "articles"));
            const appsSnap = await getDocs(query(collection(db, "applications"), where("status", "==", "pending")));
            document.getElementById('stat-users').textContent = usersSnap.size;
            document.getElementById('stat-articles').textContent = artsSnap.size;
            document.getElementById('stat-apps').textContent = appsSnap.size;
        } catch (e) { console.error(e); }
    },
    loadApplications: async () => {
        const listEl = document.getElementById('admin-app-list');
        if (!listEl) return;
        try {
            const snapshot = await getDocs(query(collection(db, "applications"), where("status", "==", "pending")));
            listEl.innerHTML = '';
            if (snapshot.empty) { listEl.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">Bekleyen başvuru yok.</p>'; return; }
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const item = document.createElement('div');
                item.style.cssText = "background:var(--card-bg); padding:15px; border-radius:12px; box-shadow:0 2px 5px rgba(0,0,0,0.05); margin-bottom:10px;";
                item.innerHTML = `
                    <div style="font-weight:600; color:var(--text-primary); margin-bottom:5px;">${data.displayName} <span style="font-weight:400; color:var(--text-secondary); font-size:13px;">(${data.email})</span></div>
                    <div style="font-size:13px; color:var(--accent); margin-bottom:5px;"><strong>Uzmanlık:</strong> ${data.expertise || '-'}</div>
                    <div style="font-size:13px; color:var(--text-secondary); margin-bottom:10px; font-style:italic;">"${data.motivation}"</div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn btn-sm btn-primary" onclick="window.adminApprove('${docSnap.id}', '${data.uid}')">Onayla</button>
                        <button class="btn btn-sm btn-danger" onclick="window.adminReject('${docSnap.id}')">Reddet</button>
                    </div>
                `;
                listEl.appendChild(item);
            });
        } catch (error) { console.error(error); }
    },
    approve: async (docId, userId) => {
        if(!confirm("Onaylamak istiyor musunuz?")) return;
        try {
            await updateDoc(doc(db, "users", userId), { role: 'author' });
            await deleteDoc(doc(db, "applications", docId));
            UI.showToast("Yazar onaylandı!");
            AdminPanel.load();
        } catch (error) { UI.showToast("Hata: " + error.message); }
    },
    reject: async (docId) => {
        if(!confirm("Reddetmek istiyor musunuz?")) return;
        try {
            await deleteDoc(doc(db, "applications", docId));
            UI.showToast("Başvuru reddedildi.");
            AdminPanel.load();
        } catch (error) { UI.showToast("Hata: " + error.message); }
    },
    loadUsers: async () => {
        const listEl = document.getElementById('admin-user-list');
        if (!listEl) return;
        try {
            const snapshot = await getDocs(collection(db, "users"));
            listEl.innerHTML = '';
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const item = document.createElement('div');
                item.style.cssText = "background:var(--card-bg); padding:10px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;";
                const roleColor = data.role === 'admin' ? 'var(--danger)' : (data.role === 'author' ? 'var(--accent)' : 'var(--text-secondary)');
                item.innerHTML = `
                    <div>
                        <div style="font-weight:600; font-size:14px;">${data.displayName || 'İsimsiz'}</div>
                        <div style="font-size:12px; color:var(--text-secondary);">${data.email}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:12px; font-weight:700; color:${roleColor}; background:rgba(0,0,0,0.05); padding:4px 8px; border-radius:6px;">${data.role}</span>
                        ${data.role !== 'admin' ? `<button class="btn btn-sm btn-outline" onclick="window.adminPromote('${docSnap.id}')">Yükselt</button>` : ''}
                    </div>
                `;
                listEl.appendChild(item);
            });
        } catch (error) { console.error(error); }
    },
    promote: async (userId) => {
        if (!confirm("Yönetici yapmak istiyor musunuz?")) return;
        try {
            await updateDoc(doc(db, "users", userId), { role: 'admin' });
            UI.showToast("Kullanıcı yönetici yapıldı.");
            AdminPanel.load();
        } catch (error) { UI.showToast("Hata: " + error.message); }
    },
    loadArticles: async () => {
        const listEl = document.getElementById('admin-article-list');
        if (!listEl) return;
        try {
            const snapshot = await getDocs(query(collection(db, "articles"), orderBy("createdAt", "desc"), limit(20)));
            listEl.innerHTML = '';
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const item = document.createElement('div');
                item.style.cssText = "background:var(--card-bg); padding:10px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;";
                item.innerHTML = `
                    <div style="flex:1; min-width:200px;">
                        <div style="font-weight:600; font-size:14px; color:var(--text-primary);">${data.title}</div>
                        <div style="font-size:11px; color:var(--text-secondary);">${data.authorName} • ${new Date(data.createdAt.seconds * 1000).toLocaleDateString('tr-TR')}</div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="window.adminDeleteArticle('${docSnap.id}')">Sil</button>
                `;
                listEl.appendChild(item);
            });
        } catch (error) { console.error(error); }
    },
    deleteArticle: async (articleId) => {
        if (!confirm("Silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, "articles", articleId));
            UI.showToast("Makale silindi.");
            AdminPanel.load();
        } catch (error) { UI.showToast("Hata: " + error.message); }
    }
};

// ==========================================
// 🧩 11. GLOBAL FONKSİYONLAR
// ==========================================
window.app = {
    showHome: () => { NewsFeed.init(); UI.showSection('home'); },
    closeModals: () => UI.closeAllModals(),
    switchModal: (from, to) => { UI.toggleModal(from, false); setTimeout(() => UI.toggleModal(to, true), 300); }
};

window.writerPanelDelete = (id) => WriterPanel.delete(id);
window.adminApprove = (docId, userId) => AdminPanel.approve(docId, userId);
window.adminReject = (docId) => AdminPanel.reject(docId);
window.adminPromote = (userId) => AdminPanel.promote(userId);
window.adminDeleteArticle = (id) => AdminPanel.deleteArticle(id);
window.games = Games;

// ==========================================
// 🚀 12. BAŞLATMA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.setAttribute('data-theme', 'dark');
    
    const themeToggle = document.getElementById('theme-toggle');
    if(themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            if(isDark) { document.body.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); }
            else { document.body.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
        });
    }

    Auth.init();
    NewsFeed.init();
    Chatbot.init();

    window.onclick = (event) => {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            if (event.target === modal) UI.toggleModal(modal.id, false);
        });
    };

    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');
    if (articleId) {
        UI.showSection('article');
        document.getElementById('detail-title').textContent = "Haber Yükleniyor...";
        document.getElementById('detail-content').innerHTML = "<p>Lütfen bekleyin...</p>";
        getDoc(doc(db, "articles", articleId)).then(docSnap => {
            if(docSnap.exists()) ArticleDetail.open(articleId, docSnap.data());
            else { UI.showToast("Haber bulunamadı."); window.app.showHome(); }
        }).catch(err => { console.error(err); UI.showToast("Hata oluştu."); window.app.showHome(); });
    } else {
        UI.showSection('home');
    }
    console.log("🚀 BİFTEK Başlatıldı!");
});