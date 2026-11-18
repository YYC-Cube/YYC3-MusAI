// 星力经济域 — 星力账本、VIP 等级、商店与星力面板

import type { AuthUser } from './user';

/** Star Power shop item rarity */
export type ShopItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Shop item categories */
export type ShopItemCategory = 'theme' | 'sound' | 'badge';

/** Star power balance data */
export interface StarPowerData {
  starPower?: number;
  transactions?: StarPowerTransaction[];
}

/** Star power transaction record */
export interface StarPowerTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  timestamp: number;
  balance: number;
}

/** VIP level definition */
export interface VIPLevel {
  level: number;
  label: string;
  labelEn: string;
  threshold: number;
  color: string;
  dailyReward: number;
  nextThreshold?: number | null;
  nextLabel?: string | null;
}

/** Shop item */
export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  cost: number;
  icon: string;
  rarity: ShopItemRarity;
}

/** Star power add request */
export interface StarPowerAddRequest {
  amount: number;
  reason: string;
}

/** Star power consume request */
export interface StarPowerConsumeRequest {
  amount: number;
  purpose: string;
  targetId?: string;
}

/** Shop purchase request */
export interface ShopPurchaseRequest {
  userId: string;
  itemId: string;
}

export interface StarPowerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
  onOpenShop?: () => void;
}

export interface StarPowerShopProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}
