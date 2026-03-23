
import { PlatformPreset } from './types';

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { name: 'Mercado Livre (Clássico)', percentage: 11, fixedFee: 6 },
  { name: 'Mercado Livre (Premium)', percentage: 16, fixedFee: 6 },
  { name: 'Shopee', percentage: 14, fixedFee: 3 },
  { name: 'Loja Própria / Direto', percentage: 0, fixedFee: 0 },
  { name: 'Personalizado', percentage: 0, fixedFee: 0 },
];

export const DEFAULT_INPUTS = {
  productName: 'Novo Projeto',
  parts: [
    { id: '1', name: 'Parte Principal', weightGrams: 100, printTimeHours: 5 }
  ],
  pricePerKilo: 120,
  powerConsumptionWatts: 150,
  energyCostKwh: 0.95,
  packagingCost: 5,
  failureRate: 10,
  extraCosts: 0,
  profitMargin: 50,
  platformPercentage: 11,
  platformFixedFee: 6,
};
