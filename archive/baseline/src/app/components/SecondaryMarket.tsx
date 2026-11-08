/**
 * D-Music P3 §3 — Secondary Market (二级市场)
 *
 * Features:
 *   - Browse active resale listings
 *   - Buy listed albums (ownership transfer + SP transaction)
 *   - List owned albums for resale
 *   - View market stats & recent sales history
 *   - Cancel own listings
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, TrendingUp, ShoppingCart, Tag, Star, ArrowRight, Clock,
  BarChart3, ArrowLeftRight, Check, AlertCircle, Disc3, Hash,
  ArrowLeft, Sparkles, DollarSign, Repeat, Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useI18n } from '../hooks/useI18n';
import { marketApi, albumApi, type MarketListing, type MarketSale, type MarketStats, type Album, type AlbumOwnership } from '../lib/api';

interface SecondaryMarketProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}

type MarketView = 'browse' | 'sell' | 'history' | 'detail';

const GENRE_GRADIENTS: Record<string, string> = {
  'Electronic / Ambient': 'from-indigo-500 to-purple-600',
  'Synthwave / Cyberpunk': 'from-pink-500 to-red-600',
  'Classical / Ambient': 'from-emerald-500 to-teal-600',
  'Other': 'from-gray-500 to-slate-600',
};

function timeAgo(ts: number, lang: string): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return lang === 'zh' ? '刚刚' : 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}${lang === 'zh' ? '分钟前' : 'm ago'}`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}${lang === 'zh' ? '小时前' : 'h ago'}`;
  return `${Math.floor(diff / 86400000)}${lang === 'zh' ? '天前' : 'd ago'}`;
}

export const SecondaryMarket: React.FC<SecondaryMarketProps> = ({
  isOpen, onClose, user, starPower, onStarPowerUpdate,
}) => {
  const { lang } = useI18n();
  const isZh = lang !== 'en';

  const [view, setView] = useState<MarketView>('browse');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [history, setHistory] = useState<MarketSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyResult, setBuyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sell tab
  const [collection, setCollection] = useState<Array<Album & { ownership: AlbumOwnership }>>([]);
  const [sellAlbumId, setSellAlbumId] = useState<string | null>(null);
  const [sellPrice, setSellPrice] = useState('');
  const [listing, setListing] = useState(false);
  const [listResult, setListResult] = useState<{ success: boolean; message: string } | null>(null);
  const [myListings, setMyListings] = useState<MarketListing[]>([]);

  // Detail
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) { fetchedRef.current = false; return; }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadData();
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listingsRes, statsRes] = await Promise.all([
        marketApi.getListings(),
        marketApi.getStats(),
      ]);
      if (listingsRes?.listings) setListings(listingsRes.listings);
      if (statsRes) setStats(statsRes);
    } catch (err) { console.error('[Market] Load error:', err); }
    finally { setLoading(false); }
  };

  const loadSellData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [collRes, myListRes] = await Promise.all([
        albumApi.getCollection(user.id),
        marketApi.getSellerListings(user.id),
      ]);
      if (collRes?.collection) setCollection(collRes.collection);
      if (myListRes?.listings) setMyListings(myListRes.listings.filter(l => l.status === 'active'));
    } catch (err) { console.error('[Market] Sell data error:', err); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await marketApi.getHistory();
      if (res?.sales) setHistory(res.sales);
    } catch (err) { console.error('[Market] History error:', err); }
    finally { setLoading(false); }
  };

  const handleBuy = async (listingItem: MarketListing) => {
    if (!user?.id || buying) return;
    setBuying(listingItem.id);
    setBuyResult(null);
    try {
      const userName = user.email?.split('@')[0] || 'User';
      const res = await marketApi.buyListing(listingItem.id, user.id, userName);
      if (res?.success) {
        onStarPowerUpdate(res.buyerStarPower);
        setBuyResult({ success: true, message: isZh ? `成功购入 "${listingItem.albumTitle}" #${listingItem.edition}！` : `Purchased "${listingItem.albumTitle}" #${listingItem.edition}!` });
        setListings(prev => prev.filter(l => l.id !== listingItem.id));
      } else {
        setBuyResult({ success: false, message: isZh ? '购买失败' : 'Purchase failed' });
      }
    } catch (err: any) {
      console.error('[Market] Buy error:', err);
      setBuyResult({ success: false, message: err?.message || (isZh ? '购买失败' : 'Purchase failed') });
    }
    finally { setBuying(null); }
  };

  const handleList = async () => {
    if (!user?.id || !sellAlbumId || !sellPrice || listing) return;
    const price = parseInt(sellPrice);
    if (isNaN(price) || price < 1) return;
    setListing(true);
    setListResult(null);
    try {
      const userName = user.email?.split('@')[0] || 'User';
      const res = await marketApi.createListing({ userId: user.id, userName, albumId: sellAlbumId, price });
      if (res?.success) {
        setListResult({ success: true, message: isZh ? '上架成功！' : 'Listed successfully!' });
        setSellAlbumId(null);
        setSellPrice('');
        loadSellData();
        loadData();
      } else {
        setListResult({ success: false, message: isZh ? '上架失败' : 'Listing failed' });
      }
    } catch (err: any) {
      console.error('[Market] List error:', err);
      setListResult({ success: false, message: err?.message || (isZh ? '上架失败' : 'Listing failed') });
    }
    finally { setListing(false); }
  };

  const handleCancel = async (listingId: string) => {
    try {
      const res = await marketApi.cancelListing(listingId);
      if (res?.success) {
        setMyListings(prev => prev.filter(l => l.id !== listingId));
        setListings(prev => prev.filter(l => l.id !== listingId));
      }
    } catch (err) { console.error('[Market] Cancel error:', err); }
  };

  if (!isOpen) return null;

  const gradient = (genre: string) => GENRE_GRADIENTS[genre] || GENRE_GRADIENTS['Other'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-lg bg-[#0D1235]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            {view !== 'browse' && view !== 'detail' ? (
              <button onClick={() => setView('browse')} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5">
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : view === 'detail' ? (
              <button onClick={() => { setSelectedListing(null); setView('browse'); }} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5">
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : null}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/15 flex items-center justify-center">
              <ArrowLeftRight className="w-4.5 h-4.5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm leading-tight">
                {isZh ? '二级市场' : 'Secondary Market'}
              </h3>
              <p className="text-white/30 text-xs">
                {isZh ? '数字专辑转售交易' : 'Digital album resale trading'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex p-2 mx-4 mt-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          {[
            { id: 'browse' as MarketView, icon: ShoppingCart, zh: '浏览', en: 'Browse' },
            { id: 'sell' as MarketView, icon: Tag, zh: '出售', en: 'Sell' },
            { id: 'history' as MarketView, icon: Clock, zh: '历史', en: 'History' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setView(t.id);
                if (t.id === 'sell') loadSellData();
                if (t.id === 'history') loadHistory();
              }}
              className={clsx(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                view === t.id || (view === 'detail' && t.id === 'browse')
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/20'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {isZh ? t.zh : t.en}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        {stats && view === 'browse' && (
          <div className="flex gap-2 mx-4 mt-3">
            {[
              { label: isZh ? '在售' : 'Active', value: stats.activeListings, icon: Tag, color: 'text-orange-400' },
              { label: isZh ? '成交' : 'Sales', value: stats.totalSales, icon: Check, color: 'text-emerald-400' },
              { label: isZh ? '总额' : 'Volume', value: `${stats.totalVolume} SP`, icon: Star, color: 'text-amber-400' },
            ].map((s, i) => (
              <div key={i} className="flex-1 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="flex items-center gap-1">
                  <s.icon className={clsx('w-3 h-3', s.color)} />
                  <span className="text-[10px] text-white/30">{s.label}</span>
                </div>
                <p className="text-sm font-bold text-white/80 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
          {loading && listings.length === 0 && collection.length === 0 && history.length === 0 ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : view === 'browse' || view === 'detail' ? (
            /* ======== BROWSE / DETAIL ======== */
            view === 'detail' && selectedListing ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Listing detail card */}
                <div className={clsx('p-4 rounded-2xl bg-gradient-to-br', gradient(selectedListing.albumGenre), 'relative overflow-hidden')}>
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Disc3 className="w-5 h-5 text-white/60" />
                      <span className="text-xs text-white/50">{selectedListing.albumGenre}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{selectedListing.albumTitle}</h3>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{selectedListing.edition}{selectedListing.maxSupply ? ` / ${selectedListing.maxSupply}` : ''}</span>
                      {selectedListing.limitedEdition && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                          {isZh ? '限定' : 'Limited'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & Seller */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{isZh ? '售价' : 'Asking Price'}</span>
                    <span className="text-lg font-bold text-orange-400 flex items-center gap-1">
                      <Star className="w-4 h-4" /> {selectedListing.price} SP
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{isZh ? '原始价格' : 'Original Price'}</span>
                    <span className="text-xs text-white/50">{selectedListing.originalPrice} SP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{isZh ? '卖家' : 'Seller'}</span>
                    <span className="text-xs text-white/60">{selectedListing.sellerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{isZh ? '上架时间' : 'Listed'}</span>
                    <span className="text-xs text-white/40">{timeAgo(selectedListing.createdAt, lang)}</span>
                  </div>
                  {selectedListing.price > selectedListing.originalPrice && (
                    <div className="flex items-center gap-1 text-[10px] text-red-400/60">
                      <TrendingUp className="w-3 h-3" />
                      {isZh ? '溢价' : 'Premium'}: +{Math.round((selectedListing.price / selectedListing.originalPrice - 1) * 100)}%
                    </div>
                  )}
                  {selectedListing.price < selectedListing.originalPrice && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400/60">
                      <TrendingUp className="w-3 h-3 rotate-180" />
                      {isZh ? '折扣' : 'Discount'}: -{Math.round((1 - selectedListing.price / selectedListing.originalPrice) * 100)}%
                    </div>
                  )}
                </div>

                {/* Fee breakdown */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-white/25 mb-2">{isZh ? '交易分成' : 'Fee Structure'}</p>
                  <div className="space-y-1">
                    {[
                      { label: isZh ? '卖家所得 (90%)' : 'Seller (90%)', value: Math.floor(selectedListing.price * 0.9), color: 'text-emerald-400' },
                      { label: isZh ? '创作者版税 (5%)' : 'Creator Royalty (5%)', value: Math.floor(selectedListing.price * 0.05), color: 'text-purple-400' },
                      { label: isZh ? '平台费用 (5%)' : 'Platform Fee (5%)', value: selectedListing.price - Math.floor(selectedListing.price * 0.9) - Math.floor(selectedListing.price * 0.05), color: 'text-white/30' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{f.label}</span>
                        <span className={f.color}>{f.value} SP</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buy button */}
                {user && selectedListing.sellerId !== user.id && (
                  <button
                    onClick={() => handleBuy(selectedListing)}
                    disabled={!!buying || starPower < selectedListing.price}
                    className={clsx(
                      'w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all',
                      starPower >= selectedListing.price
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg hover:shadow-orange-500/20'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    )}
                  >
                    {buying === selectedListing.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : starPower < selectedListing.price ? (
                      <>{isZh ? `星力不足 (需要 ${selectedListing.price} SP)` : `Insufficient SP (need ${selectedListing.price})`}</>
                    ) : (
                      <><ShoppingCart className="w-4 h-4" /> {isZh ? `购买 (${selectedListing.price} SP)` : `Buy (${selectedListing.price} SP)`}</>
                    )}
                  </button>
                )}

                {buyResult && (
                  <div className={clsx('p-3 rounded-xl text-xs text-center', buyResult.success ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20')}>
                    {buyResult.success ? <Check className="w-4 h-4 mx-auto mb-1" /> : <AlertCircle className="w-4 h-4 mx-auto mb-1" />}
                    {buyResult.message}
                  </div>
                )}
              </motion.div>
            ) : listings.length === 0 ? (
              <div className="text-center py-16">
                <ArrowLeftRight className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">{isZh ? '暂无在售专辑' : 'No listings yet'}</p>
                <p className="text-white/15 text-xs mt-1">{isZh ? '等待第一位卖家上架' : 'Waiting for the first listing'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {listings.map(l => (
                  <motion.button
                    key={l.id}
                    onClick={() => { setSelectedListing(l); setView('detail'); setBuyResult(null); }}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', gradient(l.albumGenre))}>
                        <Disc3 className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white/80 truncate">{l.albumTitle}</span>
                          {l.limitedEdition && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[9px] flex-shrink-0">
                              #{l.edition}{l.maxSupply ? `/${l.maxSupply}` : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-white/30">{l.sellerName}</span>
                          <span className="text-[10px] text-white/15">{timeAgo(l.createdAt, lang)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-orange-400 flex items-center gap-1">
                          <Star className="w-3 h-3" /> {l.price}
                        </div>
                        {l.price !== l.originalPrice && (
                          <span className={clsx('text-[10px]', l.price > l.originalPrice ? 'text-red-400/50' : 'text-emerald-400/50')}>
                            {l.price > l.originalPrice ? '+' : ''}{Math.round((l.price / l.originalPrice - 1) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )
          ) : view === 'sell' ? (
            /* ======== SELL ======== */
            <div className="space-y-4">
              {/* My active listings */}
              {myListings.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-white/40 mb-2">{isZh ? '我的在售' : 'My Active Listings'}</h4>
                  <div className="space-y-2">
                    {myListings.map(l => (
                      <div key={l.id} className="p-3 rounded-xl bg-orange-500/[0.05] border border-orange-500/10 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-white/70 truncate block">{l.albumTitle} #{l.edition}</span>
                          <span className="text-[10px] text-orange-300">{l.price} SP</span>
                        </div>
                        <button
                          onClick={() => handleCancel(l.id)}
                          className="px-2 py-1 rounded-lg text-[10px] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                        >
                          {isZh ? '下架' : 'Cancel'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Select album to sell */}
              <div>
                <h4 className="text-xs font-medium text-white/40 mb-2">{isZh ? '选择要出售的专辑' : 'Select Album to Sell'}</h4>
                {collection.length === 0 ? (
                  <div className="text-center py-8">
                    <Disc3 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/25">{isZh ? '你还没有可出售的专辑' : 'No albums in your collection'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collection.map(album => {
                      const isListed = myListings.some(l => l.albumId === album.id);
                      return (
                        <button
                          key={album.id}
                          onClick={() => { if (!isListed) { setSellAlbumId(album.id); setSellPrice(String(Math.round(album.ownership.price * 1.2))); } }}
                          disabled={isListed}
                          className={clsx(
                            'w-full p-3 rounded-xl border text-left transition-colors',
                            sellAlbumId === album.id
                              ? 'bg-orange-500/10 border-orange-500/20'
                              : isListed
                                ? 'bg-white/[0.01] border-white/[0.04] opacity-40 cursor-not-allowed'
                                : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', gradient(album.genre))}>
                              <Disc3 className="w-4 h-4 text-white/60" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-white/70 truncate block">{album.title}</span>
                              <span className="text-[10px] text-white/30">
                                #{album.ownership.edition} · {isZh ? '购入价' : 'Paid'}: {album.ownership.price} SP
                              </span>
                            </div>
                            {isListed && <span className="text-[9px] text-orange-300">{isZh ? '已上架' : 'Listed'}</span>}
                            {sellAlbumId === album.id && <Check className="w-4 h-4 text-orange-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Price input + List button */}
              {sellAlbumId && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div>
                    <label className="text-[10px] text-white/30 mb-1 block">{isZh ? '定价 (星力值)' : 'Price (Star Power)'}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={sellPrice}
                        onChange={e => setSellPrice(e.target.value)}
                        min={1}
                        className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-orange-500/40 pr-10"
                        placeholder="100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">SP</span>
                    </div>
                  </div>
                  <button
                    onClick={handleList}
                    disabled={listing || !sellPrice || parseInt(sellPrice) < 1}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-30 transition-all"
                  >
                    {listing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Tag className="w-4 h-4" />}
                    {isZh ? '上架出售' : 'List for Sale'}
                  </button>
                  {listResult && (
                    <div className={clsx('p-2 rounded-xl text-xs text-center', listResult.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300')}>
                      {listResult.message}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          ) : (
            /* ======== HISTORY ======== */
            history.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">{isZh ? '暂无交易记录' : 'No transaction history'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((sale, i) => (
                  <motion.div
                    key={sale.listingId + i}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-white/70">{sale.albumTitle}</span>
                      <span className="text-xs font-bold text-orange-400">{sale.price} SP</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/30">
                      <span>{sale.sellerName}</span>
                      <ArrowRight className="w-3 h-3 text-white/15" />
                      <span>{sale.buyerName}</span>
                      <span className="ml-auto text-white/15">{timeAgo(sale.soldAt, lang)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] text-white/20">
                      <span>{isZh ? '卖家' : 'Seller'}: {sale.sellerEarnings} SP</span>
                      <span>{isZh ? '版税' : 'Royalty'}: {sale.creatorRoyalty} SP</span>
                      <span>#{sale.edition}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06] flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/15">
            <Sparkles className="w-3 h-3" />
            <span className="text-[10px]">{isZh ? '安全交易 · 5%创作者版税' : 'Secure Trading · 5% Creator Royalty'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-400/60">
            <Star className="w-3 h-3" />
            <span>{starPower} SP</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
