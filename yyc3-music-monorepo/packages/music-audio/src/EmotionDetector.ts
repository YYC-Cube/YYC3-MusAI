/**
 * @file src/EmotionDetector.ts
 * @description 情感检测器，支持NLP情感分析和行为模式分析
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 情感识别,NLP,情感分析
 */

/**
 * 用户行为数据接口
 */
interface UserBehavior {
    clickFrequency: number;
    dwellTime: number;
    scrollSpeed: number;
    typingSpeed?: number;
}

/**
 * 情感状态接口
 */
interface EmotionState {
    emotion: 'happy' | 'sad' | 'anxious' | 'confused' | 'angry' | 'neutral';
    confidence: number;
    intensity: number;
}

/**
 * 情感检测结果接口
 */
interface EmotionDetectionResult {
    emotion: EmotionState;
    sentiment: number;
    suggestions: string[];
}

/**
 * 情感检测器
 * 支持NLP情感分析和行为模式分析
 */
class EmotionDetector {
    private sentimentThresholds = {
        positive: 0.3,
        negative: -0.3
    };

    /**
     * 检测用户情感
     * @param {string} userInput - 用户输入文本
     * @param {UserBehavior} userBehavior - 用户行为数据
     * @returns {Promise<EmotionDetectionResult>} 情感检测结果
     */
    async detectUserEmotion(
        userInput: string,
        userBehavior: UserBehavior
    ): Promise<EmotionDetectionResult> {
        try {
            // 1. NLP情感分析
            const sentiment = await this.sentimentAnalysis(userInput);
            
            // 2. 行为模式分析
            const behaviorPattern = this.analyzeBehavior(userBehavior);
            
            // 3. 综合判断情绪状态
            const emotionState = this.combineSentimentAndBehavior(sentiment, behaviorPattern);
            
            // 4. 生成建议
            const suggestions = this.generateSuggestions(emotionState);
            
            return {
                emotion: emotionState,
                sentiment: sentiment,
                suggestions: suggestions
            };
        } catch (error) {
            console.error('Error detecting emotion:', error);
            return {
                emotion: {
                    emotion: 'neutral',
                    confidence: 0.5,
                    intensity: 0.5
                },
                sentiment: 0,
                suggestions: []
            };
        }
    }

    /**
     * NLP情感分析
     * @param {string} text - 输入文本
     * @returns {Promise<number>} 情感分数 (-1 到 1)
     */
    private async sentimentAnalysis(text: string): Promise<number> {
        // 这里可以集成实际的NLP库，如TextBlob、NLTK、transformers等
        // 目前使用简单的关键词匹配作为示例
        
        const positiveKeywords = ['开心', '高兴', '快乐', '棒', '好', '喜欢', '爱', 'happy', 'good', 'great', 'love'];
        const negativeKeywords = ['难过', '伤心', '痛苦', '坏', '讨厌', '恨', 'sad', 'bad', 'hate', 'angry'];
        const anxietyKeywords = ['焦虑', '紧张', '担心', '害怕', 'anxious', 'worried', 'scared'];
        const confusionKeywords = ['困惑', '不懂', '不明白', 'confused', 'don\'t understand'];
        
        let score = 0;
        const lowerText = text.toLowerCase();
        
        positiveKeywords.forEach(keyword => {
            if (lowerText.includes(keyword)) score += 0.2;
        });
        
        negativeKeywords.forEach(keyword => {
            if (lowerText.includes(keyword)) score -= 0.2;
        });
        
        anxietyKeywords.forEach(keyword => {
            if (lowerText.includes(keyword)) score -= 0.15;
        });
        
        confusionKeywords.forEach(keyword => {
            if (lowerText.includes(keyword)) score -= 0.1;
        });
        
        // 限制分数范围
        return Math.max(-1, Math.min(1, score));
    }

    /**
     * 行为模式分析
     * @param {UserBehavior} behavior - 用户行为数据
     * @returns {Object} 行为模式分析结果
     */
    private analyzeBehavior(behavior: UserBehavior) {
        const pattern = {
            isImpatient: behavior.clickFrequency > 10,
            isHesitant: behavior.dwellTime > 30,
            isRushed: behavior.scrollSpeed > 100,
            isTypingFast: behavior.typingSpeed && behavior.typingSpeed > 100
        };
        
        return pattern;
    }

    /**
     * 综合判断情绪状态
     * @param {number} sentiment - 情感分数
     * @param {Object} behaviorPattern - 行为模式
     * @returns {EmotionState} 情绪状态
     */
    private combineSentimentAndBehavior(
        sentiment: number,
        behaviorPattern: any
    ): EmotionState {
        let emotion: EmotionState['emotion'];
        let confidence = 0.7;
        let intensity = Math.abs(sentiment);

        // 根据情感分数和行为模式判断情绪
        if (sentiment > this.sentimentThresholds.positive) {
            emotion = 'happy';
            intensity = Math.max(intensity, 0.7);
        } else if (sentiment < this.sentimentThresholds.negative) {
            if (behaviorPattern.isImpatient || behaviorPattern.isRushed) {
                emotion = 'angry';
                intensity = Math.max(intensity, 0.8);
            } else {
                emotion = 'sad';
                intensity = Math.max(intensity, 0.6);
            }
        } else if (behaviorPattern.isHesitant) {
            emotion = 'confused';
            intensity = 0.5;
        } else {
            emotion = 'neutral';
            intensity = 0.3;
        }

        // 考虑焦虑关键词
        if (sentiment < -0.1 && sentiment > -0.3) {
            emotion = 'anxious';
            intensity = 0.6;
        }

        return {
            emotion,
            confidence,
            intensity
        };
    }

    /**
     * 生成建议
     * @param {EmotionState} emotionState - 情绪状态
     * @returns {string[]} 建议列表
     */
    private generateSuggestions(emotionState: EmotionState): string[] {
        const suggestions: string[] = [];
        
        switch (emotionState.emotion) {
            case 'happy':
                suggestions.push('继续保持积极的心态！');
                suggestions.push('可以尝试分享你的快乐。');
                break;
            case 'sad':
                suggestions.push('深呼吸，放松一下。');
                suggestions.push('听听舒缓的音乐。');
                suggestions.push('和朋友聊聊天。');
                break;
            case 'anxious':
                suggestions.push('尝试冥想或深呼吸练习。');
                suggestions.push('分解问题，一步步解决。');
                suggestions.push('寻求专业帮助。');
                break;
            case 'confused':
                suggestions.push('可以尝试重新表述问题。');
                suggestions.push('查看相关资料或示例。');
                break;
            case 'angry':
                suggestions.push('先冷静一下，深呼吸。');
                suggestions.push('尝试从不同角度看问题。');
                break;
            case 'neutral':
                suggestions.push('保持良好的状态。');
                break;
        }
        
        return suggestions;
    }

    /**
     * 获取情感强度描述
     * @param {number} intensity - 情感强度
     * @returns {string} 强度描述
     */
    getIntensityDescription(intensity: number): string {
        if (intensity < 0.3) return '轻微';
        if (intensity < 0.6) return '中等';
        if (intensity < 0.8) return '强烈';
        return '非常强烈';
    }
}

export default EmotionDetector;