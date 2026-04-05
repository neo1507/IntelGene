/**
 * ═══════════════════════════════════════════════════════════
 *  IntelGene — Intelligence Command Center
 *  Neural Intelligence Hive Orchestrator  ·  Version 2.0
 *  Object-oriented App singleton with full feature parity.
 * ═══════════════════════════════════════════════════════════
 */

class IntelGeneApp {

    // ───────────────────────────────────────────
    // INIT
    // ───────────────────────────────────────────
    constructor() {
        this._cacheDOM();
        this._initState();
        this._initVoice();
        this._bindEvents();
        this._initTelemetry();
        this._runSplash();
    }

    _cacheDOM() {
        // Layout
        this.chatBox = document.getElementById('chat-box');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.syncBtn = document.getElementById('sync-btn');
        this.micBtn = document.getElementById('mic-btn');

        // Voice
        this.voiceStatus = document.getElementById('voice-status');
        this.ttsControls = document.getElementById('tts-controls');
        this.stopSpeechBtn = document.getElementById('stop-speech-btn');
        this.voiceSelect = document.getElementById('voice-select');

        // UI
        this.notifBadge = document.getElementById('notification-badge');
        this.notifIcon = document.getElementById('notif-icon');
        this.notifText = document.getElementById('notif-text');
        this.uploadBtn = document.getElementById('upload-btn');
        this.fileInput = document.getElementById('file-input');
        this.uploadProgress = document.getElementById('upload-progress');
        this.uploadFill = document.getElementById('upload-progress-fill');
        this.uploadLabel = document.getElementById('upload-progress-label');

        // Telemetry (kept for internal use, elements may not exist)
        this.latencyVal = document.getElementById('latency-val');
        this.syncStatusVal = document.getElementById('sync-status-val');
        this.docCountVal = document.getElementById('doc-count-val');

        // Thinking UI
        this.thinkingUI = document.getElementById('thinking-ui');
        this.thinkingStepTxt = document.getElementById('thinking-step-text');
        this.thinkingProgress = document.getElementById('thinking-progress');

        // Splash
        this.splashScreen = document.getElementById('splash-screen');
        this.splashStatus = document.getElementById('splash-status-text');

        // Suggestion cards (may not be in DOM)
        this.suggestionCards = document.querySelectorAll('.suggestion-card');
        this.suggestionGrid = document.getElementById('suggestion-grid');

        // Document modal
        this.docModalOverlay = document.getElementById('doc-modal-overlay');
        this.docModalClose = document.getElementById('doc-modal-close');
        this.docModalTitle = document.getElementById('doc-modal-title-text');
        this.docModalBody = document.getElementById('doc-modal-body');
    }

    _initState() {
        this.API_URL = 'http://localhost:8000';
        this.voices = [];
        this.voiceInputUsed = false;
        this.isListening = false;
        this.recognition = null;
        this.messageCount = 0;

        // Thinking steps
        this.thinkingSteps = [
            'Searching your documents...',
            'Retrieving relevant context...',
            'Cross-referencing knowledge...',
            'Ranking best matches...',
            'Crafting your answer...',
            'Applying final checks...',
        ];
    }

    // ───────────────────────────────────────────
    // SPLASH SEQUENCE
    // ───────────────────────────────────────────
    _runSplash() {
        const steps = [
            'Starting up...',
            'Loading your documents...',
            'Connecting to knowledge base...',
            'Ready.',
        ];

        let i = 0;
        const cycle = () => {
            if (!this.splashStatus) return;
            this.splashStatus.textContent = steps[i];
            i++;
            if (i < steps.length) setTimeout(cycle, 600);
        };
        cycle();

        // Dismiss after 2.8 s
        setTimeout(() => {
            if (this.splashScreen) {
                this.splashScreen.style.opacity = '0';
                this.splashScreen.style.visibility = 'hidden';
                this._playTone(0.12, 880, 'sine', 0.15);
            }
        }, 2800);
    }

    // ───────────────────────────────────────────
    // TELEMETRY
    // ───────────────────────────────────────────
    _initTelemetry() {
        // Latency simulation
        const updateLatency = () => {
            const ms = Math.floor(Math.random() * 80 + 42);
            if (this.latencyVal) {
                this.latencyVal.textContent = `${ms} ms`;
                this.latencyVal.style.color = ms > 100 ? '#f59e0b' : 'var(--primary)';
            }
        };
        updateLatency();
        setInterval(updateLatency, 4000);

        // Document count simulation
        const updateDocs = () => {
            const count = Math.floor(Math.random() * 30 + 120);
            if (this.docCountVal) this.docCountVal.textContent = `${count} nodes`;
        };
        updateDocs();
        setInterval(updateDocs, 12000);
    }

    // ───────────────────────────────────────────
    // SOUNDSCAPE
    // ───────────────────────────────────────────
    _playTone(duration, freq, type = 'sine', volume = 0.04) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (_) { /* AudioContext unavailable */ }
    }

    // ───────────────────────────────────────────
    // VOICE — TTS + STT
    // ───────────────────────────────────────────
    _initVoice() {
        // TTS — populate voices
        if (window.speechSynthesis) {
            const populate = () => {
                this.voices = window.speechSynthesis.getVoices();
                this.voiceSelect.innerHTML = '<option value="">Default Neural Voice</option>';
                this.voices.forEach((v, i) => {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = `${v.name} (${v.lang})${v.default ? ' ✓' : ''}`;
                    this.voiceSelect.appendChild(opt);
                });
            };
            populate();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = populate;
            }
        }

        // STT — SpeechRecognition
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            this.micBtn.disabled = true;
            this.micBtn.title = 'Voice input not supported in this browser';
            this.micBtn.style.opacity = '0.3';
            return;
        }

        this.recognition = new SR();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.micBtn.classList.add('recording');
            this.voiceStatus.classList.remove('hidden');
            this._playTone(0.06, 660, 'sine', 0.05);
        };

        this.recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript.trim();
            this.userInput.value = transcript;
            this.voiceInputUsed = true;
            this.sendMessage();
        };

        this.recognition.onerror = (e) => {
            const msgs = {
                'not-allowed': '⚠️ Microphone access denied.',
                'no-speech': '⚠️ No speech detected. Try again.',
            };
            this.voiceStatus.textContent = msgs[e.error] || `⚠️ Error: ${e.error}`;
            setTimeout(() => this.voiceStatus.classList.add('hidden'), 3500);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.micBtn.classList.remove('recording');
            if (this.voiceStatus.textContent.includes('Listening')) {
                this.voiceStatus.classList.add('hidden');
            }
        };
    }

    _cleanForSpeech(text) {
        return text
            .replace(/<[^>]+>/g, ' ')
            .replace(/#{1,6}\s+/g, '')
            .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
            .replace(/_{1,3}(.*?)_{1,3}/g, '$1')
            .replace(/`+.*?`+/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/^\s*[\-*+]\s+/gm, '')
            .replace(/^\s*\d+\.\s+/gm, '')
            .replace(/={2,}|-{2,}/g, '')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    _speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const clean = this._cleanForSpeech(text);
        if (!clean) return;

        const utt = new SpeechSynthesisUtterance(clean);
        utt.rate = 1.05;
        utt.pitch = 1.0;

        const idx = this.voiceSelect.value;
        if (idx !== '') {
            utt.voice = this.voices[parseInt(idx, 10)];
        } else {
            const pref = this.voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('natural'))
                || this.voices.find(v => v.lang.startsWith('en'));
            if (pref) utt.voice = pref;
        }

        utt.onstart = () => this.ttsControls.classList.remove('hidden');
        utt.onend = () => this.ttsControls.classList.add('hidden');
        utt.onerror = () => this.ttsControls.classList.add('hidden');

        window.speechSynthesis.speak(utt);
    }

    // ───────────────────────────────────────────
    // EVENT BINDINGS
    // ───────────────────────────────────────────
    _bindEvents() {
        // Chat
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.voiceInputUsed = false;
                this.sendMessage();
            }
        });

        // Mic
        this.micBtn.addEventListener('click', () => {
            if (!this.recognition) return;
            if (this.isListening) this.recognition.stop();
            else this.recognition.start();
        });

        // Stop speech
        this.stopSpeechBtn.addEventListener('click', () => {
            window.speechSynthesis?.cancel();
            this.ttsControls.classList.add('hidden');
        });

        // Sync
        this.syncBtn.addEventListener('click', () => this._handleSync());

        // Upload
        this.uploadBtn.addEventListener('click', () => {
            this.fileInput.value = '';
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', () => this._handleFileUpload());

        // Suggestion cards (if present)
        if (this.suggestionCards.length) {
            this.suggestionCards.forEach(card => {
                card.addEventListener('click', () => {
                    const query = card.getAttribute('data-query');
                    if (query) {
                        this.userInput.value = query;
                        this.sendMessage();
                    }
                });
            });
        }

        // Document modal close
        this.docModalClose.addEventListener('click', () => this._closeModal());
        this.docModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.docModalOverlay) this._closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.docModalOverlay.classList.contains('hidden')) {
                this._closeModal();
            }
        });
    }

    // ───────────────────────────────────────────
    // CHAT — CORE
    // ───────────────────────────────────────────
    async sendMessage() {
        const text = this.userInput.value.trim();
        if (!text) return;

        const wasVoice = this.voiceInputUsed;
        this.voiceInputUsed = false;

        this._appendMessage(text, 'user');
        this.userInput.value = '';
        this._playTone(0.05, 440, 'triangle', 0.04);
        this.messageCount++;

        // Show Thinking UI + typing indicator in chat
        this._showThinking(true);
        const typingId = this._addTypingIndicator();

        try {
            const res = await fetch(`${this.API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: text }),
            });

            const data = await res.json();
            this._showThinking(false);
            this._removeEl(typingId);

            if (res.ok) {
                this._appendMessage(data.answer, 'ai', data.sources, wasVoice);
                this._playTone(0.12, 660, 'sine', 0.05);
            } else {
                this._appendMessage(`⚠️ System Alert: ${data.detail}`, 'ai');
            }
        } catch {
            this._showThinking(false);
            this._removeEl(typingId);
            this._appendMessage('⚠️ Hive Cluster offline. Ensure the FastAPI Orchestrator is running on port 8000.', 'ai');
        }
    }

    // ───────────────────────────────────────────
    // THINKING UI
    // ───────────────────────────────────────────
    _showThinking(active) {
        if (active) {
            this.thinkingUI.style.display = 'flex';
            this.thinkingProgress.style.display = 'block';

            let stepIdx = 0;
            this._thinkingTimer = setInterval(() => {
                this.thinkingStepTxt.textContent = this.thinkingSteps[stepIdx % this.thinkingSteps.length];
                stepIdx++;
            }, 900);
        } else {
            clearInterval(this._thinkingTimer);
            this.thinkingUI.style.display = 'none';
            this.thinkingProgress.style.display = 'none';
        }
    }

    // ───────────────────────────────────────────
    // MESSAGE RENDERING
    // ───────────────────────────────────────────
    _appendMessage(text, sender, sources = [], shouldSpeak = false) {
        const div = document.createElement('div');
        div.classList.add('message', `${sender}-message`);

        const formatted = text.replace(/(?:\r\n|\r|\n)/g, '<br>');
        const isAI = sender === 'ai';
        const avatar = isAI
            ? `<img src="logo.png" alt="IntelGene" class="avatar-logo-img">`
            : `<i class="fa-solid fa-user-shield"></i>`;

        div.innerHTML = `
            <div class="message-inner">
                <div class="chat-avatar ${sender}-avatar" aria-hidden="true">
                    ${avatar}
                </div>
                <div class="bubble">
                    <div class="message-text"></div>
                </div>
            </div>`;

        this.chatBox.appendChild(div);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;

        const textEl = div.querySelector('.message-text');

        if (sender === 'ai') {
            this._typeWriter(textEl, formatted, 14, () => {
                div.classList.add('typewriting-finished');
                if (shouldSpeak) this._speak(text);
            });
        } else {
            textEl.innerHTML = formatted;
            div.classList.add('typewriting-finished');
            this.chatBox.scrollTop = this.chatBox.scrollHeight;
        }
    }

    _typeWriter(el, html, speed, cb) {
        let i = 0;
        const type = () => {
            if (i < html.length) {
                if (html[i] === '<') {
                    // consume full HTML tag at once for correctness
                    let tag = '';
                    while (i < html.length && html[i] !== '>') { tag += html[i++]; }
                    tag += '>'; i++;
                    el.innerHTML += tag;
                    type();
                } else {
                    el.innerHTML += html[i++];
                    this.chatBox.scrollTop = this.chatBox.scrollHeight;
                    setTimeout(type, speed);
                }
            } else {
                cb?.();
            }
        };
        type();
    }

    _appendSources(bubble, sources) {
        const grid = document.createElement('div');
        grid.classList.add('sources-container');

        sources.forEach(src => {
            // Show only the filename, never the full path
            const name = src.split(/[/\\]/).pop();
            const badge = document.createElement('div');
            badge.classList.add('source-badge');
            badge.innerHTML = `<i class="fa-solid fa-file-lines"></i><span>${name}</span>`;
            badge.title = `Source: ${name}`;

            // Click opens modal showing only name (no path)
            badge.addEventListener('click', () => this._openModal(name, src));
            grid.appendChild(badge);
        });

        bubble.appendChild(grid);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    _addTypingIndicator() {
        const id = `typing-${Date.now()}`;
        const div = document.createElement('div');
        div.id = id;
        div.classList.add('message', 'ai-message');
        div.innerHTML = `
            <div class="message-inner">
                <div class="chat-avatar ai-avatar" aria-hidden="true"><i class="fa-solid fa-atom"></i></div>
                <div class="bubble typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>`;
        this.chatBox.appendChild(div);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
        return id;
    }

    _removeEl(id) {
        document.getElementById(id)?.remove();
    }


    _openModal(name, fullPath) {
        this.docModalTitle.textContent = name;
        this.docModalBody.textContent = 'Loading document contents...';
        this.docModalOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Attempt to fetch via backend, or show friendly fallback
        fetch(`${this.API_URL}/preview?path=${encodeURIComponent(fullPath)}`)
            .then(r => r.ok ? r.text() : Promise.reject(r.status))
            .then(content => {
                this.docModalBody.textContent = content || '(Empty document)';
            })
            .catch(() => {
                this.docModalBody.innerHTML = `
<strong>File used as source:</strong> ${name}
<br><br>
<span style="color:var(--text-muted)">The content from this document was retrieved and used to generate the AI\'s answer above.</span>`;
            });
    }

    _closeModal() {
        this.docModalOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    }


    async _handleSync() {
        this.syncBtn.disabled = true;
        this.syncBtn.classList.add('rotating');
        if (this.syncStatusVal) {
            this.syncStatusVal.textContent = 'Syncing...';
            this.syncStatusVal.style.color = '#f59e0b';
        }
        this._playTone(0.06, 550, 'sine', 0.04);

        try {
            const res = await fetch(`${this.API_URL}/ingest`, { method: 'POST' });
            const data = await res.json();
            this._notify(res.ok ? (data.message || 'Hive Synchronized ✓') : data.detail, !res.ok);
            if (this.syncStatusVal) {
                this.syncStatusVal.textContent = res.ok ? 'Secured' : 'Error';
                this.syncStatusVal.style.color = res.ok ? 'var(--primary)' : 'var(--danger)';
            }
        } catch {
            this._notify('Sync Failed — Orchestrator unreachable', true);
            if (this.syncStatusVal) {
                this.syncStatusVal.textContent = 'Offline';
                this.syncStatusVal.style.color = 'var(--danger)';
            }
        } finally {
            this.syncBtn.disabled = false;
            this.syncBtn.classList.remove('rotating');
        }
    }


    async _handleFileUpload() {
        const files = Array.from(this.fileInput.files);
        if (!files.length) return;

        this.uploadBtn.disabled = true;
        this.uploadProgress.classList.remove('hidden');

        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            this.uploadFill.style.width = `${Math.round((i / files.length) * 100)}%`;
            this.uploadLabel.textContent = `Injecting ${i + 1}/${files.length}: ${file.name}`;

            const fd = new FormData();
            fd.append('file', file);

            try {
                const res = await fetch(`${this.API_URL}/upload`, { method: 'POST', body: fd });
                if (res.ok) succeeded++;
                else {
                    failed++;
                    const d = await res.json();
                    this._notify(`⚠️ ${file.name}: ${d.detail}`, true);
                }
            } catch {
                failed++;
                this._notify(`⚠️ Network error uploading ${file.name}`, true);
            }
        }

        this.uploadFill.style.width = '100%';
        this.uploadLabel.textContent = 'Mission Complete';

        if (succeeded > 0 && failed === 0) {
            this._notify(`✅ ${succeeded} file${succeeded > 1 ? 's' : ''} injected. Watchdog auto-vectorizing...`, false);
        } else if (succeeded > 0) {
            this._notify(`⚠️ ${succeeded} uploaded, ${failed} failed`, true);
        }

        setTimeout(() => {
            this.uploadProgress.classList.add('hidden');
            this.uploadFill.style.width = '0%';
            this.uploadBtn.disabled = false;
        }, 2200);
    }


    _notify(msg, isError = false) {
        clearTimeout(this._notifTimer);
        this.notifText.textContent = msg;
        this.notifIcon.className = `fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-circle-check'}`;
        this.notifIcon.style.color = isError ? 'var(--danger)' : 'var(--success)';
        this.notifBadge.style.borderColor = isError ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)';
        this.notifBadge.classList.remove('hidden');

        this._notifTimer = setTimeout(() => this.notifBadge.classList.add('hidden'), 4500);
    }
}

// ─── Bootstrap ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.IntelGene = new IntelGeneApp();
});
