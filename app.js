// BİFTEK - Bilim, Fen ve Teknoloji Kulübü Haber Sitesi
// Faz 2: Firebase Authentication ve Firestore Entegrasyonu

// ============================================
// FIREBASE CONFIGURATION
// ============================================
// NOT: Bu bilgileri kendi Firebase projenizden almalısınız.
// Firebase Console > Project Settings > General > Your apps > SDK setup and configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// GLOBAL DEĞİŞKENLER
// ============================================
let currentUser = null;

// ============================================
// SAYFA YÜKLENDİĞİNDE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    
    // Auth state değişikliklerini dinle
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            updateUIForLoggedInUser(user);
        } else {
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    });

    // Modal Elementleri
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const guestButtons = document.getElementById('guestButtons');
    const profileMenu = document.getElementById('profileMenu');
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    // ============================================
    // MODAL AÇMA/KAPAMA FONKSİYONLARI
    // ============================================
    function openLoginModal() {
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLoginModal() {
        loginModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function openRegisterModal() {
        registerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeRegisterModal() {
        registerModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Giriş Yap butonu
    const loginBtn = document.querySelector('.btn-login');
    loginBtn.addEventListener('click', openLoginModal);

    // Kayıt Ol butonu
    const registerBtn = document.querySelector('.btn-register');
    registerBtn.addEventListener('click', openRegisterModal);

    // Modal kapatma butonları
    document.getElementById('closeLoginModal').addEventListener('click', closeLoginModal);
    document.getElementById('closeRegisterModal').addEventListener('click', closeRegisterModal);

    // Modal dışına tıklayınca kapat
    loginModal.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            closeLoginModal();
        }
    });

    registerModal.addEventListener('click', function(e) {
        if (e.target === registerModal) {
            closeRegisterModal();
        }
    });

    // Login modalından kayıt modalına geçiş
    document.getElementById('showRegisterFromLogin').addEventListener('click', function(e) {
        e.preventDefault();
        closeLoginModal();
        setTimeout(openRegisterModal, 300);
    });

    // Register modalından login modalına geçiş
    document.getElementById('showLoginFromRegister').addEventListener('click', function(e) {
        e.preventDefault();
        closeRegisterModal();
        setTimeout(openLoginModal, 300);
    });

    // ============================================
    // PROFİL MENÜSÜ
    // ============================================
    profileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        profileBtn.classList.toggle('active');
        profileDropdown.classList.toggle('active');
    });

    // Profil menüsü dışına tıklayınca kapat
    document.addEventListener('click', function(e) {
        if (!profileMenu.contains(e.target)) {
            profileBtn.classList.remove('active');
            profileDropdown.classList.remove('active');
        }
    });

    // Çıkış Yap butonu
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });

    // Yazar Ol butonu
    document.getElementById('becomeWriterBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Yazar başvuru formu yakında eklenecek!', 'info');
    });

    // ============================================
    // GİRİŞ YAPMA FORMU
    // ============================================
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        try {
            // Loading状态
            submitBtn.classList.add('btn-loading');
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // E-posta doğrulama kontrolü
            if (!user.emailVerified) {
                showToast('Lütfen e-posta adresinizi doğrulayın.', 'error');
                await auth.signOut();
                closeLoginModal();
                return;
            }

            showToast('Giriş başarılı! Hoş geldiniz.', 'success');
            closeLoginModal();
            loginForm.reset();
        } catch (error) {
            console.error('Giriş hatası:', error);
            let errorMessage = 'Giriş yapılırken bir hata oluştu.';
            
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Hatalı şifre.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Geçersiz e-posta adresi.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Bu hesap devre dışı bırakılmış.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.';
                    break;
            }
            
            showToast(errorMessage, 'error');
        } finally {
            submitBtn.classList.remove('btn-loading');
        }
    });

    // ============================================
    // KAYIT OLMA FORMU
    // ============================================
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        // Şifre eşleşme kontrolü
        if (password !== passwordConfirm) {
            showToast('Şifreler eşleşmiyor!', 'error');
            return;
        }

        // Şifre uzunluk kontrolü
        if (password.length < 6) {
            showToast('Şifre en az 6 karakter olmalıdır.', 'error');
            return;
        }

        try {
            submitBtn.classList.add('btn-loading');
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Kullanıcı bilgilerini Firestore'a kaydet
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                displayName: name,
                email: email,
                role: 'member', // member, writer, admin
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isWriterRequest: false
            });

            // E-posta doğrulama maili gönder
            await user.sendEmailVerification();

            showToast('Kayıt başarılı! Lütfen e-postanızı kontrol edin ve hesabınızı doğrulayın.', 'success');
            closeRegisterModal();
            registerForm.reset();
        } catch (error) {
            console.error('Kayıt hatası:', error);
            let errorMessage = 'Kayıt olurken bir hata oluştu.';
            
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Bu e-posta zaten kullanılıyor.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Geçersiz e-posta adresi.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Şifre çok zayıf. En az 6 karakter kullanın.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'E-posta/şifre ile kayıt devre dışı.';
                    break;
            }
            
            showToast(errorMessage, 'error');
        } finally {
            submitBtn.classList.remove('btn-loading');
        }
    });

    // ============================================
    // GOOGLE İLE GİRİŞ
    // ============================================
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    googleLoginBtn.addEventListener('click', async function() {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // Yeni kullanıcıysa Firestore'a kaydet
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    role: 'member',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isWriterRequest: false
                });
            }

            showToast('Google ile giriş başarılı!', 'success');
            closeLoginModal();
        } catch (error) {
            console.error('Google giriş hatası:', error);
            let errorMessage = 'Google ile giriş yapılırken bir hata oluştu.';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Giriş penceresi kapatıldı.';
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = 'Bu e-posta farklı bir yöntemle zaten kayıtlı.';
            }
            
            showToast(errorMessage, 'error');
        }
    });

    // ============================================
    // GOOGLE İLE KAYIT
    // ============================================
    const googleRegisterBtn = document.getElementById('googleRegisterBtn');
    googleRegisterBtn.addEventListener('click', async function() {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // Kullanıcı bilgilerini Firestore'a kaydet
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                role: 'member',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isWriterRequest: false
            }, { merge: true });

            showToast('Google ile kayıt başarılı!', 'success');
            closeRegisterModal();
        } catch (error) {
            console.error('Google kayıt hatası:', error);
            let errorMessage = 'Google ile kayıt yapılırken bir hata oluştu.';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Kayıt penceresi kapatıldı.';
            }
            
            showToast(errorMessage, 'error');
        }
    });

    // ============================================
    // KATEGORİ FİLTRELEME (Faz 1'den kalan)
    // ============================================
    const categoryButtons = document.querySelectorAll('.category-btn');
    const newsCards = document.querySelectorAll('.news-card');

    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const selectedCategory = this.getAttribute('data-category');

            newsCards.forEach(card => {
                if (selectedCategory === 'all') {
                    card.style.display = 'block';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.style.transition = 'opacity 0.4s ease';
                        card.style.opacity = '1';
                    }, 50);
                } else {
                    const cardCategory = card.querySelector('.news-category').textContent.toLowerCase();
                    
                    let isVisible = false;
                    switch(selectedCategory) {
                        case 'fizik':
                            isVisible = cardCategory.includes('fizik');
                            break;
                        case 'cevre':
                            isVisible = cardCategory.includes('çevre') || cardCategory.includes('dünya');
                            break;
                        case 'teknoloji':
                            isVisible = cardCategory.includes('teknoloji');
                            break;
                        case 'uzay':
                            isVisible = cardCategory.includes('uzay');
                            break;
                        case 'girisimcilik':
                            isVisible = cardCategory.includes('girişimcilik');
                            break;
                        case 'tip':
                            isVisible = cardCategory.includes('tıp') || cardCategory.includes('sağlık');
                            break;
                        case 'sosyal':
                            isVisible = cardCategory.includes('sosyal');
                            break;
                        default:
                            isVisible = true;
                    }

                    if (isVisible) {
                        card.style.display = 'block';
                        card.style.opacity = '0';
                        setTimeout(() => {
                            card.style.transition = 'opacity 0.4s ease';
                            card.style.opacity = '1';
                        }, 50);
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    });

    // ============================================
    // NAVBAR SCROLL EFEKTİ (Faz 1'den kalan)
    // ============================================
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.85)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.7)';
            navbar.style.boxShadow = 'none';
        }
        lastScrollY = window.scrollY;
    });

    // ============================================
    // YARDIMCI FONKSİYONLAR
    // ============================================
    
    // UI'yi giriş yapmış kullanıcıya göre güncelle
    function updateUIForLoggedInUser(user) {
        guestButtons.style.display = 'none';
        profileMenu.style.display = 'block';

        // Profil bilgilerini güncelle
        const profileName = document.getElementById('profileName');
        const profileAvatar = document.getElementById('profileAvatar');
        const dropdownEmail = document.getElementById('dropdownEmail');
        const dropdownRole = document.getElementById('dropdownRole');

        const displayName = user.displayName || user.email.split('@')[0];
        const initial = displayName.charAt(0).toUpperCase();

        profileName.textContent = displayName;
        profileAvatar.textContent = initial;
        dropdownEmail.textContent = user.email;

        // Kullanıcı rolünü getir
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const roleText = getRoleText(userData.role);
                dropdownRole.textContent = roleText;

                // Yazar veya admin ise "Yazar Ol" butonunu gizle
                const becomeWriterBtn = document.getElementById('becomeWriterBtn');
                if (userData.role === 'writer' || userData.role === 'admin') {
                    becomeWriterBtn.style.display = 'none';
                } else {
                    becomeWriterBtn.style.display = 'flex';
                }
            }
        });
    }

    // UI'yi çıkış yapmış kullanıcıya göre güncelle
    function updateUIForLoggedOutUser() {
        guestButtons.style.display = 'flex';
        profileMenu.style.display = 'none';
        profileBtn.classList.remove('active');
        profileDropdown.classList.remove('active');
    }

    // Rol metnini al
    function getRoleText(role) {
        switch(role) {
            case 'admin':
                return 'Yönetici';
            case 'writer':
                return 'Yazar';
            case 'member':
            default:
                return 'Üye';
        }
    }

    // Çıkış yap
    async function logout() {
        try {
            await auth.signOut();
            showToast('Çıkış yapıldı.', 'success');
            profileBtn.classList.remove('active');
            profileDropdown.classList.remove('active');
        } catch (error) {
            console.error('Çıkış hatası:', error);
            showToast('Çıkış yapılırken bir hata oluştu.', 'error');
        }
    }

    // Toast bildirimi göster
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        toastMessage.textContent = message;
        toast.className = 'toast';
        
        if (type === 'success') {
            toast.classList.add('success');
        } else if (type === 'error') {
            toast.classList.add('error');
        }

        toast.classList.add('active');

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    // Haber kartlarına tıklama efekti
    newsCards.forEach(card => {
        card.addEventListener('click', function() {
            console.log('Haber kartı tıklandı:', this.querySelector('.news-title').textContent);
        });
    });

    // Smooth scroll animasyonu
    const newsSection = document.querySelector('.news-section');
    newsSection.style.opacity = '0';
    newsSection.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        newsSection.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        newsSection.style.opacity = '1';
        newsSection.style.transform = 'translateY(0)';
    }, 100);

    console.log('BİFTEK Haber Sitesi başarıyla yüklendi!');
    console.log('Firebase Auth ve Firestore entegre edildi.');
});


// ============================================
// FAZ 8: KAYNAKÇA, PAYLAŞIM, KONU ASİSTANI VE OYUNLAR
// ============================================

const topicAssistant = {
    topicPool: ["Kuantum İnternet", "CRISPR Gen Düzenleme", "Mars Kolonizasyonu", "Yapay Sinir Ağları", "Füzyon Enerjisi", "Nöromorfik Bilgisayar", "Biyo-yazıcılar", "Karanlık Madde", "6G Teknolojisi", "Sentetik Biyoloji"],
    
    async getWrittenTopics() {
        try {
            const snapshot = await db.collection('articles').get();
            const topics = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.title) topics.push(data.title.toLowerCase());
            });
            return topics;
        } catch (error) { return []; }
    },
    
    async suggestTopic() {
        const written = await this.getWrittenTopics();
        const available = this.topicPool.filter(t => !written.some(w => t.toLowerCase().includes(w)));
        return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : "Kendi konunu oluştur!";
    },
    
    async sendMessage(msg) {
        const div = document.getElementById('assistantMessages');
        div.appendChild(Object.assign(document.createElement('div'), {className:'assistant-message user', textContent:msg}));
        const bot = Object.assign(document.createElement('div'), {className:'assistant-message bot', textContent:'Öneri hazırlanıyor...'});
        div.appendChild(bot);
        const sug = await this.suggestTopic();
        setTimeout(() => { bot.textContent = '📝 Öneri: '+sug; div.scrollTop = div.scrollHeight; }, 1000);
    }
};

const gameEngine = {
    snakeGame: null, invadersGame: null, platformGame: null,
    
    startSnake() {
        const canvas = document.getElementById('snakeCanvas'), ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('snakeScore'), gridSize = 20;
        let snake = [{x:10,y:10}], food = {x:15,y:15}, dx=1, dy=0, score=0;
        
        const draw = () => {
            ctx.fillStyle='#1d1d1f'; ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.fillStyle='#34a853'; snake.forEach(s => { ctx.beginPath(); ctx.arc(s.x*gridSize+10,s.y*gridSize+10,8,0,Math.PI*2); ctx.fill(); });
            ctx.fillStyle='#667eea'; ctx.beginPath(); ctx.arc(food.x*gridSize+10,food.y*gridSize+10,8,0,Math.PI*2); ctx.fill();
        };
        
        const update = () => {
            const head = {x:snake[0].x+dx, y:snake[0].y+dy};
            if(head.x<0||head.x>=20||head.y<0||head.y>=20||snake.some(s=>s.x===head.x&&s.y===head.y)) { clearInterval(loop); alert('Skor:'+score); return; }
            snake.unshift(head);
            if(head.x===food.x&&head.y===food.y) { score+=10; scoreEl.textContent=score; food={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}; }
            else snake.pop();
        };
        
        const keyHandler = e => { if(e.key==='ArrowUp'&&dy!==1){dx=0;dy=-1;} if(e.key==='ArrowDown'&&dy!==-1){dx=0;dy=1;} if(e.key==='ArrowLeft'&&dx!==1){dx=-1;dy=0;} if(e.key==='ArrowRight'&&dx!==-1){dx=1;dy=0;} };
        document.addEventListener('keydown',keyHandler);
        const loop = setInterval(()=>{update();draw();},150);
        this.snakeGame = {stop:()=>{clearInterval(loop);document.removeEventListener('keydown',keyHandler);}};
    },
    
    startInvaders() {
        const canvas=document.getElementById('invadersCanvas'), ctx=canvas.getContext('2d'), scoreEl=document.getElementById('invadersScore');
        const player={x:180,y:450,w:40,h:30}, bullets=[], asteroids=[]; let score=0, keys={};
        
        const draw = () => {
            ctx.fillStyle='#1d1d1f'; ctx.fillRect(0,0,400,500);
            ctx.fillStyle='#34a853'; ctx.beginPath(); ctx.moveTo(player.x+20,player.y); ctx.lineTo(player.x+40,player.y+30); ctx.lineTo(player.x,player.y+30); ctx.closePath(); ctx.fill();
            ctx.fillStyle='#ea4335'; bullets.forEach(b=>ctx.fillRect(b.x-2,b.y,4,10));
            ctx.fillStyle='#86868b'; asteroids.forEach(a=>{ctx.beginPath();ctx.arc(a.x+15,a.y+15,15,0,Math.PI*2);ctx.fill();});
        };
        
        const update = () => {
            if(keys['ArrowLeft']&&player.x>0) player.x-=5; if(keys['ArrowRight']&&player.x<360) player.x+=5;
            bullets=bullets.filter(b=>{b.y-=10;return b.y>0;});
            asteroids=asteroids.filter(a=>{a.y+=a.spd; bullets.forEach((b,bi)=>{if(b.x>a.x&&b.x<a.x+30&&b.y>a.y&&b.y<a.y+30){asteroids.splice(asteroids.indexOf(a),1);bullets.splice(bi,1);score+=100;scoreEl.textContent=score;}}); if(a.y>500){clearInterval(loop);alert('Skor:'+score);} return a.y<=500;});
            if(Math.random()<0.03) asteroids.push({x:Math.random()*370,y:-30,spd:2+Math.random()*2});
        };
        
        canvas.addEventListener('keydown',e=>keys[e.key]=true); canvas.addEventListener('keyup',e=>keys[e.key]=false);
        canvas.addEventListener('click',()=>bullets.push({x:player.x+20,y:player.y})); canvas.setAttribute('tabindex','0'); canvas.focus();
        const loop=setInterval(()=>{update();draw();},50);
        this.invadersGame={stop:()=>clearInterval(loop)};
    },
    
    startPlatformGame() {
        const canvas=document.getElementById('platformCanvas'), ctx=canvas.getContext('2d');
        const p={x:50,y:300,w:30,h:30,vx:0,vy:0,g:false}, plats=[{x:0,y:350,w:800,h:50},{x:200,y:280,w:100,h:20},{x:400,y:220,w:100,h:20},{x:600,y:160,w:100,h:20}], goal={x:720,y:120,w:40,h:40};
        let keys={}, running=true;
        
        const upd=()=>{if(!running)return; if(keys['ArrowRight'])p.vx++;if(keys['ArrowLeft'])p.vx--;if(keys[' ']&&p.g){p.vy=-12;p.g=false;} p.vx*=0.8;p.vy+=0.5;p.x+=p.vx;p.y+=p.vy;p.g=false; plats.forEach(pl=>{if(p.x<pl.x+pl.w&&p.x+p.w>pl.x&&p.y+p.h>pl.y&&p.y+p.h<pl.y+pl.h+20&&p.vy>=0){p.g=true;p.vy=0;p.y=pl.y-p.h;}}); if(p.x<0)p.x=0;if(p.x>770)p.x=770;if(p.y>400){p.x=50;p.y=300;p.vx=0;p.vy=0;} if(p.x<goal.x+goal.w&&p.x+p.w>goal.x&&p.y<goal.y+goal.h&&p.y+p.h>goal.y){running=false;alert('Tamamlandı!');}};
        const drw=()=>{ctx.fillStyle='#000';ctx.fillRect(0,0,800,400);ctx.fillStyle='#667eea';plats.forEach(pl=>ctx.fillRect(pl.x,pl.y,pl.w,pl.h));ctx.fillStyle='#34a853';ctx.fillRect(goal.x,goal.y,goal.w,goal.h);ctx.fillStyle='#ea4335';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#fff';ctx.fillRect(p.x+8,p.y+8,6,6);ctx.fillRect(p.x+18,p.y+8,6,6);};
        const loop=()=>{upd();drw();if(running)requestAnimationFrame(loop);};
        window.addEventListener('keydown',e=>keys[e.key]=true);window.addEventListener('keyup',e=>keys[e.key]=false);
        loop();this.platformGame={stop:()=>running=false};
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const at=document.getElementById('assistantToggle'),ap=document.getElementById('assistantPanel'),ac=document.getElementById('assistantClose'),as=document.getElementById('assistantSendBtn'),ai=document.getElementById('assistantInput');
    if(at)at.onclick=()=>ap.style.display=ap.style.display==='none'?'block':'none';
    if(ac)ac.onclick=()=>ap.style.display='none';
    if(as)as.onclick=()=>{if(ai.value.trim()){topicAssistant.sendMessage(ai.value.trim());ai.value='';}};
    if(ai)ai.onkeypress=e=>{if(e.key==='Enter'&&ai.value.trim()){topicAssistant.sendMessage(ai.value.trim());ai.value='';}};
    
    const bm=document.getElementById('breakRoomModal'),bw=document.getElementById('becomeWriterBtn');
    if(bw){const br=document.createElement('a');br.href='#';br.className='dropdown-item';br.innerHTML='<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/></svg> Mola Ver';bw.parentNode.insertBefore(br,bw.nextSibling);br.onclick=e=>{e.preventDefault();bm.classList.add('active');};}
    
    document.querySelector('.play-snake-btn')?.onclick=()=>{document.querySelector('.game-selection').style.display='none';document.getElementById('snakeGameContainer').style.display='flex';gameEngine.startSnake();};
    document.querySelector('.play-invaders-btn')?.onclick=()=>{document.querySelector('.game-selection').style.display='none';document.getElementById('invadersGameContainer').style.display='flex';gameEngine.startInvaders();};
    document.getElementById('stopSnakeBtn')?.onclick=()=>{if(gameEngine.snakeGame)gameEngine.snakeGame.stop();document.getElementById('snakeGameContainer').style.display='none';document.querySelector('.game-selection').style.display='grid';};
    document.getElementById('stopInvadersBtn')?.onclick=()=>{if(gameEngine.invadersGame)gameEngine.invadersGame.stop();document.getElementById('invadersGameContainer').style.display='none';document.querySelector('.game-selection').style.display='grid';};
    document.getElementById('closeBreakRoomModal')?.onclick=()=>{if(gameEngine.snakeGame)gameEngine.snakeGame.stop();if(gameEngine.invadersGame)gameEngine.invadersGame.stop();bm.classList.remove('active');document.getElementById('snakeGameContainer').style.display='none';document.getElementById('invadersGameContainer').style.display='none';document.querySelector('.game-selection').style.display='grid';};
    
    document.getElementById('startPlatformGame')?.onclick=()=>gameEngine.startPlatformGame();
    document.getElementById('goHome404')?.onclick=()=>{if(gameEngine.platformGame)gameEngine.platformGame.stop();document.getElementById('page404Modal').style.display='none';window.location.href='/';};
    
    console.log('FAZ 8: Kaynakça, Paylaşım, Konu Asistanı, Retro Oyunlar yüklendi');
});
