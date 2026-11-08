/**
 * @file src/WebAudioPlayer.js
 * @description Web Audio API音效播放器，支持基本音效播放和情感化音效效果
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 音效系统,Web Audio API,音频播放
 */

/**
 * Web Audio API音效播放器
 * 支持基本音效播放和情感化音效效果
 */
class WebAudioPlayer {
    constructor() {
        this.audioContext = null;
        this.audioCache = new Map();
        this.init();
    }

    /**
     * 初始化AudioContext
     */
    init() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.error('Web Audio API is not supported in this browser');
        }
    }

    /**
     * 基本音效播放
     * @param {string} url - 音效文件URL
     * @param {number} volume - 音量 (0-1)
     * @returns {Promise} 播放完成的Promise
     */
    async playSound(url, volume = 0.5) {
        if (!this.audioContext) {
            console.error('AudioContext not initialized');
            return Promise.reject(new Error('AudioContext not initialized'));
        }

        try {
            // 检查缓存
            if (this.audioCache.has(url)) {
                return this.playBuffer(this.audioCache.get(url), volume);
            }

            // 加载音频文件
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // 缓存音频数据
            this.audioCache.set(url, audioBuffer);

            return this.playBuffer(audioBuffer, volume);
        } catch (error) {
            console.error('Error playing sound:', error);
            return Promise.reject(error);
        }
    }

    /**
     * 播放音频缓冲区
     * @param {AudioBuffer} audioBuffer - 音频缓冲区
     * @param {number} volume - 音量
     * @returns {Promise} 播放完成的Promise
     */
    playBuffer(audioBuffer, volume) {
        return new Promise((resolve, reject) => {
            try {
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;

                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = volume;

                source.connect(gainNode).connect(this.audioContext.destination);
                source.start(0);

                source.onended = () => {
                    resolve();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 带淡入淡出、情感效果的音效播放
     * @param {string} url - 音效文件URL
     * @param {string} emotion - 情感类型 (default, calm, happy, sad)
     * @returns {Promise} 播放完成的Promise
     */
    async playEmotionSound(url, emotion = 'default') {
        if (!this.audioContext) {
            console.error('AudioContext not initialized');
            return Promise.reject(new Error('AudioContext not initialized'));
        }

        try {
            // 检查缓存
            let audioBuffer;
            if (this.audioCache.has(url)) {
                audioBuffer = this.audioCache.get(url);
            } else {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.audioCache.set(url, audioBuffer);
            }

            return this.playEmotionBuffer(audioBuffer, emotion);
        } catch (error) {
            console.error('Error playing emotion sound:', error);
            return Promise.reject(error);
        }
    }

    /**
     * 播放带情感效果的音频缓冲区
     * @param {AudioBuffer} audioBuffer - 音频缓冲区
     * @param {string} emotion - 情感类型
     * @returns {Promise} 播放完成的Promise
     */
    playEmotionBuffer(audioBuffer, emotion) {
        return new Promise((resolve, reject) => {
            try {
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;

                const gainNode = this.audioContext.createGain();

                // 根据情感类型调节音量
                switch (emotion) {
                    case 'calm':
                        gainNode.gain.value = 0.3;
                        break;
                    case 'happy':
                        gainNode.gain.value = 0.6;
                        break;
                    case 'sad':
                        gainNode.gain.value = 0.3;
                        break;
                    default:
                        gainNode.gain.value = 0.5;
                }

                // 淡入效果
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(
                    gainNode.gain.value,
                    this.audioContext.currentTime + 0.5
                );

                source.connect(gainNode).connect(this.audioContext.destination);
                source.start(0);

                // 淡出效果
                source.onended = () => {
                    gainNode.gain.linearRampToValueAtTime(
                        0,
                        this.audioContext.currentTime + 0.5
                    );
                    resolve();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 清除音频缓存
     */
    clearCache() {
        this.audioCache.clear();
    }

    /**
     * 获取缓存大小
     * @returns {number} 缓存中的音频数量
     */
    getCacheSize() {
        return this.audioCache.size;
    }
}

export default WebAudioPlayer;
