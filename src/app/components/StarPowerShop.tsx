import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ShoppingBag, Check, Package, Sparkles, Palette, Music, Zap, Megaphone, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';

interface StarPowerShopProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}

interface ShopItem {
  id: string;
  category: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  cost: number;
  icon: string;
  rarity: string;
}

interface InventoryItem {
  itemId: string;
  purchasedAt: number;
  expiresAt: number | null;
}

const CATEGORY_TABS = [
  { id: 'all', labelZh: '全部', labelEn: 'All', icon: ShoppingBag },
  { id: 'theme', labelZh: '主题', labelEn: 'Themes', icon: Palette },
  { id: 'sound', labelZh: '音色', labelEn: 'Sounds', icon: Music },
  { id: 'ai', labelZh: 'AI', labelEn: 'AI', icon: Sparkles },
  { id: 'badge', labelZh: '徽章', labelEn: 'Badges', icon: Star },
  { id: 'boost', labelZh: '加速', labelEn: 'Boost', icon: Zap },
];

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; label: string; labelEn: string }> = {
  common: { bg: 'from-gray-500/10 to-gray-600/10', border: 'border-gray-500/20', text: 'text-gray-400', label: '普通', labelEn: 'Common' },
  rare: { bg: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/20', text: 'text-blue-400', label: '稀有', labelEn: 'Rare' },
  epic: { bg: 'from-purple-500/10 to-pink-500/10', border: 'border-purple-500/20', text: 'text-purple-400', label: '史诗', labelEn: 'Epic' },
  legendary: { bg: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: '传说', labelEn: 'Legendary' },
};

export const StarPowerShop: React.FC<StarPowerShopProps> = ({
  isOpen, onClose, user, starPower, onStarPowerUpdate,
}) => {
  const { lang } = useI18n();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [shopData, invData] = await Promise.all([
        apiFetch<{ items: ShopItem[] }>('/starpower/shop/items'),
        apiFetch<{ inventory: InventoryItem[] }>(`/starpower/shop/inventory/${user.id}`),
      ]);
      if (shopData?.items) setItems(shopData.items);
      if (invData?.inventory) setInventory(invData.inventory);
    } catch (err) { console.error('Shop fetch error:', err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) fetchData();
  }, [isOpen, user, fetchData]);

  const isOwned = (itemId: string) => inventory.some(i => i.itemId === itemId);

  const handlePurchase = async (item: ShopItem) => {
    if (!user || purchasing) return;
    setPurchasing(item.id);
    setPurchaseResult(null);
    try {
      const result = await apiFetch<any>('/starpower/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, itemId: item.id }),
      });
      if (result?.success) {
        onStarPowerUpdate(result.starPower);
        setInventory(prev => [...prev, { itemId: item.id, purchasedAt: Date.now(), expiresAt: null }]);
        setPurchaseResult({ success: true, message: lang === 'zh' ? '购买成功!' : 'Purchase successful!' });
      } else {
        setPurchaseResult({ success: false, message: result?.error || (lang === 'zh' ? '购买失败' : 'Purchase failed') });
      }
    } catch (err) {
      setPurchaseResult({ success: false, message: lang === 'zh' ? '网络错误' : 'Network error' });
    }
    finally {
      setPurchasing(null);
      setConfirmItem(null);
      setTimeout(() => setPurchaseResult(null), 3000);
    }
  };

  const filteredItems = category === 'all' ? items : items.filter(i => i.category === category);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-[#0D1235]/98 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {lang === 'zh' ? '星力商城' : 'Star Power Shop'}
                  </h2>
                  <p className="text-[10px] text-white/30">
                    {lang === 'zh' ? '用星力值兑换虚拟好物' : 'Exchange SP for virtual items'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>

            {/* Balance */}
            <div className="px-5 py-3 bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.06] border-b border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-200 font-bold text-lg tabular-nums">{starPower}</span>
                  <span className="text-xs text-white/30">{lang === 'zh' ? '可用星力值' : 'SP available'}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-white/20">
                  <Package className="w-3 h-3" />
                  {inventory.length} {lang === 'zh' ? '件已拥有' : 'owned'}
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="px-4 py-2.5 border-b border-white/[0.04] overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5">
                {CATEGORY_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = category === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCategory(tab.id)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                        isActive
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-white/[0.03] text-white/30 border border-transparent hover:bg-white/[0.06] hover:text-white/50'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {lang === 'zh' ? tab.labelZh : tab.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Purchase Result Toast */}
            <AnimatePresence>
              {purchaseResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className={clsx(
                    'mx-4 mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2',
                    purchaseResult.success
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/15 text-red-400 border border-red-500/20'
                  )}
                >
                  {purchaseResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {purchaseResult.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">
                    {lang === 'zh' ? '此分类暂无商品' : 'No items in this category'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredItems.map((item) => {
                    const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                    const owned = isOwned(item.id);
                    const affordable = starPower >= item.cost;
                    return (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => !owned && setConfirmItem(item)}
                        disabled={owned}
                        className={clsx(
                          'relative flex flex-col p-3 rounded-xl border text-left transition-all',
                          owned
                            ? 'bg-white/[0.02] border-white/[0.04] opacity-60'
                            : `bg-gradient-to-br ${rarity.bg} ${rarity.border} hover:brightness-110`
                        )}
                      >
                        {/* Rarity label */}
                        <span className={clsx('absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider', rarity.text)}>
                          {lang === 'zh' ? rarity.label : rarity.labelEn}
                        </span>

                        {/* Icon */}
                        <span className="text-2xl mb-2">{item.icon}</span>

                        {/* Name */}
                        <p className="text-xs text-white font-semibold leading-tight">
                          {lang === 'zh' ? item.nameZh : item.nameEn}
                        </p>

                        {/* Description */}
                        <p className="text-[10px] text-white/30 mt-0.5 leading-tight line-clamp-2">
                          {lang === 'zh' ? item.descZh : item.descEn}
                        </p>

                        {/* Price / Owned */}
                        <div className="mt-auto pt-2 flex items-center justify-between">
                          {owned ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400/60">
                              <Check className="w-3 h-3" />
                              {lang === 'zh' ? '已拥有' : 'Owned'}
                            </span>
                          ) : (
                            <span className={clsx(
                              'flex items-center gap-1 text-xs font-bold',
                              affordable ? 'text-yellow-400' : 'text-red-400/60'
                            )}>
                              <Star className="w-3 h-3 fill-current" />
                              {item.cost}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Purchase Modal */}
            <AnimatePresence>
              {confirmItem && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
                  onClick={() => setConfirmItem(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-[280px] bg-[#0F1540] border border-white/10 rounded-2xl p-5 text-center"
                  >
                    <span className="text-4xl block mb-3">{confirmItem.icon}</span>
                    <p className="text-white font-bold text-sm">
                      {lang === 'zh' ? confirmItem.nameZh : confirmItem.nameEn}
                    </p>
                    <p className="text-white/30 text-[11px] mt-1">
                      {lang === 'zh' ? confirmItem.descZh : confirmItem.descEn}
                    </p>

                    <div className="flex items-center justify-center gap-1 my-4 text-yellow-400 font-bold">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      <span className="text-lg">{confirmItem.cost}</span>
                      <span className="text-xs text-yellow-400/50 ml-1">SP</span>
                    </div>

                    {starPower < confirmItem.cost ? (
                      <p className="text-xs text-red-400/70 mb-3">
                        {lang === 'zh' ? `星力值不足（需 ${confirmItem.cost}，当前 ${starPower}）` : `Insufficient SP (need ${confirmItem.cost}, have ${starPower})`}
                      </p>
                    ) : null}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmItem(null)}
                        className="flex-1 py-2 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors"
                      >
                        {lang === 'zh' ? '取消' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => handlePurchase(confirmItem)}
                        disabled={starPower < confirmItem.cost || !!purchasing}
                        className={clsx(
                          'flex-1 py-2 rounded-lg text-xs font-medium transition-all',
                          starPower >= confirmItem.cost
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-110'
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                        )}
                      >
                        {purchasing ? '...' : (lang === 'zh' ? '确认购买' : 'Confirm')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
