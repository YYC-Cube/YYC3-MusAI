/**
 * @file src/InteractiveMindMap.tsx
 * @description 交互式思维导图组件，支持节点交互、情感化设计和可视化
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 思维导图,React,可视化,交互
 */

import React, { useCallback, useState } from 'react';
import ReactFlow, {
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    addEdge,
    Connection,
    NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';

/**
 * 思维导图节点数据接口
 */
interface MindMapNodeData {
    title: string;
    content?: string;
    type: 'concept' | 'example' | 'exercise' | 'resource';
    emotion?: 'neutral' | 'important' | 'challenging' | 'encouraging';
}

/**
 * 思维导图组件属性
 */
interface InteractiveMindMapProps {
    initialNodes: Node<MindMapNodeData>[];
    initialEdges: Edge[];
    onNodeClick?: (node: Node<MindMapNodeData>) => void;
    theme?: 'learning' | 'creative' | 'analytical';
}

/**
 * 自定义节点组件
 */
const CustomNode: React.FC<{ data: MindMapNodeData; selected: boolean }> = ({ data, selected }) => {
    /**
     * 根据情感状态获取样式
     */
    const getEmotionStyle = () => {
        switch (data.emotion) {
            case 'important':
                return {
                    background: '#F5A623',
                    color: '#1A3E5E',
                    border: '2px solid #F5A623'
                };
            case 'challenging':
                return {
                    background: '#DE4C4A',
                    color: '#F7F9FA',
                    border: '2px solid #DE4C4A'
                };
            case 'encouraging':
                return {
                    background: '#36B37E',
                    color: '#F7F9FA',
                    border: '2px solid #36B37E'
                };
            default:
                return {
                    background: '#4A90E2',
                    color: '#F7F9FA',
                    border: '2px solid #4A90E2'
                };
        }
    };

    /**
     * 根据节点类型获取图标
     */
    const getTypeIcon = () => {
        switch (data.type) {
            case 'concept':
                return '💡';
            case 'example':
                return '📝';
            case 'exercise':
                return '✏️';
            case 'resource':
                return '📚';
            default:
                return '📌';
        }
    };

    const style = getEmotionStyle();
    const icon = getTypeIcon();

    return (
        <motion.div
            className="custom-node"
            style={{
                padding: '12px',
                borderRadius: '8px',
                background: style.background,
                color: style.color,
                border: style.border,
                minWidth: '150px',
                textAlign: 'center',
                boxShadow: selected ? '0 0 0 2px #1A3E5E' : '0 4px 8px rgba(0,0,0,0.1)',
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div
                className="node-icon"
                style={{
                    fontSize: '20px',
                    marginBottom: '8px'
                }}
            >
                {icon}
            </div>
            <div
                className="node-title"
                style={{
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    fontSize: '14px'
                }}
            >
                {data.title}
            </div>
            {data.content && (
                <div
                    className="node-content"
                    style={{
                        fontSize: '12px',
                        opacity: 0.9
                    }}
                >
                    {data.content}
                </div>
            )}
            {data.emotion && (
                <div
                    className="node-emoji"
                    style={{
                        fontSize: '16px',
                        marginTop: '8px'
                    }}
                >
                    {data.emotion === 'important' ? '⭐' :
                     data.emotion === 'challenging' ? '🔥' :
                     data.emotion === 'encouraging' ? '🌟' : '💡'}
                </div>
            )}
        </motion.div>
    );
};

// 节点类型定义
const nodeTypes: NodeTypes = {
    custom: CustomNode,
};

/**
 * 交互式思维导图组件
 * 支持节点交互、情感化设计和可视化
 */
const InteractiveMindMap: React.FC<InteractiveMindMapProps> = ({
    initialNodes,
    initialEdges,
    onNodeClick,
    theme = 'learning'
}) => {
    const [nodes, setNodes] = useState<Node<MindMapNodeData>[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node<MindMapNodeData> | null>(null);

    /**
     * 节点变化处理
     */
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    /**
     * 边变化处理
     */
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    /**
     * 连接处理
     */
    const onConnect = useCallback(
        (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
        [setEdges]
    );

    /**
     * 节点点击处理
     */
    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node<MindMapNodeData>) => {
        setSelectedNode(node);
        if (onNodeClick) {
            onNodeClick(node);
        }
    }, [onNodeClick]);

    /**
     * 获取主题样式
     */
    const getThemeStyle = () => {
        switch (theme) {
            case 'learning':
                return {
                    background: '#e6ffed',
                    gridColor: '#b7eb8f'
                };
            case 'creative':
                return {
                    background: '#f3e8ff',
                    gridColor: '#d8b4fe'
                };
            case 'analytical':
                return {
                    background: '#e6f7ff',
                    gridColor: '#bae7ff'
                };
            default:
                return {
                    background: '#f7f9fa',
                    gridColor: '#d9d9d9'
                };
        }
    };

    const themeStyle = getThemeStyle();

    return (
        <div style={{ width: '100%', height: '600px', position: 'relative' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                style={{
                    background: themeStyle.background
                }}
            >
                <Background
                    color={themeStyle.gridColor}
                    gap={20}
                    size={1}
                />
                <Controls />
            </ReactFlow>

            {selectedNode && (
                <motion.div
                    className="node-details"
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        width: '280px',
                        padding: '20px',
                        background: '#F7F9FA',
                        border: '2px solid #4A90E2',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        zIndex: 10
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <h3 style={{
                        marginTop: 0,
                        color: '#1A3E5E',
                        fontSize: '18px',
                        marginBottom: '12px'
                    }}>
                        {selectedNode.data.title}
                    </h3>
                    {selectedNode.data.content && (
                        <p style={{
                            color: '#1A3E5E',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            marginBottom: '16px'
                        }}>
                            {selectedNode.data.content}
                        </p>
                    )}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: '#4A90E2',
                            color: '#F7F9FA',
                            fontSize: '12px'
                        }}>
                            类型: {selectedNode.data.type}
                        </span>
                        {selectedNode.data.emotion && (
                            <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: '#36B37E',
                                color: '#F7F9FA',
                                fontSize: '12px'
                            }}>
                                情感: {selectedNode.data.emotion}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setSelectedNode(null)}
                        style={{
                            width: '100%',
                            marginTop: '16px',
                            padding: '10px',
                            background: '#4A90E2',
                            color: '#F7F9FA',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#3a7bc8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#4A90E2';
                        }}
                    >
                        关闭
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default InteractiveMindMap;