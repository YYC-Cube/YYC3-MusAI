import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, GitBranch, GitFork, User, Music, ChevronRight, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';

/**
 * §20.x — Fork Tree (创作协作分支树)
 *
 * Visualizes the creative collaboration tree:
 *   - Shows original work as root node
 *   - Branching lines to forked/adapted works
 *   - Interactive nodes with work details
 *   - Depth-first tree layout
 *
 * Uses existing /works/fork-tree/:workId endpoint.
 */

interface ForkWork {
  id: string;
  title: string;
  theme?: string;
  authorName: string;
  authorId: string;
  parentWorkId?: string;
  lyrics?: string[];
  likes?: number;
  createdAt: number;
}

interface ForkTreeProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'zh' | 'en';
}

interface TreeNode {
  work: ForkWork;
  children: TreeNode[];
  depth: number;
}

// Color palette for different tree depths
const DEPTH_COLORS = [
  'from-purple-500 to-pink-500',
  'from-cyan-500 to-blue-500',
  'from-green-500 to-emerald-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-red-500',
];

const DEPTH_GLOW = [
  'rgba(168,85,247,0.4)',
  'rgba(6,182,212,0.4)',
  'rgba(34,197,94,0.4)',
  'rgba(245,158,11,0.4)',
  'rgba(244,63,94,0.4)',
];

export const ForkTree: React.FC<ForkTreeProps> = ({ isOpen, onClose, lang }) => {
  const [allWorks, setAllWorks] = useState<ForkWork[]>([]);
  const [rootWorks, setRootWorks] = useState<ForkWork[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ForkWork | null>(null);

  const t = lang === 'zh'
    ? {
        title: '创作协作分支树',
        subtitle: '可视化作品改编关系',
        noWorks: '暂无共享作品',
        selectRoot: '选择一个作品查看分支树',
        original: '原创',
        fork: '改编',
        by: '作者',
        likes: '赞',
        depth: '层级',
        created: '创建于',
        branches: '个分支',
        close: '关闭',
        refresh: '刷新',
        viewTree: '查看分支',
        noForks: '该作品暂无改编分支',
      }
    : {
        title: 'Collaboration Fork Tree',
        subtitle: 'Visualize adaptation relationships',
        noWorks: 'No shared works yet',
        selectRoot: 'Select a work to view its fork tree',
        original: 'Original',
        fork: 'Fork',
        by: 'By',
        likes: 'Likes',
        depth: 'Depth',
        created: 'Created',
        branches: 'branches',
        close: 'Close',
        refresh: 'Refresh',
        viewTree: 'View tree',
        noForks: 'No forks for this work yet',
      };

  // Fetch all shared works
  const fetchWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ works: ForkWork[] }>('/shared-works');
      if (data?.works) {
        setAllWorks(data.works);
        // Root works = those without parentWorkId
        const roots = data.works.filter((w) => !w.parentWorkId);
        setRootWorks(roots);
      }
    } catch (err) {
      console.error('[ForkTree] Fetch works error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchWorks();
  }, [isOpen, fetchWorks]);

  // Fetch fork tree for selected root
  const fetchTree = useCallback(
    async (rootId: string) => {
      setSelectedRootId(rootId);
      setLoading(true);
      try {
        const data = await apiFetch<{ tree: ForkWork[]; rootId: string }>(
          `/works/fork-tree/${rootId}`
        );
        if (data?.tree) {
          // Build tree structure
          const workMap = new Map<string, ForkWork>();
          for (const w of data.tree) workMap.set(w.id, w);

          const buildNode = (workId: string, depth: number): TreeNode | null => {
            const work = workMap.get(workId);
            if (!work) return null;
            const children: TreeNode[] = [];
            for (const w of data.tree) {
              if (w.parentWorkId === workId) {
                const child = buildNode(w.id, depth + 1);
                if (child) children.push(child);
              }
            }
            return { work, children, depth };
          };

          const root = buildNode(rootId, 0);
          // If root not found from KV, construct from allWorks
          if (!root) {
            const rootWork = allWorks.find((w) => w.id === rootId);
            if (rootWork) {
              setTreeData({ work: rootWork, children: [], depth: 0 });
            }
          } else {
            setTreeData(root);
          }
        }
      } catch (err) {
        console.error('[ForkTree] Fetch tree error:', err);
      } finally {
        setLoading(false);
      }
    },
    [allWorks]
  );

  const countNodes = (node: TreeNode): number => {
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Render a tree node recursively
  const renderNode = (node: TreeNode, isLast = false) => {
    const colorClass = DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
    const glowColor = DEPTH_GLOW[node.depth % DEPTH_GLOW.length];
    const isRoot = node.depth === 0;
    const isSelected = selectedNode?.id === node.work.id;

    return (
      <div key={node.work.id} className="relative">
        {/* Connector line */}
        {!isRoot && (
          <div className="absolute left-4 -top-3 w-px h-3 bg-white/10" />
        )}

        {/* Node */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: node.depth * 0.1 }}
          className={clsx(
            'relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border',
            isSelected
              ? 'bg-white/10 border-white/20'
              : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
          )}
          style={{
            marginLeft: `${node.depth * 24}px`,
            boxShadow: isSelected ? `0 0 12px ${glowColor}` : undefined,
          }}
          onClick={() => setSelectedNode(isSelected ? null : node.work)}
        >
          {/* Depth indicator */}
          <div
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br',
              colorClass
            )}
          >
            {isRoot ? (
              <Music className="w-4 h-4 text-white" />
            ) : (
              <GitFork className="w-4 h-4 text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/90 truncate">
                {node.work.title}
              </span>
              <span
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[9px] font-medium',
                  isRoot
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-cyan-500/20 text-cyan-300'
                )}
              >
                {isRoot ? t.original : t.fork}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/40">
              <User className="w-2.5 h-2.5" />
              <span>{node.work.authorName}</span>
              {node.work.theme && (
                <>
                  <span className="text-white/20">|</span>
                  <span>{node.work.theme}</span>
                </>
              )}
              {node.work.likes !== undefined && node.work.likes > 0 && (
                <>
                  <span className="text-white/20">|</span>
                  <span>&#9829; {node.work.likes}</span>
                </>
              )}
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {isSelected && node.work.lyrics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 overflow-hidden"
                >
                  <div className="bg-black/20 rounded-lg p-2 text-[10px] text-white/50 max-h-24 overflow-y-auto space-y-0.5">
                    {node.work.lyrics.slice(0, 6).map((line, i) => (
                      <p key={i} className="leading-relaxed">{line}</p>
                    ))}
                    {node.work.lyrics.length > 6 && (
                      <p className="text-white/30">...({node.work.lyrics.length - 6} more)</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Branch count badge */}
          {node.children.length > 0 && (
            <span className="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {node.children.length} {t.branches}
            </span>
          )}
        </motion.div>

        {/* Children */}
        {node.children.length > 0 && (
          <div className="mt-2 space-y-2 relative">
            {/* Vertical connector */}
            <div
              className="absolute left-4 top-0 w-px bg-gradient-to-b from-white/10 to-transparent"
              style={{
                marginLeft: `${node.depth * 24}px`,
                height: '100%',
              }}
            />
            {node.children.map((child, i) =>
              renderNode(child, i === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--dm-bg-panel,#0D1235)] border border-white/10 rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white/90">{t.title}</h2>
                <p className="text-[10px] text-white/40">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchWorks}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
              >
                <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-64px)] p-4">
            {!selectedRootId ? (
              // Work selection list
              <div className="space-y-2">
                {rootWorks.length === 0 && !loading && (
                  <div className="text-center py-12 text-white/30 text-sm">
                    <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>{t.noWorks}</p>
                  </div>
                )}
                {rootWorks.map((work) => (
                  <motion.button
                    key={work.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => fetchTree(work.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{work.title}</p>
                      <p className="text-[10px] text-white/40">
                        {t.by}: {work.authorName} {work.theme && `· ${work.theme}`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                  </motion.button>
                ))}

                {/* Also show forked works without clear root as potential trees */}
                {allWorks.filter(w => w.parentWorkId).length > 0 && rootWorks.length > 0 && (
                  <p className="text-[10px] text-white/20 text-center pt-2">
                    {lang === 'zh' ? `共 ${allWorks.length} 个作品` : `${allWorks.length} total works`}
                  </p>
                )}
              </div>
            ) : (
              // Tree view
              <div className="space-y-3">
                {/* Back button */}
                <button
                  onClick={() => {
                    setSelectedRootId(null);
                    setTreeData(null);
                    setSelectedNode(null);
                  }}
                  className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors mb-2"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  {lang === 'zh' ? '返回列表' : 'Back to list'}
                </button>

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 text-white/30 animate-spin" />
                  </div>
                )}

                {!loading && treeData && (
                  <div className="space-y-2">
                    {/* Stats bar */}
                    <div className="flex items-center gap-3 text-[10px] text-white/30 mb-3">
                      <span>
                        {countNodes(treeData)} {lang === 'zh' ? '个节点' : 'nodes'}
                      </span>
                      <span className="text-white/10">|</span>
                      <span>
                        {treeData.children.length} {t.branches}
                      </span>
                    </div>

                    {renderNode(treeData)}

                    {treeData.children.length === 0 && (
                      <p className="text-center text-[11px] text-white/30 py-6">
                        {t.noForks}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
