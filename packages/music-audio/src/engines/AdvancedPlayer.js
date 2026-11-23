/**
 * @file src/AdvancedPlayer.js
 * @description 高级播放器，整合SoundResourceManager和PlayerUI，提供完整的播放控制功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.1.0
 * @created 2026-03-06
 * @updated 2026-11-09（合入主仓 §W2 hls.js 事件转发：MANIFEST_PARSED 续播 / ERROR / LEVEL_LOADED）
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 播放器,高级功能,资源管理
 * @depends SoundResourceManager, PlayerUI
 */

import Hls from 'hls.js';
import PlayerUI from '../ui/PlayerUI.js';
import SoundResourceManager from './SoundResourceManager.js';

/**
 * 高级播放器
 * 整合SoundResourceManager和PlayerUI，提供完整的播放控制功能
 *
 * §W2 补内核：音频内核升级为 hls.js 自适应流（HLS/DASH），普通文件降级为原生 Audio。
 * 保持现有 on/emit 接口与 PlayerUI 事件契约不变。
 */
class AdvancedPlayer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            theme: options.theme || 'default',
            skin: options.skin || 'default',
            autoPlay: options.autoPlay || false,
            playlist: options.playlist || [],
            currentIndex: options.currentIndex || 0,
            ...options
        };

        this.soundManager = new SoundResourceManager();
        this.playerUI = new PlayerUI(container, options);
        this.playlist = this.options.playlist;
        this.currentIndex = this.options.currentIndex;
        this.isPlaying = false;
        this.currentTrack = null;
        this.streamEngine = null;
        this.eventListeners = new Map();

        this.init();
    }

    /**
     * 初始化高级播放器
     */
    init() {
        // 预加载音效
        this.soundManager.preloadAllSounds();

        // 绑定UI事件
        this.bindUIEvents();

        // 加载当前曲目
        if (this.playlist.length > 0) {
            this.loadTrack(this.currentIndex);
        }

        // 自动播放
        if (this.options.autoPlay && this.playlist.length > 0) {
            this.play();
        }
    }

    /**
     * 绑定UI事件
     */
    bindUIEvents() {
        // 播放/暂停
        this.playerUI.on('play', () => {
            this.play();
        });

        this.playerUI.on('pause', () => {
            this.pause();
        });

        // 上一首/下一首
        this.playerUI.on('prev', () => {
            this.prev();
        });

        this.playerUI.on('next', () => {
            this.next();
        });

        // 进度条控制
        this.playerUI.on('seek', (position) => {
            this.seek(position);
        });

        // 音量控制
        this.playerUI.on('volumeChange', (volume) => {
            this.setVolume(volume);
        });

        // 皮肤切换
        this.playerUI.on('skinApplied', (skinId) => {
            // 同步音效皮肤
            this.soundManager.switchSoundSkin(skinId);
        });
    }

    /**
     * 加载曲目
     * HLS（.m3u8）源使用 hls.js 自适应流内核；
     * 其余源与不支持的浏览器降级为原生 Audio（Safari 可原生播放 HLS）。
     * @param {number} index - 曲目索引
     */
    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) {
            console.error('曲目索引超出范围');
            return;
        }

        this.currentIndex = index;
        this.currentTrack = this.playlist[index];

        // 停止当前播放并销毁旧内核
        if (this.isPlaying) {
            this.pause();
        }

        // 销毁上一首的 hls.js 实例，避免泄漏
        this.destroyStreamEngine();

        // 加载音频：hls.js 优先，原生 Audio 兜底
        const src = this.currentTrack.src;
        const isHlsSrc = typeof src === 'string' && /\.m3u8(\?|$)/i.test(src);

        if (isHlsSrc && Hls.isSupported()) {
            this.audio = new Audio();
            this.streamEngine = new Hls({ enableWorker: true, lowLatencyMode: true });
            this.streamEngine.loadSource(src);
            this.streamEngine.attachMedia(this.audio);

            // 主仓 §W2：HLS 事件转发（清单解析后续播 / 错误转发 / 分片加载通知）。
            // 真实 hls.js 才有静态 Events 与实例 on；精简内核/测试 mock 下自动跳过。
            if (Hls.Events && typeof this.streamEngine.on === 'function') {
                this.streamEngine.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (this.isPlaying) {
                        this.audio.play().catch(() => {});
                    }
                    this.updateUI();
                });

                this.streamEngine.on(Hls.Events.ERROR, (event, data) => {
                    console.error('hls.js 错误:', data);
                    this.emit('trackError', { track: this.currentTrack, error: data });
                });

                this.streamEngine.on(Hls.Events.LEVEL_LOADED, () => {
                    this.emit('hlsLevelLoaded');
                });
            }
        } else {
            // 原生 Audio：MP3/MP4 等常规格式，以及 Safari 原生 HLS
            this.audio = new Audio(src);
        }

        // 绑定音频事件
        this.bindAudioEvents();

        // 更新UI
        this.updateUI();

        // 触发加载事件（两侧共同契约：同步派发，供 UI/测试联动）
        this.emit('trackLoaded', this.currentTrack);
    }

    /**
     * 销毁当前流媒体引擎（hls.js），释放 MSE 资源
     */
    destroyStreamEngine() {
        if (this.streamEngine) {
            try {
                this.streamEngine.destroy();
            } catch (e) {
                // 引擎可能已随媒体元素销毁
            }
            this.streamEngine = null;
        }
    }

    /**
     * 释放播放器持有的全部媒体资源
     */
    dispose() {
        this.destroyStreamEngine();
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            this.audio = null;
        }
        this.isPlaying = false;
        this.currentTrack = null;
        this.emit('disposed');
    }

    /**
     * 绑定音频事件
     */
    bindAudioEvents() {
        // 播放结束
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updateUI();
            this.emit('trackEnded', this.currentTrack);

            // 自动播放下一首
            this.next();
        });

        // 播放进度更新
        this.audio.addEventListener('timeupdate', () => {
            this.updateUI();
        });

        // 加载完成
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateUI();
        });

        // 错误处理
        this.audio.addEventListener('error', (e) => {
            console.error('音频加载失败:', e);
            this.emit('trackError', { track: this.currentTrack, error: e });
        });
    }

    /**
     * 播放
     */
    play() {
        if (!this.currentTrack || !this.audio) return;

        try {
            this.audio.play();
            this.isPlaying = true;
            this.updateUI();
            this.emit('play', this.currentTrack);

            // 播放音效
            this.soundManager.playSound('buttonClick');
        } catch (e) {
            console.error('播放失败:', e);
            this.emit('playError', e);
        }
    }

    /**
     * 暂停
     */
    pause() {
        if (!this.audio) return;

        this.audio.pause();
        this.isPlaying = false;
        this.updateUI();
        this.emit('pause', this.currentTrack);

        // 播放音效
        this.soundManager.playSound('buttonClick');
    }

    /**
     * 上一首
     */
    prev() {
        let index = this.currentIndex - 1;
        if (index < 0) {
            index = this.playlist.length - 1; // 循环播放
        }
        this.loadTrack(index);
        this.play();

        // 播放音效
        this.soundManager.playSound('buttonClick');
    }

    /**
     * 下一首
     */
    next() {
        let index = this.currentIndex + 1;
        if (index >= this.playlist.length) {
            index = 0; // 循环播放
        }
        this.loadTrack(index);
        this.play();

        // 播放音效
        this.soundManager.playSound('buttonClick');
    }

    /**
     * 跳转到指定位置
     * @param {number} position - 位置（秒）
     */
    seek(position) {
        if (!this.audio) return;

        this.audio.currentTime = position;
        this.updateUI();
        this.emit('seek', position);
    }

    /**
     * 设置音量
     * @param {number} volume - 音量（0-1）
     */
    setVolume(volume) {
        if (!this.audio) return;

        this.audio.volume = volume;
        this.soundManager.setVolume(volume);
        this.emit('volumeChange', volume);
    }

    /**
     * 静音/取消静音
     * @param {boolean} muted - 是否静音
     */
    setMuted(muted) {
        if (!this.audio) return;

        this.audio.muted = muted;
        this.soundManager.setMuted(muted);
        this.emit('mutedChange', muted);
    }

    /**
     * 更新UI
     */
    updateUI() {
        if (!this.playerUI || !this.audio) return;

        const state = {
            isPlaying: this.isPlaying,
            currentTime: this.audio.currentTime,
            duration: this.audio.duration || 0
        };

        this.playerUI.updatePlayerState(state);
    }

    /**
     * 添加曲目到播放列表
     * @param {Object} track - 曲目信息
     */
    addTrack(track) {
        this.playlist.push(track);
        this.emit('trackAdded', track);
    }

    /**
     * 从播放列表移除曲目
     * @param {number} index - 曲目索引
     */
    removeTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;

        const removedTrack = this.playlist.splice(index, 1)[0];
        this.emit('trackRemoved', removedTrack);

        // 如果移除的是当前播放的曲目，加载下一首
        if (index === this.currentIndex) {
            if (this.playlist.length > 0) {
                this.currentIndex = Math.min(this.currentIndex, this.playlist.length - 1);
                this.loadTrack(this.currentIndex);
                this.play();
            } else {
                this.currentTrack = null;
                this.audio = null;
                this.isPlaying = false;
                this.updateUI();
            }
        } else if (index < this.currentIndex) {
            // 如果移除的曲目在当前曲目之前，更新当前索引
            this.currentIndex--;
        }
    }

    /**
     * 清空播放列表
     */
    clearPlaylist() {
        this.destroyStreamEngine();
        this.playlist = [];
        this.currentIndex = 0;
        this.currentTrack = null;
        this.audio = null;
        this.isPlaying = false;
        this.updateUI();
        this.emit('playlistCleared');
    }

    /**
     * 切换皮肤
     * @param {string} skinId - 皮肤ID
     */
    switchSkin(skinId) {
        this.playerUI.switchSkin(skinId);
        this.soundManager.switchSoundSkin(skinId);
        this.emit('skinChanged', skinId);
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
export default AdvancedPlayer;
