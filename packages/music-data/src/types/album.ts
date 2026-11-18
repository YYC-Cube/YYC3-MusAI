// 数字专辑与二级市场域 — 专辑模型、上架购买、交易与商店面板

import type { AuthUser } from './user';

/** Album store view modes */
export type AlbumViewMode = 'marketplace' | 'collection' | 'detail';

/** Secondary market view modes */
export type MarketViewMode = 'browse' | 'sell' | 'history' | 'detail';

/** Market listing status */
export type MarketListingStatus = 'active' | 'sold' | 'cancelled';

/** Exclusive content types for albums */
export type ExclusiveContentType =
  | 'pdf'
  | 'stem'
  | 'video'
  | 'bonus-track';

/** Album track */
export interface AlbumTrack {
  songId: string;
  title: string;
  artist: string;
  duration: number;
  trackNumber: number;
}

/** Album exclusive content */
export interface AlbumExclusiveContent {
  type: ExclusiveContentType;
  label: string;
  labelEn: string;
}

/** Digital album */
export interface Album {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  coverUrl: string;
  genre: string;
  tracks: AlbumTrack[];
  price: number;
  limitedEdition: boolean;
  maxSupply: number | null;
  circulatingSupply: number;
  releaseDate: number;
  exclusiveContent: AlbumExclusiveContent[];
  tags: string[];
  likes: number;
  totalSales: number;
  createdAt: number;
}

/** Album ownership record */
export interface AlbumOwnership {
  albumId: string;
  userId: string;
  purchasedAt: number;
  price: number;
  edition: number;
}

/** Secondary market listing */
export interface MarketListing {
  id: string;
  albumId: string;
  albumTitle: string;
  albumGenre: string;
  albumCoverUrl: string;
  sellerId: string;
  sellerName: string;
  price: number;
  originalPrice: number;
  edition: number;
  maxSupply: number | null;
  limitedEdition: boolean;
  createdAt: number;
  status: MarketListingStatus;
}

/** Completed sale record */
export interface MarketSale {
  listingId: string;
  albumId: string;
  albumTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  price: number;
  sellerEarnings: number;
  creatorRoyalty: number;
  platformFee: number;
  edition: number;
  soldAt: number;
}

/** Market statistics */
export interface MarketStats {
  activeListings: number;
  totalListings: number;
  totalSales: number;
  totalVolume: number;
  floorPrices: Record<string, number>;
  recentSales: MarketSale[];
}

/** Album create request */
export interface AlbumCreateRequest {
  creatorId: string;
  creatorName: string;
  title: string;
  description?: string;
  genre?: string;
  tracks: Array<{
    songId?: string;
    title: string;
    artist?: string;
    duration?: number;
  }>;
  price?: number;
  limitedEdition?: boolean;
  maxSupply?: number;
  tags?: string[];
}

/** Market list request */
export interface MarketListRequest {
  userId: string;
  userName?: string;
  albumId: string;
  price: number;
}

/** Market buy request */
export interface MarketBuyRequest {
  userId: string;
  userName?: string;
}

/** Album purchase response */
export interface AlbumPurchaseResponse {
  success: boolean;
  ownership: AlbumOwnership;
  starPower: number;
  edition: number;
  maxSupply: number | null;
}

/** Market buy response */
export interface MarketBuyResponse {
  success: boolean;
  sale: MarketSale;
  buyerStarPower: number;
}

export interface AlbumStoreProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}

export interface SecondaryMarketProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}
