/**
 * @file src/PageFlipInteraction.js
 * @description 翻页交互系统，实现非线性翻页交互和手势控制
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.1.0
 * @created 2026-03-06
 * @updated 2026-03-06
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 翻页交互,手势控制,动画效果
 */

/**
 * 翻页交互系统
 * 实现非线性翻页交互和手势控制
 */
class PageFlipInteraction {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            sensitivity: options.sensitivity || 50,
            enableGestures: options.enableGestures || true,
            animationDuration: options.animationDuration || 300,
            easing: options.easing || 'ease-out',
            ...options
        };

        this.currentPage = 0;
        this.totalPages = 0;
        this.isAnimating = false;
        this.gestureStart = { x: 0, y: 0 };
        this.gestureEnd = { x: 0, y: 0 };
        this.eventListeners = new Map();

        this.init();
    }

    /**
     * 初始化翻页交互系统
     */
    init() {
        // 初始化页面元素
        this.initPages();

        // 绑定事件
        this.bindEvents();

        // 初始化动画
        this.initAnimations();
    }

    /**
     * 初始化页面元素
     */
    initPages() {
        // 获取所有页面元素
        this.pages = Array.from(this.container.children);
        this.totalPages = this.pages.length;

        // 初始化页面样式
        this.pages.forEach((page, index) => {
            page.style.position = 'absolute';
            page.style.top = '0';
            page.style.left = '0';
            page.style.width = '100%';
            page.style.height = '100%';
            page.style.transform = index === 0 ? 'translateX(0)' : 'translateX(100%)';
            page.style.transition = `transform ${this.options.animationDuration}ms ${this.options.easing}`;
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 鼠标事件
        this.container.addEventListener('mousedown', this.handleGestureStart.bind(this));
        this.container.addEventListener('mousemove', this.handleGestureMove.bind(this));
        this.container.addEventListener('mouseup', this.handleGestureEnd.bind(this));
        this.container.addEventListener('mouseleave', this.handleGestureEnd.bind(this));

        // 触摸事件
        this.container.addEventListener('touchstart', this.handleGestureStart.bind(this), { passive: true });
        this.container.addEventListener('touchmove', this.handleGestureMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleGestureEnd.bind(this), { passive: true });

        // 键盘事件
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * 处理手势开始
     * @param {Event} e - 事件对象
     */
    handleGestureStart(e) {
        if (this.isAnimating) return;

        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        this.gestureStart = { x: clientX, y: clientY };
        this.gestureEnd = { x: clientX, y: clientY };
    }

    /**
     * 处理手势移动
     * @param {Event} e - 事件对象
     */
    handleGestureMove(e) {
        if (this.isAnimating || !this.gestureStart.x) return;

        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        this.gestureEnd = { x: clientX, y: clientY };

        // 计算移动距离
        const deltaX = this.gestureEnd.x - this.gestureStart.x;

        // 实时更新页面位置
        this.updatePagePositions(deltaX);

        // 阻止默认行为
        if (e.cancelable) {
            e.preventDefault();
        }
    }

    /**
     * 处理手势结束
     */
    handleGestureEnd() {
        if (this.isAnimating || !this.gestureStart.x) return;

        // 计算移动距离
        const deltaX = this.gestureEnd.x - this.gestureStart.x;

        // 判断是否需要翻页
        if (Math.abs(deltaX) > this.options.sensitivity) {
            if (deltaX > 0 && this.currentPage > 0) {
                // 向右滑动，上一页
                this.previousPage();
            } else if (deltaX < 0 && this.currentPage < this.totalPages - 1) {
                // 向左滑动，下一页
                this.nextPage();
            } else {
                // 恢复原位
                this.resetPagePositions();
            }
        } else {
            // 恢复原位
            this.resetPagePositions();
        }

        // 重置手势状态
        this.gestureStart = { x: 0, y: 0 };
        this.gestureEnd = { x: 0, y: 0 };
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} e - 键盘事件对象
     */
    handleKeyDown(e) {
        if (this.isAnimating) return;

        switch (e.key) {
            case 'ArrowLeft':
                if (this.currentPage < this.totalPages - 1) {
                    this.nextPage();
                }
                break;
            case 'ArrowRight':
                if (this.currentPage > 0) {
                    this.previousPage();
                }
                break;
            case 'PageDown':
                if (this.currentPage < this.totalPages - 1) {
                    this.nextPage();
                }
                break;
            case 'PageUp':
                if (this.currentPage > 0) {
                    this.previousPage();
                }
                break;
        }
    }

    /**
     * 更新页面位置
     * @param {number} deltaX - 水平移动距离
     */
    updatePagePositions(deltaX) {
        this.pages.forEach((page, index) => {
            if (index === this.currentPage) {
                // 当前页面
                page.style.transform = `translateX(${deltaX}px)`;
            } else if (index === this.currentPage + 1) {
                // 下一页
                page.style.transform = `translateX(${100 + deltaX}px)`;
            } else if (index === this.currentPage - 1) {
                // 上一页
                page.style.transform = `translateX(${-100 + deltaX}px)`;
            }
        });
    }

    /**
     * 重置页面位置
     */
    resetPagePositions() {
        this.pages.forEach((page, index) => {
            if (index < this.currentPage) {
                page.style.transform = 'translateX(-100%)';
            } else if (index === this.currentPage) {
                page.style.transform = 'translateX(0)';
            } else {
                page.style.transform = 'translateX(100%)';
            }
        });
    }

    /**
     * 初始化动画
     */
    initAnimations() {
        // 空间压缩动画
        this.animations = {
            spatialCompression: {
                name: '空间压缩',
                apply: (page, progress) => {
                    const scale = 1 - (progress * 0.1);
                    page.style.transform = `translateX(0) scale(${scale})`;
                }
            },
            organicFlow: {
                name: '有机流动',
                apply: (page, progress) => {
                    const rotation = progress * 5;
                    page.style.transform = `translateX(0) rotateY(${rotation}deg)`;
                }
            },
            smoothTransition: {
                name: '平滑过渡',
                apply: (page, progress) => {
                    const opacity = 1 - progress;
                    page.style.opacity = opacity;
                }
            }
        };
    }

    /**
     * 应用动画
     * @param {HTMLElement} page - 页面元素
     * @param {string} animationName - 动画名称
     * @param {number} progress - 动画进度（0-1）
     */
    applyAnimation(page, animationName, progress) {
        if (this.animations[animationName]) {
            this.animations[animationName].apply(page, progress);
        }
    }

    /**
     * 上一页
     */
    previousPage() {
        if (this.isAnimating || this.currentPage <= 0) return;

        this.isAnimating = true;
        this.currentPage--;

        // 更新页面位置
        this.resetPagePositions();

        // 触发事件
        this.emit('pageChange', this.currentPage);
        this.emit('pagePrevious', this.currentPage);

        // 播放音效
        if (window.soundManager) {
            window.soundManager.playSound('pageFlip');
        }

        // 动画结束后重置状态
        setTimeout(() => {
            this.isAnimating = false;
        }, this.options.animationDuration);
    }

    /**
     * 下一页
     */
    nextPage() {
        if (this.isAnimating || this.currentPage >= this.totalPages - 1) return;

        this.isAnimating = true;
        this.currentPage++;

        // 更新页面位置
        this.resetPagePositions();

        // 触发事件
        this.emit('pageChange', this.currentPage);
        this.emit('pageNext', this.currentPage);

        // 播放音效
        if (window.soundManager) {
            window.soundManager.playSound('pageFlip');
        }

        // 动画结束后重置状态
        setTimeout(() => {
            this.isAnimating = false;
        }, this.options.animationDuration);
    }

    /**
     * 跳转到指定页面
     * @param {number} pageIndex - 页面索引
     */
    goToPage(pageIndex) {
        if (this.isAnimating || pageIndex < 0 || pageIndex >= this.totalPages) return;

        this.isAnimating = true;
        this.currentPage = pageIndex;

        // 更新页面位置
        this.resetPagePositions();

        // 触发事件
        this.emit('pageChange', this.currentPage);
        this.emit('pageJump', this.currentPage);

        // 动画结束后重置状态
        setTimeout(() => {
            this.isAnimating = false;
        }, this.options.animationDuration);
    }

    /**
     * 集成logo到翻页系统
     * @param {HTMLElement} logo - logo元素
     * @param {Object} options - 配置选项
     */
    integrateLogo(logo, options = {}) {
        this.logo = logo;
        this.logoOptions = {
            position: options.position || 'top-right',
            size: options.size || '80px',
            transition: options.transition || 'all 0.3s ease',
            ...options
        };

        // 设置logo样式
        this.logo.style.position = 'absolute';
        this.logo.style.zIndex = '1000';
        this.logo.style.transition = this.logoOptions.transition;
        this.logo.style.width = this.logoOptions.size;
        this.logo.style.height = 'auto';

        // 设置位置
        this.updateLogoPosition();

        // 监听页面变化
        this.on('pageChange', () => {
            this.animateLogo();
        });
    }

    /**
     * 更新logo位置
     */
    updateLogoPosition() {
        if (!this.logo) return;

        const position = this.logoOptions.position;

        switch (position) {
            case 'top-left':
                this.logo.style.top = '20px';
                this.logo.style.left = '20px';
                break;
            case 'top-right':
                this.logo.style.top = '20px';
                this.logo.style.right = '20px';
                break;
            case 'bottom-left':
                this.logo.style.bottom = '20px';
                this.logo.style.left = '20px';
                break;
            case 'bottom-right':
                this.logo.style.bottom = '20px';
                this.logo.style.right = '20px';
                break;
        }
    }

    /**
     * 动画logo
     */
    animateLogo() {
        if (!this.logo) return;

        // 添加动画效果
        this.logo.style.transform = 'scale(1.1)';
        this.logo.style.opacity = '0.8';

        // 恢复原状
        setTimeout(() => {
            this.logo.style.transform = 'scale(1)';
            this.logo.style.opacity = '1';
        }, 300);
    }

    /**
     * 同步到大屏
     * @param {Object} bigScreen - 大屏对象
     */
    syncToBigScreen(bigScreen) {
        this.bigScreen = bigScreen;

        // 监听页面变化
        this.on('pageChange', (pageIndex) => {
            if (this.bigScreen && this.bigScreen.updatePage) {
                this.bigScreen.updatePage(pageIndex);
            }
        });
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
export default PageFlipInteraction;
