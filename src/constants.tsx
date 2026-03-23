
import { PlatformPreset } from './types';

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { name: 'Loja Própria', percentage: 0, fixedFee: 0 },
  { name: 'Mercado Livre (Clássico)', percentage: 11, fixedFee: 6 },
  { name: 'Mercado Livre (Premium)', percentage: 16, fixedFee: 6 },
  { name: 'Shopee', percentage: 14, fixedFee: 3 },
  { name: 'Personalizado', percentage: 0, fixedFee: 0 },
];

export const DEFAULT_INPUTS = {
  productName: 'Novo Projeto',
  parts: [
    { id: '1', name: 'Parte Principal', weightGrams: 100, printTimeHours: 5 }
  ],
  pricePerKilo: 120,
  powerConsumptionWatts: 150,
  energyCostKwh: 0.62,
  packagingCost: 0.20,
  failureRate: 10,
  extraCosts: 0,
  profitMargin: 200,
  platformPercentage: 0,
  platformFixedFee: 0,
};
