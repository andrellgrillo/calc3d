
export interface Part {
  id: string;
  name: string;
  weightGrams: number;
  printTimeHours: number;
}

export interface PlatformPreset {
  name: string;
  percentage: number;
  fixedFee: number;
}

export interface CalculationInputs {
  productName: string;
  parts: Part[];
  pricePerKilo: number;
  powerConsumptionWatts: number;
  energyCostKwh: number;
  packagingCost: number;
  failureRate: number;
  extraCosts: number;
  profitMargin: number;
  platformPercentage: number;
  platformFixedFee: number;
}

export interface CalculationResults {
  materialCost: number;
  energyCost: number;
  baseProductionCost: number;
  costWithFailure: number;
  netPrice: number;
  platformFeeAmount: number;
  finalSellingPrice: number;
  profitAmount: number;
  totalWeight: number;
  totalTime: number;
}
