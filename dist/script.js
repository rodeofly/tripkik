// script.js

const video = document.getElementById('camera');
const mainBtn = document.getElementById('mainBtn'); // Le bouton flottant
const statusDiv = document.getElementById('status'); // Texte de statut simple
const scoreBtns = document.getElementById('scoreBtns');
const gifContainer = document.getElementById('gifContainer');
const gifImage = document.getElementById('gifImage');
const downloadLink = document.getElementById('downloadLink');

let step = 0, cameraReady = false, tripkik = { frames: [] };
const SCORE_EMOJI = { 4: '⭐', 3: '👍', 2: '🤔', 1: '🚨' };

// --- GESTION DES VUES (Simple Routage par Hash) ---
const updateView = () => {
    const hash = window.location.hash || '#home';
    document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden'));
    const target = document.querySelector(hash + '-view');
    if (target) {
        target.classList.remove('hidden');
    }

    // Réinitialise l'état du bouton et de la caméra si on revient à l'accueil
    if (hash === '#home') {
        if (!cameraReady && step === 0) { 
            statusDiv.innerText = 'Prêt à démarrer ?';
            mainBtn.innerText = 'Prêt ?';
            mainBtn.classList.remove('hidden'); // S'assurer que le bouton est visible
            mainBtn.classList.remove('bg-reunion-blue', 'bg-reunion-red');
            mainBtn.classList.add('bg-reunion-green'); // Couleur initiale
            mainBtn.disabled = false;
        } else if (cameraReady && step === 1) {
            // Si la caméra est déjà prête, le bouton doit indiquer "Go !"
            mainBtn.innerText = 'Go !';
            mainBtn.classList.remove('hidden');
            mainBtn.classList.remove('bg-reunion-green', 'bg-reunion-red');
            mainBtn.classList.add('bg-reunion-blue');
            mainBtn.disabled = false;
        } else {
            // Dans d'autres états (après un tripkik ou en attente de score), cacher ou gérer le bouton différemment
            // Pour l'instant, on le cache si on n'est pas en début de processus
            mainBtn.classList.add('hidden');
        }
    } else { // Si on va sur l'historique, on cache le bouton principal
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
    mainBtn.innerText = '...'; // Indiquer un chargement
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            video.classList.remove('hidden');
            cameraReady = true;
            step = 1; // Étape "Go !"
            statusDiv.innerHTML = '<span class="text-reunion-blue font-bold">Caméra active.</span> Quand l\'élève est prêt...';
            mainBtn.innerText = 'Go !'; // Nom du bouton Étape 1
            mainBtn.disabled = false;
            mainBtn.classList.remove('bg-reunion-green', 'bg-reunion-red');
            mainBtn.classList.add('bg-reunion-blue'); // Couleur pour "Go !"
            resolve(); 
        };
        video.onerror = reject;
        
    } catch (err) {
        console.error("Erreur d'accès à la caméra:", err);
        cameraReady = false;
        video.classList.add('hidden');
        statusDiv.innerHTML = `<span class="text-reunion-red font-bold">Autorisation caméra refusée.</span> <button id="retryCam" class="text-blue-600 underline">cliquez ici pour réessayer</button>.`;
        document.getElementById('retryCam').onclick = () => startCamera().catch(() => {});
        mainBtn.innerText = 'Prêt ?'; // Réinitialiser le bouton si échec
        mainBtn.disabled = false;
        resolve(); // Résoudre même en cas d'erreur pour ne pas bloquer
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
    
    // Optimisation pour les réseaux sociaux (plus court et nerveux)
    const delay1 = Math.min(duration_ms, max_duration_ms); 
    const delay2 = 750; // Transition réponse -> résultat réduite
    
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
        
        // Active le lien de téléchargement
        downloadLink.href = gifURL;
        downloadLink.classList.remove('hidden');
        downloadLink.setAttribute('download', `tripkik_preuve_${tripkik.api_result.problem_id}_${finalScore}.gif`);
        
        resolve();
    });

    gif.render();
});

// --- LOGIQUE DU BOUTON PRINCIPAL ---
mainBtn.onclick = async () => {
    try {
        if (!cameraReady) {
            // Étape 0: Cliquer sur "Prêt ?" -> Démarrer la caméra
            await startCamera(); 
            if (!cameraReady) return; // Si la caméra n'a pas pu démarrer
            // Après startCamera(), step est à 1 et le bouton est "Go !"
        } else if (step === 1) { 
            // Étape 1: Cliquer sur "Go !" -> Démarrer le Tripkik
            tripkik.start = Date.now();
            tripkik.frames = [{ frame: captureFrame(), delay: 0 }]; // Image 1
            step = 2; 
            mainBtn.innerText = 'Ok !?'; 
            statusDiv.innerHTML = '<span class="text-reunion-green font-bold">Top départ !</span> L\'élève est en action.';
            mainBtn.classList.remove('bg-reunion-blue', 'bg-reunion-red');
            mainBtn.classList.add('bg-reunion-green'); // Couleur pour "Ok !?"
        } else if (step === 2) { 
            // Étape 2: Cliquer sur "Ok !?" -> L'élève a répondu
            tripkik.response = Date.now(); 
            tripkik.frames.push({ frame: captureFrame(), delay: 0 }); // Image 2
            step = 3; 
            mainBtn.innerText = 'Stop !'; 
            statusDiv.innerHTML = '<span class="text-reunion-red font-bold">Il a fini !</span> On enregistre le résultat.';
            mainBtn.classList.remove('bg-reunion-blue', 'bg-reunion-green');
            mainBtn.classList.add('bg-reunion-red'); // Couleur pour "Stop !"
        } else if (step === 3) {
            // Étape 3: Cliquer sur "Stop !" -> Fin du Tripkik, capture finale, compilation GIF et affichage notation
            tripkik.end = Date.now();
            tripkik.frames.push({ frame: captureFrame(), delay: 0 }); // Image 3 (Sans texte incrusté initialement)
            
            statusDiv.innerHTML = 'Analyse IA en cours et création du Tripkik...';
            mainBtn.classList.add('hidden'); // Cache le bouton principal
            gifContainer.classList.remove('hidden');
            gifContainer.querySelector('.loading-spinner').classList.remove('hidden'); 
            gifContainer.querySelector('p').innerText = 'Préparation du tripkik animé...';
            
            // Simulation API
            const result = { ia_recommendation: 3, status: 'Juste', problem_id: Date.now() };
            tripkik.api_result = result;

            // Affichage des boutons de score pour le choix final
            scoreBtns.classList.remove('hidden');
            statusDiv.innerHTML = `<span class="font-bold text-reunion-yellow">Note le tripkik !</span> Recommandation IA: ${tripkik.api_result.ia_recommendation}.`;
        }
    } catch (e) {
        console.error("Erreur critique dans le processus:", e);
        statusDiv.innerHTML = `<span class="text-reunion-red font-bold">Erreur critique : ${e.message}. Redémarrer Tripkik.</span>`;
        mainBtn.classList.remove('hidden');
        mainBtn.innerText = "Redémarrer Tripkik";
        mainBtn.onclick = () => window.location.reload();
    }
};

// --- FINALISATION ET STOCKAGE LOCAL (Archivage et Téléchargement) ---
const finalize = async (score) => {
    scoreBtns.classList.add('hidden');
    mainBtn.disabled = true; // Empêcher les clics pendant la finalisation
    statusDiv.innerHTML = `<span class="text-reunion-yellow font-bold">Génération du GIF...</span>`;

    await compileGifProof(score);
    
    // Délai de tension après génération du GIF, avant l'affichage final (750ms)
    await new Promise(resolve => setTimeout(resolve, 750)); 
    
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
    
    // Réinitialiser pour un nouveau tripkik
    mainBtn.innerText = 'Nouveau Tripkik';
    mainBtn.classList.remove('hidden');
    mainBtn.classList.remove('bg-reunion-blue', 'bg-reunion-red');
    mainBtn.classList.add('bg-reunion-green'); // Couleur de départ
    mainBtn.disabled = false;
    step = 0; // Retour à l'étape initiale
    cameraReady = false; // Désactiver la caméra pour la prochaine fois
    video.srcObject.getTracks().forEach(track => track.stop()); // Arrêter la caméra
    video.classList.add('hidden'); // Cacher l'affichage de la caméra

    mainBtn.onclick = () => window.location.reload(); // Pour le prochain tripkik, recharger la page
};

// --- RENDU DE LA PAGE HISTORIQUE ---
const renderHistory = () => {
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