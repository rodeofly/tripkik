// script.js

const video = document.getElementById('camera');
const finalSnapshot = document.getElementById('finalSnapshot');
const mainBtnWrapper = document.getElementById('mainBtnWrapper');
const mainBtn = document.getElementById('mainBtn');
const mainBtnComment = document.getElementById('mainBtnComment');
const statusDiv = document.getElementById('status');
const scoreBtns = document.getElementById('scoreBtns');
const gifContainer = document.getElementById('gifContainer');
const gifSpinner = gifContainer.querySelector('.loading-spinner');
const gifMessage = gifContainer.querySelector('p');
const gifImage = document.getElementById('gifImage');
const downloadLink = document.getElementById('downloadLink');

let step = 0;
let cameraReady = false;
let tripkik = { frames: [] };

const SCORE_EMOJI = { 4: '⭐', 3: '👍', 2: '🤔', 1: '🚨' };
const RESTART_ICON = '🔄';
const BUTTON_COLOR_CLASSES = ['bg-reunion-green', 'bg-reunion-blue', 'bg-reunion-red', 'bg-gray-700'];
const noop = () => {};

const setStatus = (message, { html = false } = {}) => {
    if (!statusDiv) {
        return;
    }
    if (!message || !message.trim()) {
        statusDiv.innerHTML = '';
        statusDiv.classList.add('hidden');
        return;
    }
    statusDiv.classList.remove('hidden');
    if (html) {
        statusDiv.innerHTML = message;
    } else {
        statusDiv.innerText = message;
    }
};

const setMainButtonState = ({ text, color, comment, hidden = false, disabled = false, onClick }) => {
    if (text !== undefined) {
        mainBtn.innerText = text;
    }
    mainBtn.classList.remove(...BUTTON_COLOR_CLASSES);
    if (color) {
        mainBtn.classList.add(color);
    }
    mainBtn.disabled = disabled;
    mainBtn.onclick = typeof onClick === 'function' ? onClick : noop;
    mainBtnWrapper.classList.toggle('hidden', hidden);
    if (hidden || !comment) {
        mainBtnComment.classList.add('hidden');
    } else {
        mainBtnComment.innerText = comment;
        mainBtnComment.classList.remove('hidden');
    }
};

const stopCamera = () => {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    video.classList.add('hidden');
    cameraReady = false;
};

const resetGifPreview = () => {
    gifImage.src = '';
    gifSpinner.classList.remove('hidden');
    gifMessage.innerText = 'Préparation du tripkik animé...';
    downloadLink.classList.add('hidden');
    downloadLink.removeAttribute('href');
};

const resetTripkikData = () => {
    tripkik = { frames: [] };
};

const resetInterface = () => {
    step = 0;
    stopCamera();
    resetTripkikData();
    finalSnapshot.classList.add('hidden');
    finalSnapshot.src = '';
    scoreBtns.classList.add('hidden');
    gifContainer.classList.add('hidden');
    resetGifPreview();
    setStatus('');
    setMainButtonState({
        text: 'Prêt ?',
        color: 'bg-reunion-green',
        comment: 'Lance la caméra pour commencer.',
        hidden: false,
        disabled: false,
        onClick: mainButtonHandler
    });
};

const cloneCanvas = (sourceCanvas) => {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    canvas.getContext('2d').drawImage(sourceCanvas, 0, 0);
    return canvas;
};

const drawScoreOverlay = (canvas, score) => {
    const ctx = canvas.getContext('2d');
    const emoji = SCORE_EMOJI[score] || '';
    const text = `NOTE: ${score} ${emoji}`;
    const fontSize = canvas.height * 0.08;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - fontSize - 10, canvas.width, fontSize + 10);

    ctx.font = `${fontSize}px Poppins, sans-serif`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'right';
    ctx.fillText(text, canvas.width - 20, canvas.height - 10);
};

const updateView = () => {
    const hash = window.location.hash || '#home';
    document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden'));
    const target = document.querySelector(`${hash}-view`);
    if (target) {
        target.classList.remove('hidden');
    }

    if (hash !== '#home') {
        mainBtnWrapper.classList.add('hidden');
        mainBtnComment.classList.add('hidden');
    } else if (!mainBtnWrapper.classList.contains('hidden') && mainBtnComment.innerText) {
        mainBtnComment.classList.remove('hidden');
    }

    if (hash === '#historique') {
        renderHistory();
    }
};

window.addEventListener('hashchange', updateView);
window.addEventListener('load', () => {
    resetInterface();
    updateView();
});

const startCamera = () => new Promise(async (resolve, reject) => {
    setStatus('Demande d\'accès à la caméra... Un instant !');
    setMainButtonState({
        text: 'Prêt ?',
        color: 'bg-reunion-green',
        comment: 'Autorise la caméra dans la fenêtre du navigateur.',
        hidden: false,
        disabled: true,
        onClick: mainButtonHandler
    });

    try {
        finalSnapshot.classList.add('hidden');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            video.classList.remove('hidden');
            setStatus('Initialisation de la caméra... Stabilisation en cours.');
            setMainButtonState({
                text: 'Stabilisation... ⏳',
                color: 'bg-reunion-green',
                comment: 'Patiente un instant, la caméra se met au point.',
                hidden: false,
                disabled: true,
                onClick: noop
            });

            setTimeout(() => {
                cameraReady = true;
                step = 1;
                setStatus('');
                setMainButtonState({
                    text: 'Go !',
                    color: 'bg-reunion-blue',
                    comment: 'Cadre l\'énoncé et capture-le.',
                    hidden: false,
                    disabled: false,
                    onClick: mainButtonHandler
                });
                resolve();
            }, 1200);
        };
        video.onerror = reject;
    } catch (err) {
        console.error("Erreur d'accès à la caméra:", err);
        stopCamera();
        setStatus(`<span class="text-reunion-red font-bold">Caméra bloquée.</span> <button id="retryCam" class="text-blue-600 underline">${RESTART_ICON} Réessayer</button>.`, { html: true });
        document.getElementById('retryCam').onclick = () => startCamera().catch(() => {});
        setMainButtonState({
            text: 'Prêt ?',
            color: 'bg-reunion-green',
            comment: 'Relance la caméra pour retenter.',
            hidden: false,
            disabled: false,
            onClick: mainButtonHandler
        });
        reject(err);
    }
});

const captureFrame = () => {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Dimensions vidéo nulles. Échec de la capture.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
};

async function mainButtonHandler() {
    try {
        if (!cameraReady) {
            await startCamera();
            if (!cameraReady) {
                return;
            }
            return;
        }

        const now = Date.now();

        if (step === 1) {
            tripkik.start = now;
            tripkik.frames = [{ frame: captureFrame(), delay: 0 }];
            step = 2;
            setStatus('<span class="text-reunion-green font-bold">Top départ !</span> L\'élève est en action.', { html: true });
            setMainButtonState({
                text: 'Ok !?',
                color: 'bg-reunion-green',
                comment: 'Clique quand l\'élève donne sa réponse.',
                hidden: false,
                disabled: false,
                onClick: mainButtonHandler
            });
        } else if (step === 2) {
            tripkik.response = now;
            tripkik.frames.push({ frame: captureFrame(), delay: 0 });
            step = 3;
            setStatus('<span class="text-reunion-red font-bold">Il a fini !</span> Prépare la preuve finale.', { html: true });
            setMainButtonState({
                text: 'Stop !',
                color: 'bg-reunion-red',
                comment: 'Fige la preuve avec un dernier clic.',
                hidden: false,
                disabled: false,
                onClick: mainButtonHandler
            });
        } else if (step === 3) {
            const finalFrame = captureFrame();
            tripkik.end = now;
            tripkik.frames.push({ frame: finalFrame, delay: 0 });
            finalSnapshot.src = finalFrame.toDataURL('image/png');
            finalSnapshot.classList.remove('hidden');
            stopCamera();
            setMainButtonState({
                hidden: true,
                disabled: true,
                onClick: noop
            });
            scoreBtns.classList.remove('hidden');
            // Simulation API
            tripkik.api_result = { ia_recommendation: 3, status: 'Juste', problem_id: now };
            setStatus(`<span class="font-bold text-reunion-yellow">Note le tripkik !</span> Recommandation IA: ${tripkik.api_result.ia_recommendation}.`, { html: true });
        }
    } catch (e) {
        console.error('Erreur critique dans le processus:', e);
        setStatus(`<span class="text-reunion-red font-bold">Erreur critique : ${e.message}.</span> <button id="relanceApp" class="text-blue-600 underline">${RESTART_ICON} Redémarrer</button>.`, { html: true });
        setMainButtonState({ text: 'Prêt ?', color: 'bg-reunion-green', comment: 'Relance l\'appli.', hidden: true, disabled: true, onClick: noop });
        document.getElementById('relanceApp').onclick = () => {
            window.location.hash = '#home';
            resetInterface();
        };
    }
}

const createFrameWithScore = (frame, score) => {
    const canvas = cloneCanvas(frame);
    drawScoreOverlay(canvas, score);
    return canvas;
};

const compileGifProof = (finalScore) => new Promise(resolve => {
    const durationMs = tripkik.response - tripkik.start;
    const maxDurationMs = 3000;
    const delay1 = Math.min(durationMs, maxDurationMs);
    const delay2 = 750;

    const scoredFrame = createFrameWithScore(tripkik.frames[2].frame, finalScore);
    tripkik.frames[2] = { frame: scoredFrame, delay: 1000 };
    finalSnapshot.src = scoredFrame.toDataURL('image/png');

    tripkik.frames[0].delay = delay1;
    tripkik.frames[1].delay = delay2;

    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: tripkik.frames[0].frame.width,
        height: tripkik.frames[0].frame.height,
        workerScript: './gif.worker.js'
    });

    gif.on('finished', (blob) => {
        const gifURL = URL.createObjectURL(blob);
        gifImage.src = gifURL;
        gifMessage.innerText = 'Tripkik généré !';
        gifSpinner.classList.add('hidden');
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

const finalize = async (score) => {
    scoreBtns.classList.add('hidden');
    setStatus('<span class="text-reunion-yellow font-bold">Génération du GIF...</span>', { html: true });
    gifContainer.classList.remove('hidden');
    resetGifPreview();

    await compileGifProof(score);

    finalSnapshot.classList.add('hidden');
    finalSnapshot.src = '';

    if (video.srcObject) {
        stopCamera();
    }

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

    setStatus('<span class="text-reunion-blue font-bold">Tripkik archivé fullstats !</span> Téléchargez la preuve GIF.', { html: true });

    setMainButtonState({
        text: 'Home',
        color: 'bg-gray-700',
        comment: 'Retour à l\'accueil.',
        hidden: false,
        disabled: false,
        onClick: () => {
            window.location.hash = '#home';
            resetInterface();
        }
    });
};

const renderHistory = () => {
    const listContainer = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('tripkik_history') || '[]');
    listContainer.innerHTML = '';

    if (history.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 text-center">Aucun tripkik archivé pour le moment.</p>';
        return;
    }

    history.reverse().forEach((record) => {
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

window.finalize = finalize;
