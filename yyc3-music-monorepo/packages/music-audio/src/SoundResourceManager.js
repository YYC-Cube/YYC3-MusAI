/**
 * @file src/SoundResourceManager.js
 * @description 音效资源管理器，实现音效加载、播放、管理和皮肤切换功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.1.0
 * @created 2026-03-06
 * @updated 2026-03-06
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 音效系统,资源管理,皮肤切换
 */

/**
 * 音效资源管理器
 * 实现音效加载、播放、管理和皮肤切换功能
 */
class SoundResourceManager {
    constructor() {
        this.soundLibrary = new Map();
        this.currentSkin = 'default';
        this.volume = 0.7;
        this.muted = false;
        this.audioContext = null;
        this.soundSkins = new Map();
        this.eventListeners = new Map();
        this.init();
    }

    /**
     * 初始化音效管理器
     */
    init() {
        // 初始化Web Audio API
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.error('Web Audio API is not supported in this browser');
        }

        // 注册默认音效皮肤
        this.registerSoundSkin('default', {
            name: '默认音效',
            sounds: {
                pageFlip: '/sounds/default/page-flip.mp3',
                buttonClick: '/sounds/default/button-click.mp3',
                notification: '/sounds/default/notification.mp3',
                error: '/sounds/default/error.mp3',
                success: '/sounds/default/success.mp3'
            }
        });

        // 注册科技风音效皮肤
        this.registerSoundSkin('tech', {
            name: '科技风音效',
            sounds: {
                pageFlip: '/sounds/tech/page-flip.mp3',
                buttonClick: '/sounds/tech/button-click.mp3',
                notification: '/sounds/tech/notification.mp3',
                error: '/sounds/tech/error.mp3',
                success: '/sounds/tech/success.mp3'
            }
        });

        // 注册自然风音效皮肤
        this.registerSoundSkin('nature', {
            name: '自然风音效',
            sounds: {
                pageFlip: '/sounds/nature/page-flip.mp3',
                buttonClick: '/sounds/nature/button-click.mp3',
                notification: '/sounds/nature/notification.mp3',
                error: '/sounds/nature/error.mp3',
                success: '/sounds/nature/success.mp3'
            }
        });
    }

    /**
     * 注册音效皮肤
     * @param {string} skinId - 皮肤ID
     * @param {Object} skinConfig - 皮肤配置
     */
    registerSoundSkin(skinId, skinConfig) {
        this.soundSkins.set(skinId, skinConfig);
    }

    /**
     * 切换音效皮肤
     * @param {string} skinId - 皮肤ID
     */
    switchSoundSkin(skinId) {
        if (!this.soundSkins.has(skinId)) {
            console.error(`音效皮肤 ${skinId} 不存在`);
            return;
        }

        this.currentSkin = skinId;
        this.emit('skinChanged', skinId);
    }

    /**
     * 加载音效
     * @param {string} soundId - 音效ID
     * @returns {Promise} 加载完成的Promise
     */
    loadSound(soundId) {
        return new Promise((resolve, reject) => {
            if (this.soundLibrary.has(soundId)) {
                resolve(this.soundLibrary.get(soundId));
                return;
            }

            const skin = this.soundSkins.get(this.currentSkin);
            if (!skin || !skin.sounds[soundId]) {
                reject(new Error(`音效 ${soundId} 在当前皮肤中不存在`));
                return;
            }

            const soundPath = skin.sounds[soundId];
            const audio = new Audio();

            audio.addEventListener('canplaythrough', () => {
                this.soundLibrary.set(soundId, audio);
                resolve(audio);
            });

            audio.addEventListener('error', (e) => {
                reject(new Error(`加载音效 ${soundId} 失败: ${e.message}`));
            });

            audio.src = soundPath;
            audio.load();
        });
    }

    /**
     * 播放音效
     * @param {string} soundId - 音效ID
     * @param {Object} options - 播放选项
     * @returns {Promise} 播放完成的Promise
     */
    async playSound(soundId, options = {}) {
        if (this.muted) return;

        const audio = await this.loadSound(soundId);

        // 设置音量
        audio.volume = this.volume * (options.volume || 1);

        // 设置播放速率
        if (options.playbackRate) {
            audio.playbackRate = options.playbackRate;
        }

        // 设置循环
        audio.loop = options.loop || false;

        // 播放音效
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            await playPromise;
            if (!options.loop) {
                await new Promise((resolve) => {
                    audio.addEventListener('ended', resolve, { once: true });
                });
            }
        } else {
            // 旧版浏览器不支持 play() 返回 Promise
            if (!options.loop) {
                await new Promise((resolve) => {
                    audio.addEventListener('ended', resolve, { once: true });
                });
            }
        }
    }

    /**
     * 停止音效
     * @param {string} soundId - 音效ID
     */
    stopSound(soundId) {
        if (this.soundLibrary.has(soundId)) {
            const audio = this.soundLibrary.get(soundId);
            audio.pause();
            audio.currentTime = 0;
        }
    }

    /**
     * 设置音量
     * @param {number} volume - 音量 (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.emit('volumeChanged', this.volume);
    }

    /**
     * 静音/取消静音
     * @param {boolean} muted - 是否静音
     */
    setMuted(muted) {
        this.muted = muted;
        this.emit('mutedChanged', this.muted);
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

    /**
     * 预加载所有音效
     * @returns {Promise} 预加载完成的Promise
     */
    preloadAllSounds() {
        const skin = this.soundSkins.get(this.currentSkin);
        if (!skin) return Promise.resolve();

        const soundPromises = Object.keys(skin.sounds).map(soundId => {
            return this.loadSound(soundId);
        });

        return Promise.all(soundPromises);
    }
}

// 导出模块
export default SoundResourceManager;
