/**
 * D-Music P3 §1 — Digital Album Distribution Store
 *
 * 数字专辑商城 + 我的收藏
 * Features:
 *   - Browse marketplace albums (grid view)
 *   - Album detail with track list + exclusive content
 *   - Purchase with Star Power (supply checks, edition numbering)
 *   - "My Collection" shelf for owned albums
 *   - Like albums
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Disc3, ShoppingBag, Heart, Star, Music, Lock, Package,
  ChevronRight, Clock, Tag, Sparkles, Trophy, Play, Check, AlertCircle, ArrowLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';
import type { Album, AlbumOwnership } from '../lib/api';
import { ImageWithFallback } from './figma/ImageWithFallback';

// Album cover fallback images
const ALBUM_COVERS = [
  'https://images.unsplash.com/photo-1697843248524-056e8fc76ee3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW55bCUyMHJlY29yZCUyMGFsYnVtJTIwY292ZXIlMjBkYXJrJTIwbmVvbnxlbnwxfHx8fDE3NzIwMDQzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1669434113533-e39391413a18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGNvbGxlY3Rpb24lMjB2aW55bCUyMGRhcmslMjBhbWJpZW50fGVufDF8fHx8MTc3MjAwNDM1MXww&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1763630054706-d6d8e52b71ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBjb25jZXJ0JTIwc3RhZ2UlMjBsaWdodHN8ZW58MXx8fHwxNzcyMDA0MzUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
];

interface AlbumStoreProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}

type ViewMode = 'marketplace' | 'collection' | 'detail';

const GENRE_COLORS: Record<string, string> = {
  'Electronic / Ambient': 'from-indigo-500/20 to-purple-500/20',
  'Synthwave / Cyberpunk': 'from-pink-500/20 to-red-500/20',
  'Classical / Ambient': 'from-emerald-500/20 to-teal-500/20',
  'Other': 'from-gray-500/20 to-slate-500/20',
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(ts: number, lang: string): string {
  const d = new Date(ts);
  return lang === 'zh'
    ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const AlbumStore: React.FC<AlbumStoreProps> = ({
  isOpen, onClose, user, starPower, onStarPowerUpdate,
}) => {
  const { lang } = useI18n();
  const [view, setView] = useState<ViewMode>('marketplace');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [collection, setCollection] = useState<Array<Album & { ownership: AlbumOwnership }>>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; message: string; edition?: number } | null>(null);
  const fetchedRef = useRef(false);

  // Load albums on open
  useEffect(() => {
    if (!isOpen) { fetchedRef.current = false; return; }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const [listRes, collRes] = await Promise.all([
          apiFetch<{ albums: Album[]; total: number }>('/albums'),
          user ? apiFetch<{ collection: Array<Album & { ownership: AlbumOwnership }>; total: number }>(
            `/albums/collection/${user.id}`
          ) : Promise.resolve(null),
        ]);

        if (listRes?.albums) setAlbums(listRes.albums);
        if (collRes?.collection) {
          setCollection(collRes.collection);
          setOwnedIds(new Set(collRes.collection.map(a => a.id)));
        }
      } catch (err) {
        console.error('[AlbumStore] Error loading albums:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, user]);

  // Purchase handler (ref-based to avoid hook count change)
  const handlePurchaseRef = useRef<(album: Album) => void>(() => {});
  handlePurchaseRef.current = async (album: Album) => {
    if (!user) {
      setPurchaseResult({ success: false, message: lang === 'zh' ? '请先登录' : 'Please log in first' });
      return;
    }
    if (ownedIds.has(album.id)) {
      setPurchaseResult({ success: false, message: lang === 'zh' ? '您已拥有此专辑' : 'You already own this album' });
      return;
    }

    setPurchasing(true);
    try {
      const res = await apiFetch<any>(`/albums/${album.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (res?.success) {
        setPurchaseResult({
          success: true,
          message: lang === 'zh'
            ? `购买成功！限量版 #${res.edition}${res.maxSupply ? ` / ${res.maxSupply}` : ''}`
            : `Purchase successful! Edition #${res.edition}${res.maxSupply ? ` of ${res.maxSupply}` : ''}`,
          edition: res.edition,
        });
        if (res.starPower !== undefined) onStarPowerUpdate(res.starPower);
        setOwnedIds(prev => new Set([...prev, album.id]));

        // Refresh data
        const collRes = await apiFetch<{ collection: any[] }>(`/albums/collection/${user.id}`);
        if (collRes?.collection) setCollection(collRes.collection);
        const listRes = await apiFetch<{ albums: Album[] }>('/albums');
        if (listRes?.albums) setAlbums(listRes.albums);
      } else {
        let msg = res?.error || (lang === 'zh' ? '购买失败' : 'Purchase failed');
        if (res?.insufficientFunds) {
          msg = lang === 'zh'
            ? `星力不足（需要 ${res.required}，当前 ${res.current}）`
            : `Insufficient Star Power (need ${res.required}, have ${res.current})`;
        } else if (res?.soldOut) {
          msg = lang === 'zh' ? '已售罄' : 'Sold out';
        } else if (res?.alreadyOwned) {
          msg = lang === 'zh' ? '您已拥有此专辑' : 'You already own this album';
        }
        setPurchaseResult({ success: false, message: msg });
      }
    } catch (err) {
      console.error('[AlbumStore] Purchase error:', err);
      setPurchaseResult({ success: false, message: lang === 'zh' ? '网络错误' : 'Network error' });
    } finally {
      setPurchasing(false);
    }
  };

  // Like handler
  const handleLikeRef = useRef<(albumId: string) => void>(() => {});
  handleLikeRef.current = async (albumId: string) => {
    try {
      const res = await apiFetch<{ likes: number }>(`/albums/${albumId}/like`, { method: 'POST' });
      if (res?.likes !== undefined) {
        setAlbums(prev => prev.map(a => a.id === albumId ? { ...a, likes: res.likes } : a));
        if (selectedAlbum?.id === albumId) {
          setSelectedAlbum(prev => prev ? { ...prev, likes: res.likes } : prev);
        }
      }
    } catch (err) {
      console.error('[AlbumStore] Like error:', err);
    }
  };

  if (!isOpen) return null;

  const getCoverUrl = (album: Album, idx: number) =>
    album.coverUrl || ALBUM_COVERS[idx % ALBUM_COVERS.length];

  // ============================================
  // Album Detail View
  // ============================================
  const renderDetail = () => {
    if (!selectedAlbum) return null;
    const album = selectedAlbum;
    const owned = ownedIds.has(album.id);
    const coverIdx = albums.findIndex(a => a.id === album.id);
    const totalDuration = album.tracks.reduce((sum, t) => sum + t.duration, 0);
    const genreBg = GENRE_COLORS[album.genre] || GENRE_COLORS['Other'];

    return (
      <motion.div
        key="detail"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="flex flex-col h-full"
      >
        {/* Back button */}
        <button
          onClick={() => { setSelectedAlbum(null); setPurchaseResult(null); }}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 self-start transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'zh' ? '返回' : 'Back'}
        </button>

        {/* Cover + Info */}
        <div className="flex flex-col sm:flex-row gap-5 mb-5">
          <div className="relative w-full sm:w-48 h-48 sm:h-48 rounded-xl overflow-hidden flex-shrink-0 shadow-2xl">
            <ImageWithFallback
              src={getCoverUrl(album, coverIdx)}
              alt={album.title}
              className="w-full h-full object-cover"
            />
            {album.limitedEdition && (
              <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {lang === 'zh' ? '限量版' : 'Limited'}
              </div>
            )}
            {owned && (
              <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                {lang === 'zh' ? '已拥有' : 'Owned'}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white mb-1">{album.title}</h3>
            <p className="text-white/50 text-sm mb-2">{album.creatorName}</p>
            <p className="text-white/40 text-xs mb-3 line-clamp-2">{album.description}</p>

            <div className="flex flex-wrap gap-2 text-xs text-white/50 mb-3">
              <span className="flex items-center gap-1"><Music className="w-3 h-3" />{album.tracks.length} {lang === 'zh' ? '首' : 'tracks'}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(totalDuration)}</span>
              <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{album.genre}</span>
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{album.likes}</span>
            </div>

            {album.limitedEdition && album.maxSupply && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-amber-400">{lang === 'zh' ? '发行量' : 'Supply'}</span>
                  <span className="text-white/70">{album.circulatingSupply} / {album.maxSupply}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.min((album.circulatingSupply / album.maxSupply) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Price + Purchase */}
            <div className="flex items-center gap-3">
              {!owned ? (
                <button
                  onClick={() => handlePurchaseRef.current(album)}
                  disabled={purchasing}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                    purchasing
                      ? 'bg-white/10 text-white/40 cursor-wait'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400 shadow-lg shadow-purple-500/20'
                  )}
                >
                  {purchasing ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}><Disc3 className="w-4 h-4" /></motion.div>
                  ) : (
                    <Star className="w-4 h-4" />
                  )}
                  {purchasing
                    ? (lang === 'zh' ? '购买中...' : 'Purchasing...')
                    : `${album.price} SP`
                  }
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
                  <Check className="w-4 h-4" />
                  {lang === 'zh' ? '已收藏' : 'In Collection'}
                </div>
              )}

              <button
                onClick={() => handleLikeRef.current(album.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-pink-400 text-sm transition-all"
              >
                <Heart className="w-4 h-4" /> {album.likes}
              </button>
            </div>

            {/* Purchase result */}
            <AnimatePresence>
              {purchaseResult && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={clsx(
                    'mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2',
                    purchaseResult.success
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  )}
                >
                  {purchaseResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {purchaseResult.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Track List */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white/70 mb-2">
            {lang === 'zh' ? '曲目列表' : 'Track List'}
          </h4>
          <div className="space-y-1">
            {album.tracks.map((track) => (
              <div
                key={track.trackNumber}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <span className="text-white/30 text-xs w-5 text-right font-mono">{track.trackNumber}</span>
                <Play className="w-3.5 h-3.5 text-white/20" />
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm truncate">{track.title}</p>
                  <p className="text-white/30 text-xs truncate">{track.artist}</p>
                </div>
                <span className="text-white/30 text-xs font-mono">{formatDuration(track.duration)}</span>
                {!owned && <Lock className="w-3 h-3 text-white/15" />}
              </div>
            ))}
          </div>
        </div>

        {/* Exclusive Content */}
        {album.exclusiveContent.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {lang === 'zh' ? '专属内容' : 'Exclusive Content'}
            </h4>
            <div className="space-y-1.5">
              {album.exclusiveContent.map((ec, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    {ec.type === 'bonus-track' ? <Music className="w-3.5 h-3.5 text-amber-400" /> :
                     ec.type === 'pdf' ? <Package className="w-3.5 h-3.5 text-amber-400" /> :
                     ec.type === 'stem' ? <Disc3 className="w-3.5 h-3.5 text-amber-400" /> :
                     <Play className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span className="text-white/60 text-sm flex-1">
                    {lang === 'zh' ? ec.label : ec.labelEn}
                  </span>
                  {!owned && <Lock className="w-3.5 h-3.5 text-white/20" />}
                  {owned && <Check className="w-3.5 h-3.5 text-green-400" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {album.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-white/30 text-[10px]">
              #{tag}
            </span>
          ))}
        </div>
      </motion.div>
    );
  };

  // ============================================
  // Marketplace Grid
  // ============================================
  const renderMarketplace = () => (
    <motion.div
      key="marketplace"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity }}>
            <Disc3 className="w-8 h-8 text-purple-400" />
          </motion.div>
          <span className="text-white/40 text-sm">{lang === 'zh' ? '加载中...' : 'Loading...'}</span>
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/30 gap-2">
          <ShoppingBag className="w-10 h-10" />
          <span className="text-sm">{lang === 'zh' ? '暂无专辑' : 'No albums yet'}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {albums.map((album, idx) => {
            const owned = ownedIds.has(album.id);
            const genreBg = GENRE_COLORS[album.genre] || GENRE_COLORS['Other'];
            return (
              <motion.button
                key={album.id}
                onClick={() => { setSelectedAlbum(album); setPurchaseResult(null); setView('detail' as any); }}
                className="group relative text-left rounded-xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Cover */}
                <div className="relative w-full aspect-[16/9] overflow-hidden">
                  <ImageWithFallback
                    src={getCoverUrl(album, idx)}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className={clsx('absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent')} />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {album.limitedEdition && (
                      <span className="bg-amber-500/90 backdrop-blur text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        {lang === 'zh' ? '限量' : 'Ltd'}
                      </span>
                    )}
                    {owned && (
                      <span className="bg-green-500/90 backdrop-blur text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Price tag */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" />
                    {album.price} SP
                  </div>

                  {/* Bottom info overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-3">
                    <h3 className="text-white font-bold text-base truncate">{album.title}</h3>
                    <p className="text-white/60 text-xs truncate">{album.creatorName} · {album.genre}</p>
                  </div>
                </div>

                {/* Meta row */}
                <div className="px-3 py-2 flex items-center justify-between text-xs text-white/40">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Music className="w-3 h-3" />{album.tracks.length}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{album.likes}</span>
                    {album.limitedEdition && album.maxSupply && (
                      <span className="flex items-center gap-1 text-amber-400/60">
                        <Package className="w-3 h-3" />{album.circulatingSupply}/{album.maxSupply}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  // ============================================
  // Collection Shelf
  // ============================================
  const renderCollection = () => (
    <motion.div
      key="collection"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {!user ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/30 gap-2">
          <Lock className="w-10 h-10" />
          <span className="text-sm">{lang === 'zh' ? '登录后查看收藏' : 'Log in to view collection'}</span>
        </div>
      ) : collection.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/30 gap-2">
          <Disc3 className="w-10 h-10" />
          <span className="text-sm">{lang === 'zh' ? '暂无收藏专辑' : 'No albums in collection'}</span>
          <button
            onClick={() => setView('marketplace')}
            className="mt-2 text-purple-400 text-xs hover:text-purple-300 transition-colors"
          >
            {lang === 'zh' ? '去商城逛逛 →' : 'Browse marketplace →'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {collection.map((album, idx) => (
            <motion.button
              key={album.id}
              onClick={() => { setSelectedAlbum(album); setPurchaseResult(null); setView('detail' as any); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all text-left"
              whileHover={{ x: 4 }}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                <ImageWithFallback
                  src={getCoverUrl(album, idx)}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-white text-sm font-semibold truncate">{album.title}</h4>
                  {album.limitedEdition && (
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                      #{album.ownership.edition}{album.maxSupply ? `/${album.maxSupply}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-white/40 text-xs truncate">{album.creatorName} · {album.tracks.length} {lang === 'zh' ? '首曲目' : 'tracks'}</p>
                <p className="text-white/25 text-[10px] mt-0.5">
                  {lang === 'zh' ? '购于' : 'Purchased'} {formatDate(album.ownership.purchasedAt, lang)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Panel */}
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-[#0D1235]/95 backdrop-blur-2xl rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  <Disc3 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">
                    {lang === 'zh' ? '数字专辑' : 'Digital Albums'}
                  </h2>
                  <p className="text-white/30 text-[10px]">P3 · {lang === 'zh' ? '数字专辑分发系统' : 'Album Distribution System'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* SP Balance */}
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 text-xs font-semibold">{starPower}</span>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            {!selectedAlbum && (
              <div className="flex px-5 pt-3 gap-1 flex-shrink-0">
                {[
                  { id: 'marketplace' as const, icon: ShoppingBag, zh: '商城', en: 'Marketplace' },
                  { id: 'collection' as const, icon: Disc3, zh: '我的收藏', en: 'My Collection' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      view === tab.id
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {lang === 'zh' ? tab.zh : tab.en}
                    {tab.id === 'collection' && collection.length > 0 && (
                      <span className="ml-1 bg-white/10 text-white/50 text-[10px] px-1.5 py-0.5 rounded-full">
                        {collection.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin scrollbar-thumb-white/10">
              <AnimatePresence mode="wait">
                {selectedAlbum
                  ? renderDetail()
                  : view === 'marketplace'
                    ? renderMarketplace()
                    : renderCollection()
                }
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
