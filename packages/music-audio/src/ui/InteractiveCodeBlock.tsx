/**
 * @file src/InteractiveCodeBlock.tsx
 * @description 交互式代码块组件，支持代码高亮、复制、运行和情感化设计
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 代码块,React,代码高亮,交互
 */

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { motion } from 'framer-motion';

/**
 * 交互式代码块组件属性
 */
interface InteractiveCodeBlockProps {
    code: string;
    language: string;
    title?: string;
    emotion?: 'neutral' | 'learning' | 'creative' | 'analytical';
    onRun?: (code: string) => void;
    showRunButton?: boolean;
}

/**
 * 交互式代码块组件
 * 支持代码高亮、复制、运行和情感化设计
 */
const InteractiveCodeBlock: React.FC<InteractiveCodeBlockProps> = ({
    code,
    language,
    title = '代码示例',
    emotion = 'neutral',
    onRun,
    showRunButton = true
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    /**
     * 根据情感状态获取样式
     */
    const getEmotionStyle = () => {
        switch (emotion) {
            case 'learning':
                return {
                    borderColor: '#36B37E',
                    backgroundColor: 'rgba(54, 179, 126, 0.1)',
                    textColor: '#36B37E'
                };
            case 'creative':
                return {
                    borderColor: '#9B51E0',
                    backgroundColor: 'rgba(155, 81, 224, 0.1)',
                    textColor: '#9B51E0'
                };
            case 'analytical':
                return {
                    borderColor: '#4A90E2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    textColor: '#4A90E2'
                };
            default:
                return {
                    borderColor: '#4A90E2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    textColor: '#4A90E2'
                };
        }
    };

    /**
     * 复制代码到剪贴板
     */
    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    /**
     * 运行代码
     */
    const runCode = () => {
        if (onRun) {
            onRun(code);
        }
    };

    const emotionStyle = getEmotionStyle();

    return (
        <motion.div
            className="code-block-container"
            style={{
                border: `1px solid ${emotionStyle.borderColor}`,
                borderRadius: '8px',
                overflow: 'hidden',
                margin: '16px 0',
                backgroundColor: emotionStyle.backgroundColor
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div
                className="code-header"
                style={{
                    padding: '12px 16px',
                    backgroundColor: emotionStyle.borderColor,
                    color: '#F7F9FA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <div
                    className="code-title"
                    style={{
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    {title}
                </div>
                <div
                    className="code-actions"
                    style={{
                        display: 'flex',
                        gap: '8px'
                    }}
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={copyToClipboard}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#F7F9FA',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '4px'
                        }}
                    >
                        {isCopied ? '✓ 已复制' : '📋 复制'}
                    </motion.button>
                    {showRunButton && onRun && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={runCode}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#F7F9FA',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}
                        >
                            ▶️ 运行
                        </motion.button>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#F7F9FA',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '4px'
                        }}
                    >
                        {isExpanded ? '▲ 收起' : '▼ 展开'}
                    </motion.button>
                </div>
            </div>

            {isExpanded && (
                <div
                    className="code-content"
                    style={{
                        padding: '16px'
                    }}
                >
                    <SyntaxHighlighter
                        language={language}
                        style={tomorrow}
                        customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            fontSize: '14px',
                            lineHeight: '1.5',
                            background: 'transparent'
                        }}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            )}
        </motion.div>
    );
};

export default InteractiveCodeBlock;