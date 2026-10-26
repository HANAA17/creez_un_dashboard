import type { AccountType } from '../domain';
import type { IconName } from './icons';
import type { ColorKey } from './palette';

export const ACCOUNT_LOOK: Record<AccountType, { icon: IconName; color: ColorKey; label: string }> = {
  checking: { icon: 'card', color: 'blue', label: 'Courant' },
  savings: { icon: 'trending-up', color: 'aqua', label: 'Épargne' },
  cash: { icon: 'cash', color: 'orange', label: 'Espèces' },
};
