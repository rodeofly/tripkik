// script.js

const video = document.getElementById('camera');
const mainBtn = document.getElementById('mainBtn');
const statusDiv = document.getElementById('status');
const scoreBtns = document.getElementById('scoreBtns');
const gifContainer = document.getElementById('gifContainer');
const gifImage = document.getElementById('gifImage');
const downloadLink = document.getElementById('downloadLink');

let step = 0, cameraReady = false, tripkik = { frames: [] };
const SCORE_EMOJI = { 4: '⭐', 3: '👍', 2: '🤔', 1: '🚨' };
const RESTART_ICON = '🔄'; // Emoji flèche circulaire

// --- GESTION DES VUES (Simple Routage par Hash) ---
const updateView = () => {
    const hash = window.location.hash || '#home';
    document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden'));
    const target = document.querySelector(hash + '-view');
    if (target) {
        target.classList.remove('hidden');
    }

    if (hash === '#home') {
        // Logique pour s'assurer que le bouton d'accueil est remplacé par "Prêt ?"
        if (!cameraReady && step === 0) { 
            statusDiv.innerText = 'Cliquez sur le bouton pour démarrer et autoriser la caméra.';
            mainBtn.innerText = 'Prêt ?';
            mainBtn.classList.remove('hidden', 'bg-reunion-blue', 'bg-reunion-red', 'bg-gray-700');
            mainBtn.classList.add('bg-reunion-green');
            mainBtn.disabled = false;
            mainBtn.onclick = mainButtonHandler; // Rétablir le gestionnaire de clic normal
        } else if (cameraReady && step === 1) {
            mainBtn.innerText = 'Go !';
            mainBtn.classList.remove('hidden');
            mainBtn.classList.remove('bg-reunion-green', 'bg-reunion-red', 'bg-gray-700');
            mainBtn.classList.add('bg-reunion-blue');
            mainBtn.disabled = false;
            mainBtn.onclick = mainButtonHandler; 
        } else {
             // Si on est dans un état post-tripkik et qu'on revient à l'accueil
             if (step === 0 && !cameraReady) {
                 mainBtn.innerText = 'Prêt ?';
                 mainBtn.classList.remove('hidden', 'bg-reunion-blue', 'bg-reunion-red', 'bg-gray-700');
                 mainBtn.classList.add('bg-reunion-green');
                 mainBtn.disabled = false;
                 mainBtn.onclick = mainButtonHandler; 
             }
        }
    } else { 
        mainBtn.classList.add('hidden');
    }

    if (hash === '#historique') {
        renderHistory();
    }
};
window.addEventListener('hashchange', updateView);
window.addEventListener('load', updateView);


// --- GESTION DE LA CAMÉRA (Initialisation et Attente des Métadonnées) ---
const startCamera = () => new Promise(async (resolve, reject) => {
    statusDiv.innerText = 'Demande d\'accès à la caméra... Un instant !';
    mainBtn.disabled = true;
    try {
        // Tentative d'accès à la caméra
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        
        // Attendre la garantie que les dimensions sont chargées
        video.onloadedmetadata = () => {
            video.classList.remove('hidden');
            cameraReady = true;
            step = 1; 
            statusDiv.innerHTML = '<span class="text-reunion-blue">Allez Go !</span> Étape 1: Capture l\'énoncé.';
            mainBtn.innerText = 'Go !'; // Nom du bouton Étape 1
            mainBtn.disabled = false;
            mainBtn.classList.remove('bg-reunion-green', 'bg-reunion-red', 'bg-gray-700');
            mainBtn.classList.add('bg-reunion-blue');
            resolve(); 
        };
        video.onerror = reject;
        
    } catch (err) {
        console.error("Erreur d'accès à la caméra:", err);
        cameraReady = false;
        video.classList.add('hidden');
        
        // Message d'erreur avec icône de relance
        statusDiv.innerHTML = `<span class="text-reunion-red font-bold">Caméra bloquée.</span> <button id="retryCam" class="text-blue-600 underline">${RESTART_ICON} Réessayer</button>.`;
        document.getElementById('retryCam').onclick = () => startCamera().catch(() => {});
        
        mainBtn.innerText = 'Prêt ?'; // Réinitialiser le bouton si échec
        mainBtn.disabled = false;
        mainBtn.classList.remove('bg-reunion-blue', 'bg-reunion-red', 'bg-gray-700');
        mainBtn.classList.add('bg-reunion-green');
        reject(err);
    }
});

// Fonction sécurisée pour capturer une frame AVEC incrustation de texte
const captureFrame = (score = null) => {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error("Dimensions vidéo nulles. Échec de la capture.");
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; 
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // --- INCRUSTATION DU TEXTE (Si score est fourni) ---
    if (score !== null) {
        const emoji = SCORE_EMOJI[score];
        const text = `NOTE: ${score} ${emoji}`;
        const fontSize = canvas.height * 0.08;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; 
        ctx.fillRect(0, canvas.height - fontSize - 10, canvas.width, fontSize + 10);
        
        ctx.font = `${fontSize}px Poppins, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(text, canvas.width - 20, canvas.height - 10);
    }
    
    return canvas;
};

// --- COMPILATION ET CONTRÔLE DE FRÉQUENCE VARIABLE (GIF du tripkik) ---
const compileGifProof = (finalScore) => new Promise(resolve => {
    const duration_ms = tripkik.response - tripkik.start;
    const max_duration_ms = 3000; 
    
    const delay1 = Math.min(duration_ms, max_duration_ms); 
    const delay2 = 750; 

    // Ré-capture de la dernière frame AVEC l'incrustation de la note
    tripkik.frames[2] = { frame: captureFrame(finalScore), delay: 1000 }; 
    
    tripkik.frames[0].delay = delay1;
    tripkik.frames[1].delay = delay2;
    
    const gif = new GIF({
        workers: 2, 
        quality: 10,
        width: tripkik.frames[0].frame.width,
        height: tripkik.frames[0].frame.height,
        workerScript: './gif.worker.js' // Doit être local
    });

    gif.on('finished', (blob) => {
        const gifURL = URL.createObjectURL(blob);
        gifImage.src = gifURL;
        gifContainer.querySelector('p').innerText = 'Tripkik généré !';
        gifContainer.querySelector('.loading-spinner').classList.add('hidden'); 
        
        downloadLink.href = gifURL;
        downloadLink.classList.remove('hidden');
        downloadLink.setAttribute('download', `tripkik_preuve_${tripkik.api_result.problem_id}_${finalScore}.gif`);
        
        resolve();
    });

    tripkik.frames.forEach(item => {
        gif.addFrame(item.frame.getContext('2d'), { delay: item.delay, copy: true });
    });

    gif.render();
});

// --- LOGIQUE DU BOUTON PRINCIPAL ---
const mainButtonHandler = async () => {
    try {
        if (!cameraReady) {
            await startCamera(); 
            if (!cameraReady) return;
        } 
        
        const time = Date.now();
        
        if (step === 1) { 
            // Étape 1: Cliquer sur "Go !" -> Démarrer le Tripkik (la phase de capture réelle)
            tripkik.start = time;
            tripkik.frames = [{ frame: captureFrame(), delay: 0 }]; // Image 1
            step = 2; 
            mainBtn.innerText = 'Ok !?'; 
            statusDiv.innerHTML = '<span class="text-reunion-green font-bold">Top départ !</span> L\'élève est en action.';
            mainBtn.classList.remove('bg-reunion-blue');
            mainBtn.classList.add('bg-reunion-green'); 
        } else if (step === 2) { 
            // Étape 2: Cliquer sur "Ok !?" -> L'élève a répondu
            tripkik.response = time; 
            tripkik.frames.push({ frame: captureFrame(), delay: 0 }); // Image 2
            step = 3; 
            mainBtn.innerText = 'Stop !'; 
            statusDiv.innerHTML = '<span class="text-reunion-red font-bold">Il a fini !</span> On enregistre le résultat.';
            mainBtn.classList.remove('bg-reunion-green');
            mainBtn.classList.add('bg-reunion-red'); 
        } else if (step === 3) {
            // Étape 3: Cliquer sur "Stop !" -> Fin du Tripkik, cache le bouton, lance la compilation
            tripkik.end = time;
            tripkik.frames.push({ frame: captureFrame(), delay: 0 }); // Image 3 (capture finale)
            
            // CACHE LE BOUTON IMMÉDIATEMENT APRES LE STOP
            mainBtn.classList.add('hidden');
            
            statusDiv.innerHTML = '<span class="text-reunion-yellow">Analyse IA et création du Tripkik...</span>';
            
            // Simulation API
            const result = { ia_recommendation: 3, status: 'Juste', problem_id: time };
            tripkik.api_result = result;

            // Affichage des boutons de score pour le choix final
            scoreBtns.classList.remove('hidden');
            statusDiv.innerHTML = `<span class="font-bold text-reunion-yellow">Note le tripkik !</span> Recommandation IA: ${tripkik.api_result.ia_recommendation}.`;
        }
    } catch (e) {
        console.error("Erreur critique dans le processus:", e);
        // Utilisation de l'icône de redémarrage (🔄)
        statusDiv.innerHTML = `<span class="text-reunion-red font-bold">Erreur critique : ${e.message}.</span> <button id="relanceApp" class="text-blue-600 underline">${RESTART_ICON} Redémarrer</button>.`;
        mainBtn.classList.add('hidden');
        document.getElementById('relanceApp').onclick = () => window.location.reload();
    }
};
mainBtn.onclick = mainButtonHandler;


// --- FINALISATION ET STOCKAGE LOCAL (Archivage et Téléchargement) ---
const finalize = async (score) => {
    scoreBtns.classList.add('hidden');
    mainBtn.disabled = true; 
    statusDiv.innerHTML = `<span class="text-reunion-yellow font-bold">Génération du GIF...</span>`;

    // 1. Compilation du GIF avec le score incrusté
    await compileGifProof(score);
    
    // 2. Arrêt de la caméra après la compilation
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop()); // Arrêter le flux
        video.classList.add('hidden'); // Cacher l'affichage
    }
    cameraReady = false; 

    // 3. Délai de tension (750ms)
    await new Promise(resolve => setTimeout(resolve, 750)); 
    
    // 4. Archivage des métadonnées
    const evaluationRecord = {
        id: tripkik.api_result.problem_id,
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        date: new Date().toLocaleDateString('fr-FR'),
        score: score,
        duration_s: ((tripkik.response - tripkik.start) / 1000).toFixed(1),
        ia_reco: tripkik.api_result.ia_recommendation,
    };

    const history = JSON.parse(localStorage.getItem('tripkik_history') || '[]');
    history.push(evaluationRecord);
    localStorage.setItem('tripkik_history', JSON.stringify(history)); 

    statusDiv.innerHTML = `<span class="text-reunion-blue font-bold">Tripkik archivé fullstats !</span> Téléchargez la preuve GIF.`;
    
    // 5. Changement du bouton principal en bouton "MAISON"
    mainBtn.innerText = '🏠'; // L'icône de maison
    mainBtn.classList.remove('hidden', 'bg-reunion-blue', 'bg-reunion-red', 'bg-reunion-green');
    mainBtn.classList.add('bg-gray-700'); // Couleur neutre pour le bouton d'accueil
    mainBtn.onclick = () => window.location.hash = '#home'; // Le ramener à la page d'accueil
    mainBtn.disabled = false;
    step = 0; // Réinitialiser le processus
    
    // Afficher le bouton de la maison
    mainBtn.classList.remove('hidden');
};
        
// --- RENDU DE LA PAGE HISTORIQUE ---
const renderHistory = () => {
    // ... (Code renderHistory inchangé) ...
    const listContainer = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('tripkik_history') || '[]');
    listContainer.innerHTML = '';

    if (history.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 text-center">Aucun tripkik archivé pour le moment.</p>';
        return;
    }

    history.reverse().forEach((record, index) => {
        const item = document.createElement('div');
        const emoji = SCORE_EMOJI[record.score] || '';
        
        item.className = 'p-3 bg-white rounded-lg shadow-sm border-l-4 border-reunion-blue hover:shadow-md transition';
        item.innerHTML = `
            <p class="font-bold text-lg text-reunion-blue">Évaluation du ${record.date} à ${record.timestamp}</p>
            <p class="mt-1 text-sm text-gray-700">
                Score final: <span class="font-extrabold">${record.score} ${emoji}</span> / Durée: <span class="font-mono">${record.duration_s}s</span>
            </p>
            <p class="text-xs text-gray-500">Recommandation IA: ${record.ia_reco}</p>
        `;
        listContainer.appendChild(item);
    });
};