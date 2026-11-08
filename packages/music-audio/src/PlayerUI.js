/**
 * @file src/PlayerUI.js
 * @description 播放器UI与皮肤系统，实现播放器界面渲染和皮肤切换功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.1.0
 * @created 2026-03-06
 * @updated 2026-03-06
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 播放器,UI设计,皮肤系统
 */

/**
 * 播放器UI与皮肤系统
 * 实现播放器界面渲染和皮肤切换功能
 */
class PlayerUI {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            theme: options.theme || 'default',
            skin: options.skin || 'default',
            autoPlay: options.autoPlay || false,
            ...options
        };
        this.currentSkin = null;
        this.skins = new Map();
        this.eventListeners = new Map();
        this.init();
    }

    /**
     * 初始化播放器UI
     */
    init() {
        // 注册默认皮肤
        this.registerSkin('default', {
            name: '默认皮肤',
            css: `
                .player-container {
                    background: linear-gradient(135deg, #1e3c72, #2a5298);
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                    position: relative;
                }

                .player-header {
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .player-title {
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                }

                .player-controls {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .player-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .player-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.1);
                }

                .player-progress {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 3px;
                    margin: 0 20px;
                    position: relative;
                    cursor: pointer;
                }

                .player-progress-bar {
                    height: 100%;
                    background: #4CAF50;
                    border-radius: 3px;
                    width: 0%;
                    transition: width 0.1s linear;
                }

                .player-content {
                    padding: 20px;
                    min-height: 300px;
                    color: white;
                }

                .player-footer {
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.2);
                }

                .player-time {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 14px;
                }

                .player-volume {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .player-volume-slider {
                    width: 100px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                    outline: none;
                    -webkit-appearance: none;
                }

                .player-volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                }
            `,
            html: `
                <div class="player-container">
                    <div class="player-header">
                        <div class="player-title">视频播放器</div>
                        <div class="player-controls">
                            <button class="player-btn" id="prevBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.536 5.464a5 5 0 0 1 0 7.072L8 14.07l-3.536-3.535a5 5 0 0 1 0-7.072l.707-.707a1 1 0 0 1 1.414 0l2.829 2.828a1 1 0 0 0 1.414 0l2.829-2.828a1 1 0 0 1 1.414 0l.707.707z"/>
                                </svg>
                            </button>
                            <button class="player-btn" id="playBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                                </svg>
                            </button>
                            <button class="player-btn" id="nextBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0Zm-2-6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="player-progress" id="progressBar">
                        <div class="player-progress-bar" id="progressBarFill"></div>
                    </div>
                    <div class="player-content" id="playerContent">
                        <!-- 播放内容将在这里渲染 -->
                    </div>
                    <div class="player-footer">
                        <div class="player-time">
                            <span id="currentTime">00:00</span> / <span id="duration">00:00</span>
                        </div>
                        <div class="player-volume">
                            <button class="player-btn" id="volumeBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-2.82 2.82c.74.87 1.19 2 1.19 3.19A4.5 4.5 0 0 1 8 12.5c0-1.19.45-2.32 1.19-3.19l-2.82-2.82Z"/>
                                </svg>
                            </button>
                            <input type="range" class="player-volume-slider" id="volumeSlider" min="0" max="100" value="70">
                        </div>
                    </div>
                </div>
            `,
            js: `
                // 播放器控制逻辑
                const playBtn = document.getElementById('playBtn');
                const prevBtn = document.getElementById('prevBtn');
                const nextBtn = document.getElementById('nextBtn');
                const progressBar = document.getElementById('progressBar');
                const progressBarFill = document.getElementById('progressBarFill');
                const currentTimeEl = document.getElementById('currentTime');
                const durationEl = document.getElementById('duration');
                const volumeBtn = document.getElementById('volumeBtn');
                const volumeSlider = document.getElementById('volumeSlider');

                let isPlaying = false;
                let currentTime = 0;
                let duration = 0;

                // 播放/暂停
                playBtn.addEventListener('click', () => {
                    isPlaying = !isPlaying;
                    updatePlayButton();

                    if (isPlaying) {
                        this.emit('play');
                    } else {
                        this.emit('pause');
                    }
                });

                // 上一首/下一首
                prevBtn.addEventListener('click', () => {
                    this.emit('prev');
                });

                nextBtn.addEventListener('click', () => {
                    this.emit('next');
                });

                // 进度条控制
                progressBar.addEventListener('click', (e) => {
                    const rect = progressBar.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    currentTime = pos * duration;
                    updateProgressBar();
                    this.emit('seek', currentTime);
                });

                // 音量控制
                volumeSlider.addEventListener('input', (e) => {
                    const volume = e.target.value / 100;
                    this.emit('volumeChange', volume);
                });

                // 更新播放按钮
                function updatePlayButton() {
                    if (isPlaying) {
                        playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>';
                    } else {
                        playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
                    }
                }

                // 更新进度条
                function updateProgressBar() {
                    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                    progressBarFill.style.width = progress + '%';
                    currentTimeEl.textContent = formatTime(currentTime);
                }

                // 格式化时间
                function formatTime(seconds) {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')};
                }

                // 更新播放器状态
                this.updatePlayerState = (state) => {
                    if (state.isPlaying !== undefined) {
                        isPlaying = state.isPlaying;
                        updatePlayButton();
                    }

                    if (state.currentTime !== undefined) {
                        currentTime = state.currentTime;
                        updateProgressBar();
                    }

                    if (state.duration !== undefined) {
                        duration = state.duration;
                        durationEl.textContent = formatTime(duration);
                        updateProgressBar();
                    }
                };
            `
        });

        // 注册科技风皮肤
        this.registerSkin('tech', {
            name: '科技风皮肤',
            css: `
                .player-container {
                    background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                    position: relative;
                }

                .player-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="none" stroke="rgba(0, 255, 255, 0.1)" stroke-width="0.5"/><path d="M0,0 L100,100 M100,0 L0,100" stroke="rgba(0, 255, 255, 0.05)" stroke-width="0.5"/></svg>');
                    opacity: 0.3;
                    pointer-events: none;
                }

                .player-header {
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(0, 255, 255, 0.2);
                }

                .player-title {
                    color: #00ffff;
                    font-size: 24px;
                    font-weight: bold;
                    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                }

                .player-controls {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .player-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(0, 255, 255, 0.1);
                    border: 1px solid rgba(0, 255, 255, 0.3);
                    color: #00ffff;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .player-btn:hover {
                    background: rgba(0, 255, 255, 0.2);
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
                    transform: scale(1.1);
                }

                .player-progress {
                    height: 6px;
                    background: rgba(0, 255, 255, 0.2);
                    border-radius: 3px;
                    margin: 0 20px;
                    position: relative;
                    cursor: pointer;
                }

                .player-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #00ffff, #0080ff);
                    border-radius: 3px;
                    width: 0%;
                    transition: width 0.1s linear;
                    box-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
                }

                .player-content {
                    padding: 20px;
                    min-height: 300px;
                    color: #e0e0e0;
                }

                .player-footer {
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.3);
                    border-top: 1px solid rgba(0, 255, 255, 0.2);
                }

                .player-time {
                    color: rgba(0, 255, 255, 0.7);
                    font-size: 14px;
                }

                .player-volume {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .player-volume-slider {
                    width: 100px;
                    height: 4px;
                    background: rgba(0, 255, 255, 0.2);
                    border-radius: 2px;
                    outline: none;
                    -webkit-appearance: none;
                }

                .player-volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #00ffff;
                    cursor: pointer;
                    box-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
                }
            `,
            html: `
                <div class="player-container">
                    <div class="player-header">
                        <div class="player-title">科技风播放器</div>
                        <div class="player-controls">
                            <button class="player-btn" id="prevBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.536 5.464a5 5 0 0 1 0 7.072L8 14.07l-3.536-3.535a5 5 0 0 1 0-7.072l.707-.707a1 1 0 0 1 1.414 0l2.829 2.828a1 1 0 0 0 1.414 0l2.829-2.828a1 1 0 0 1 1.414 0l.707.707z"/>
                                </svg>
                            </button>
                            <button class="player-btn" id="playBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                                </svg>
                            </button>
                            <button class="player-btn" id="nextBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0Zm-2-6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="player-progress" id="progressBar">
                        <div class="player-progress-bar" id="progressBarFill"></div>
                    </div>
                    <div class="player-content" id="playerContent">
                        <!-- 播放内容将在这里渲染 -->
                    </div>
                    <div class="player-footer">
                        <div class="player-time">
                            <span id="currentTime">00:00</span> / <span id="duration">00:00</span>
                        </div>
                        <div class="player-volume">
                            <button class="player-btn" id="volumeBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-2.82 2.82c.74.87 1.19 2 1.19 3.19A4.5 4.5 0 0 1 8 12.5c0-1.19.45-2.32 1.19-3.19l-2.82-2.82Z"/>
                                </svg>
                            </button>
                            <input type="range" class="player-volume-slider" id="volumeSlider" min="0" max="100" value="70">
                        </div>
                    </div>
                </div>
            `,
            js: `
                // 科技风播放器控制逻辑
                const playBtn = document.getElementById('playBtn');
                const prevBtn = document.getElementById('prevBtn');
                const nextBtn = document.getElementById('nextBtn');
                const progressBar = document.getElementById('progressBar');
                const progressBarFill = document.getElementById('progressBarFill');
                const currentTimeEl = document.getElementById('currentTime');
                const durationEl = document.getElementById('duration');
                const volumeBtn = document.getElementById('volumeBtn');
                const volumeSlider = document.getElementById('volumeSlider');

                let isPlaying = false;
                let currentTime = 0;
                let duration = 0;

                // 播放/暂停
                playBtn.addEventListener('click', () => {
                    isPlaying = !isPlaying;
                    updatePlayButton();

                    if (isPlaying) {
                        this.emit('play');
                    } else {
                        this.emit('pause');
                    }
                });

                // 上一首/下一首
                prevBtn.addEventListener('click', () => {
                    this.emit('prev');
                });

                nextBtn.addEventListener('click', () => {
                    this.emit('next');
                });

                // 进度条控制
                progressBar.addEventListener('click', (e) => {
                    const rect = progressBar.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    currentTime = pos * duration;
                    updateProgressBar();
                    this.emit('seek', currentTime);
                });

                // 音量控制
                volumeSlider.addEventListener('input', (e) => {
                    const volume = e.target.value / 100;
                    this.emit('volumeChange', volume);
                });

                // 更新播放按钮
                function updatePlayButton() {
                    if (isPlaying) {
                        playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>';
                    } else {
                        playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
                    }
                }

                // 更新进度条
                function updateProgressBar() {
                    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                    progressBarFill.style.width = progress + '%';
                    currentTimeEl.textContent = formatTime(currentTime);
                }

                // 格式化时间
                function formatTime(seconds) {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')};
                }

                // 更新播放器状态
                this.updatePlayerState = (state) => {
                    if (state.isPlaying !== undefined) {
                        isPlaying = state.isPlaying;
                        updatePlayButton();
                    }

                    if (state.currentTime !== undefined) {
                        currentTime = state.currentTime;
                        updateProgressBar();
                    }

                    if (state.duration !== undefined) {
                        duration = state.duration;
                        durationEl.textContent = formatTime(duration);
                        updateProgressBar();
                    }
                };
            `
        });

        // 注册自然风皮肤
        this.registerSkin('nature', {
            name: '自然风皮肤',
            css: `
                .player-container {
                    background: linear-gradient(135deg, #56ab2f, #a8e063);
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    overflow: hidden;
                    position: relative;
                }

                .player-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.2)"/><circle cx="80" cy="40" r="3" fill="rgba(255,255,255,0.15)"/><circle cx="40" cy="80" r="1.5" fill="rgba(255,255,255,0.25)"/></svg>');
                    opacity: 0.3;
                    pointer-events: none;
                }

                .player-header {
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .player-title {
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .player-controls {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .player-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .player-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.1);
                }

                .player-progress {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 3px;
                    margin: 0 20px;
                    position: relative;
                    cursor: pointer;
                }

                .player-progress-bar {
                    height: 100%;
                    background: rgba(255, 255, 255, 0.8);
                    border-radius: 3px;
                    width: 0%;
                    transition: width 0.1s linear;
                }

                .player-content {
                    padding: 20px;
                    min-height: 300px;
                    color: white;
                }

                .player-footer {
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.1);
                }

                .player-time {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 14px;
                }

                .player-volume {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .player-volume-slider {
                    width: 100px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                    outline: none;
                    -webkit-appearance: none;
                }

                .player-volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                }
            `,
            html: `
                <div class="player-container">
                    <div class="player-header">
                        <div class="player-title">自然风播放器</div>
                        <div class="player-controls">
                            <button class="player-btn" id="prevBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.536 5.464a5 5 0 0 1 0 7.072L8 14.07l-3.536-3.535a5 5 0 0 1 0-7.072l.707-.707a1 1 0 0 1 1.414 0l2.829 2.828a1 1 0 0 0 1.414 0l2.829-2.828a1 1 0 0 1 1.414 0l.707.707z"/>
                                </svg>
                            </button>
                            <button class="player-btn" id="playBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                                </svg>
                            </button>
                            <button class="player-btn" id="nextBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0Zm-2-6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="player-progress" id="progressBar">
                        <div class="player-progress-bar" id="progressBarFill"></div>
                    </div>
                    <div class="player-content" id="playerContent">
                        <!-- 播放内容将在这里渲染 -->
                    </div>
                    <div class="player-footer">
                        <div class="player-time">
                            <span id="currentTime">00:00</span> / <span id="duration">00:00</span>
                        </div>
                        <div class="player-volume">
                            <button class="player-btn" id="volumeBtn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-2.82 2.82c.74.87 1.19 2 1.19 3.19A4.5 4.5 0 0 1 8 12.5c0-1.19.45-2.32 1.19-3.19l-2.82-2.82Z"/>
                                </svg>
                            </button>
                            <input type="range" class="player-volume-slider" id="volumeSlider" min="0" max="100" value="70">
                        </div>
                    </div>
                </div>
            `,
            js: `
                // 自然风播放器控制逻辑
                const playBtn = document.getElementById('playBtn');
                const prevBtn = document.getElementById('prevBtn');
                const nextBtn = document.getElementById('nextBtn');
                const progressBar = document.getElementById('progressBar');
                const progressBarFill = document.getElementById('progressBarFill');
                const currentTimeEl = document.getElementById('currentTime');
                const durationEl = document.getElementById('duration');
                const volumeBtn = document.getElementById('volumeBtn');
                const volumeSlider = document.getElementById('volumeSlider');

                let isPlaying = false;
                let currentTime = 0;
                let duration = 0;

                // 播放/暂停
                playBtn.addEventListener('click', () => {
                    isPlaying = !isPlaying;
                    updatePlayButton();

                    if (isPlaying) {
                        this.emit('play');
                    } else {
                        this.emit('pause');
                    }
                });

                // 上一首/下一首
                prevBtn.addEventListener('click', () => {
                    this.emit('prev');
                });

                nextBtn.addEventListener('click', () => {
                    this.emit('next');
                });

                // 进度条控制
                progressBar.addEventListener('click', (e) => {
                    const rect = progressBar.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    currentTime = pos * duration;
                    updateProgressBar();
                    this.emit('seek', currentTime);
                });

                // 音量控制
                volumeSlider.addEventListener('input', (e) => {
                    const volume = e.target.value / 100;
                    this.emit('volumeChange', volume);
                });

                // 更新播放按钮
                function updatePlayButton() {
                    if (isPlaying) {
                        playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>';
                    } else {
                        playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
                    }
                }

                // 更新进度条
                function updateProgressBar() {
                    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                    progressBarFill.style.width = progress + '%';
                    currentTimeEl.textContent = formatTime(currentTime);
                }

                // 格式化时间
                function formatTime(seconds) {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')};
                }

                // 更新播放器状态
                this.updatePlayerState = (state) => {
                    if (state.isPlaying !== undefined) {
                        isPlaying = state.isPlaying;
                        updatePlayButton();
                    }

                    if (state.currentTime !== undefined) {
                        currentTime = state.currentTime;
                        updateProgressBar();
                    }

                    if (state.duration !== undefined) {
                        duration = state.duration;
                        durationEl.textContent = formatTime(duration);
                        updateProgressBar();
                    }
                };
            `
        });

        // 应用初始皮肤
        this.applySkin(this.options.skin);
    }

    /**
     * 注册皮肤
     * @param {string} skinId - 皮肤ID
     * @param {Object} skinConfig - 皮肤配置
     */
    registerSkin(skinId, skinConfig) {
        this.skins.set(skinId, skinConfig);
    }

    /**
     * 应用皮肤
     * @param {string} skinId - 皮肤ID
     */
    applySkin(skinId) {
        if (!this.skins.has(skinId)) {
            console.error(`皮肤 ${skinId} 不存在`);
            return;
        }

        const skin = this.skins.get(skinId);
        this.currentSkin = skin;

        // 清空容器
        this.container.innerHTML = '';

        // 创建样式元素
        const styleElement = document.createElement('style');
        styleElement.textContent = skin.css;
        this.container.appendChild(styleElement);

        // 创建HTML结构
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = skin.html;
        const playerElement = tempDiv.firstElementChild;
        this.container.appendChild(playerElement);

        // 执行JavaScript
        try {
            const script = document.createElement('script');
            script.textContent = `(function() { ${skin.js} }).bind(this)();`;
            this.container.appendChild(script);
        } catch (e) {
            console.error('执行皮肤JavaScript失败:', e);
        }

        // 触发皮肤应用事件
        this.emit('skinApplied', skinId);
    }

    /**
     * 切换皮肤
     * @param {string} skinId - 皮肤ID
     */
    switchSkin(skinId) {
        this.applySkin(skinId);
    }

    /**
     * 更新播放器状态
     * @param {Object} state - 播放器状态
     */
    updatePlayerState(state) {
        if (this.currentSkin && this.currentSkin.js) {
            // 皮肤JavaScript中应该定义了updatePlayerState方法
            // 这里我们通过eval来调用，实际项目中应该有更安全的方式
            try {
                const updateFunction = new Function('state', `
                    try {
                        ${this.currentSkin.js}
                        return this.updatePlayerState(state);
                    } catch (e) {
                        console.error('更新播放器状态失败:', e);
                    }
                `);
                updateFunction.call(this, state);
            } catch (e) {
                console.error('执行更新函数失败:', e);
            }
        }
    }

    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }

        this.eventListeners.get(event).push(callback);
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        if (!this.eventListeners.has(event)) return;

        this.eventListeners.get(event).forEach(callback => {
            callback(data);
        });
    }
}

// 导出模块
export default PlayerUI;
