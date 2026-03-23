import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react';
import { 
  HashRouter, 
  Routes, 
  Route, 
  NavLink, 
  useLocation,
  Navigate
} from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { 
  Calculator, 
  Printer, 
  Package, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  Download,
  Info,
  ChevronRight,
  LayoutDashboard,
  Wallet,
  Settings2,
  Share2,
  FileText,
  Play,
  RotateCcw,
  Check,
  Sparkles,
  Loader2,
  Table,
  ClipboardCheck,
  X,
  HelpCircle,
  Search,
  ArrowRight,
  Save,
  Tag,
  Plus,
  Trash2,
  Layers,
  Palette,
  FileDown,
  Coins
} from 'lucide-react';
import { InputField } from './components/InputField';
import { CalculationInputs, CalculationResults, Part } from './types';
import { PLATFORM_PRESETS, DEFAULT_INPUTS } from './constants';

const STORAGE_KEY = 'calc3d_inputs_v4';
const HISTORY_KEY = 'calc3d_history';

// Padrão de Cores Sólidas
const COLORS = {
  bg: '#020617',         // slate-950
  card: '#0f172a',       // slate-900
  surface: '#1e293b',    // slate-800
  border: '#334155',     // slate-700
  primary: '#2563eb',    // blue-600
  success: '#059669',    // emerald-600
  warning: '#f59e0b',    // amber-500
  info: '#8b5cf6',       // violet-500
  textPrimary: '#f8fafc',// slate-50
  textSecondary: '#94a3b8' // slate-400
};

type AppState = {
  inputs: CalculationInputs;
  results: CalculationResults | null;
  isDirty: boolean;
  isCalculating: boolean;
  selectedPlatform: string;
  calcKey: number;
};

type AppAction = 
  | { type: 'UPDATE_INPUT'; field: keyof CalculationInputs; value: any }
  | { type: 'UPDATE_PART'; partId: string; field: keyof Part; value: any }
  | { type: 'ADD_PART' }
  | { type: 'REMOVE_PART'; partId: string }
  | { type: 'SET_PLATFORM'; name: string; percentage: number; fixedFee: number }
  | { type: 'START_CALCULATION' }
  | { type: 'FINISH_CALCULATION'; results: CalculationResults }
  | { type: 'RESET'; defaultInputs: CalculationInputs; defaultPlatform: string };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'UPDATE_INPUT': {
      const isPlatformField = action.field === 'platformPercentage' || action.field === 'platformFixedFee';
      return {
        ...state,
        inputs: { ...state.inputs, [action.field]: action.value },
        isDirty: true,
        selectedPlatform: isPlatformField ? 'Personalizado' : state.selectedPlatform
      };
    }
    case 'UPDATE_PART': {
      const newParts = state.inputs.parts.map(p => 
        p.id === action.partId ? { ...p, [action.field]: action.value } : p
      );
      return {
        ...state,
        inputs: { ...state.inputs, parts: newParts },
        isDirty: true
      };
    }
    case 'ADD_PART': {
      const newPart: Part = {
        id: Date.now().toString(),
        name: `Parte ${state.inputs.parts.length + 1}`,
        weightGrams: 0,
        printTimeHours: 0
      };
      return {
        ...state,
        inputs: { ...state.inputs, parts: [...state.inputs.parts, newPart] },
        isDirty: true
      };
    }
    case 'REMOVE_PART': {
      if (state.inputs.parts.length <= 1) return state;
      const newParts = state.inputs.parts.filter(p => p.id !== action.partId);
      return {
        ...state,
        inputs: { ...state.inputs, parts: newParts },
        isDirty: true
      };
    }
    case 'SET_PLATFORM':
      return {
        ...state,
        selectedPlatform: action.name,
        isDirty: true,
        inputs: {
          ...state.inputs,
          platformPercentage: action.percentage,
          platformFixedFee: action.fixedFee
        }
      };
    case 'START_CALCULATION':
      return { ...state, isCalculating: true };
    case 'FINISH_CALCULATION':
      return { 
        ...state, 
        results: action.results, 
        isDirty: false, 
        isCalculating: false, 
        calcKey: state.calcKey + 1 
      };
    case 'RESET':
      return {
        ...state,
        inputs: { ...action.defaultInputs },
        selectedPlatform: action.defaultPlatform,
        results: null,
        isDirty: true,
        calcKey: state.calcKey + 1 
      };
    default:
      return state;
  }
}

const AnimatedCurrency: React.FC<{ value: number }> = React.memo(({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const rafRef = useRef<number>(null);
  const startValueRef = useRef(value);

  useEffect(() => {
    const startValue = startValueRef.current;
    const endValue = value;
    const duration = 600;
    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const nextValue = startValue + (endValue - startValue) * eased;
      setDisplayValue(nextValue);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        startValueRef.current = endValue;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayValue)}</span>;
});

const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-700 bg-slate-900">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            {title}
          </h3>
        </div>
        <div className="p-6 bg-slate-900">
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-slate-800 flex gap-3 border-t border-slate-700">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all text-sm"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-red-900/20"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

const CalculationDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: { label: string; value: string; desc: string }[];
}> = ({ isOpen, onClose, title, steps }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <Search size={22} className="text-blue-500" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800 rounded-full border border-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900">
          {steps.map((step, idx) => (
            <div key={idx} className="relative pl-8 animate-in slide-in-from-left duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
              {idx !== steps.length - 1 && (
                <div className="absolute left-[15px] top-8 bottom-[-24px] w-0.5 bg-slate-800" />
              )}
              <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-600 border border-blue-500 flex items-center justify-center text-white text-xs font-black z-10">
                {idx + 1}
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{step.label}</p>
                <div className="font-mono text-sm text-blue-100 mb-2 p-3 bg-slate-950 rounded-xl border border-slate-700 whitespace-pre-wrap">
                  {step.value}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-slate-800 flex justify-end border-t border-slate-700">
          <button 
            onClick={onClose}
            className="w-full px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all text-sm shadow-lg flex items-center justify-center gap-2"
          >
            Entendi! <Check size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const runCalculation = (inputs: CalculationInputs): CalculationResults => {
  const totalWeight = inputs.parts.reduce((sum, p) => sum + p.weightGrams, 0);
  const totalTime = inputs.parts.reduce((sum, p) => sum + p.printTimeHours, 0);
  const materialCost = (totalWeight / 1000) * inputs.pricePerKilo;
  const energyCost = (totalTime * (inputs.powerConsumptionWatts / 1000)) * inputs.energyCostKwh;
  const baseProductionCost = materialCost + energyCost + inputs.packagingCost + inputs.extraCosts;
  const failureRateDecimal = inputs.failureRate / 100;
  const costWithFailure = failureRateDecimal >= 1 ? baseProductionCost * 2 : baseProductionCost / (1 - failureRateDecimal);
  const netPrice = costWithFailure * (1 + (inputs.profitMargin / 100));
  const profitAmount = netPrice - costWithFailure;
  const platformFeeDecimal = inputs.platformPercentage / 100;
  const finalSellingPrice = platformFeeDecimal >= 1 ? netPrice + inputs.platformFixedFee : (netPrice + inputs.platformFixedFee) / (1 - platformFeeDecimal);
  const platformFeeAmount = finalSellingPrice - netPrice;

  return { materialCost, energyCost, baseProductionCost, costWithFailure, netPrice, platformFeeAmount, finalSellingPrice, profitAmount, totalWeight, totalTime };
};

const AppContent: React.FC = () => {
  const initialInputs = useMemo(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_INPUTS;
  }, []);

  const [state, dispatch] = useReducer(appReducer, {
    inputs: initialInputs,
    results: null,
    isDirty: true,
    isCalculating: false,
    selectedPlatform: PLATFORM_PRESETS.find(p => p.percentage === initialInputs.platformPercentage && p.fixedFee === initialInputs.platformFixedFee)?.name || 'Personalizado',
    calcKey: 0
  });

  const [toastMessage, setToastMessage] = useState<{title: string, desc: string, icon: React.ReactNode} | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeDetail, setActiveDetail] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.inputs));
  }, [state.inputs]);

  const triggerToast = (title: string, desc: string, icon: React.ReactNode) => {
    setToastMessage({ title, desc, icon });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCalculate = useCallback(() => {
    dispatch({ type: 'START_CALCULATION' });
    requestAnimationFrame(() => {
      setTimeout(() => {
        const results = runCalculation(state.inputs);
        dispatch({ type: 'FINISH_CALCULATION', results });
      }, 150);
    });
  }, [state.inputs]);

  const handleReset = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const confirmReset = useCallback(() => {
    dispatch({ 
      type: 'RESET', 
      defaultInputs: DEFAULT_INPUTS, 
      defaultPlatform: PLATFORM_PRESETS[0].name 
    });
    triggerToast("Reset realizado!", "Valores voltaram ao padrão original.", <RotateCcw className="text-white" size={20} />);
  }, []);

  const handleInputChange = useCallback((field: keyof CalculationInputs, value: any) => {
    dispatch({ type: 'UPDATE_INPUT', field, value });
  }, []);

  const handlePartChange = useCallback((partId: string, field: keyof Part, value: any) => {
    dispatch({ type: 'UPDATE_PART', partId, field, value });
  }, []);

  const handlePlatformChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    const preset = PLATFORM_PRESETS.find(p => p.name === presetName);
    if (preset) {
      dispatch({ type: 'SET_PLATFORM', name: presetName, percentage: preset.percentage, fixedFee: preset.fixedFee });
    }
  }, []);

  const handleShare = useCallback(() => {
    if (!state.results) return;
    const text = `📊 *Orçamento de Impressão 3D*\n\n` +
      `📦 *Produto:* ${state.inputs.productName}\n` +
      `🧩 *Partes:* ${state.inputs.parts.length}\n` +
      `💰 *Preço Sugerido:* ${formatBRL(state.results.finalSellingPrice)}\n\n` +
      `Gerado por Calc3D`;
    navigator.clipboard.writeText(text).then(() => {
      triggerToast("Copiado!", "Orçamento na área de transferência.", <ClipboardCheck className="text-white" size={20} />);
    });
  }, [state.results, state.inputs]);

  const handleSave = useCallback(() => {
    if (!state.results || saveStatus !== 'idle') return;
    setSaveStatus('saving');
    setTimeout(() => {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const newItem = { id: Date.now(), date: new Date().toISOString(), inputs: state.inputs, results: state.results, platform: state.selectedPlatform };
      localStorage.setItem(HISTORY_KEY, JSON.stringify([newItem, ...history].slice(0, 20)));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    }, 400);
  }, [state.results, state.inputs, state.selectedPlatform, saveStatus]);

  /**
   * PDF Generation using html2pdf.js library
   * Fixed blank PDF issue by ensuring element is visible and allowing a render tick.
   */
  const handleDownloadPDF = useCallback(() => {
    if (!state.results || isExporting) return;
    
    setIsExporting(true);
    const element = document.getElementById('pdf-report');
    if (!element) {
        setIsExporting(false);
        return;
    }

    // Capture options
    const opt = {
      margin: 10,
      filename: `Relatorio_Calc3D_${state.inputs.productName.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: any) => {
          const report = clonedDoc.getElementById('pdf-report');
          if (report) {
            const allElements = report.querySelectorAll('*');
            allElements.forEach((el: any) => {
              // Aggressively strip oklch from inline styles
              const inlineStyle = el.getAttribute('style') || '';
              if (inlineStyle.includes('oklch')) {
                const newStyle = inlineStyle.replace(/oklch\([^)]+\)/g, '#000000');
                el.setAttribute('style', newStyle);
              }
              
              // Also check computed styles if possible, though it's harder to modify them here
              // The style tag below should handle most cases via !important
            });
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Use html2pdf global
    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
      // Small timeout to ensure everything is rendered
      setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(() => {
          setIsExporting(false);
          triggerToast("Sucesso!", "Seu relatório PDF foi gerado.", <FileDown size={20} className="text-white" />);
        }).catch((err: any) => {
          console.error("PDF Generation Error:", err);
          setIsExporting(false);
          triggerToast("Erro!", "Falha ao gerar PDF. Tente novamente.", <AlertTriangle size={20} className="text-white" />);
        });
      }, 100);
    } else {
      setIsExporting(false);
      triggerToast("Erro!", "Biblioteca de PDF não carregada.", <AlertTriangle size={20} className="text-white" />);
    }
  }, [state.results, state.inputs.productName, isExporting]);

  const chartData = useMemo(() => {
    if (!state.results) return [];
    return [
      { id: 'material', name: 'Material', value: state.results.materialCost, color: COLORS.primary },
      { id: 'energia', name: 'Energia', value: state.results.energyCost, color: COLORS.warning },
      { id: 'embalagem', name: 'Embalagem', value: state.inputs.packagingCost, color: COLORS.success },
      { id: 'extras', name: 'Extras', value: state.inputs.extraCosts, color: COLORS.info },
      { id: 'falhas', name: 'Falhas', value: state.results.costWithFailure - state.results.baseProductionCost, color: '#ef4444' },
      { id: 'taxas', name: 'Taxas', value: state.results.platformFeeAmount, color: COLORS.textSecondary },
      { id: 'lucro', name: 'Lucro', value: state.results.profitAmount, color: '#8b5cf6' },
    ].filter(item => item.value > 0);
  }, [state.results, state.inputs]);

  const getCalculationSteps = (type: string) => {
    if (!state.results) return [];
    
    if (type === 'taxas') {
      const net = state.results.netPrice;
      const feeFixed = state.inputs.platformFixedFee;
      const feePerc = state.inputs.platformPercentage;
      const factor = (1 - (feePerc / 100)).toFixed(4);
      const subtotal = net + feeFixed;
      
      return [
        { 
          label: "1. Cálculo do Subtotal Pretendido", 
          value: `Subtotal = Custo/Lucro (R$ ${net.toFixed(2)}) + Taxa Fixa Canal (R$ ${feeFixed.toFixed(2)})\nSubtotal = R$ ${subtotal.toFixed(2)}`, 
          desc: "Primeiro determinamos o valor que deve sobrar 'limpo' para você antes da comissão em porcentagem do marketplace ser aplicada." 
        },
        { 
          label: "2. Fator de Marketplace (Markup Inverso)", 
          value: `Fator = (100 - Comissão %) / 100\nFator = (100 - ${feePerc}%) / 100 = ${factor}`, 
          desc: "A comissão do marketplace é cobrada sobre o PREÇO FINAL de anúncio. Por isso, precisamos dividir o subtotal pela porcentagem que sobra do preço original." 
        },
        { 
          label: "3. Definição do Preço de Venda Final", 
          value: `Preço Final = Subtotal / Fator\nPreço Final = ${subtotal.toFixed(2)} / ${factor} = R$ ${state.results.finalSellingPrice.toFixed(2)}`, 
          desc: "Esta fórmula garante que, ao descontar a comissão, você receba exatamente o valor planejado no passo 1." 
        },
        {
          label: "Explicação para Iniciantes",
          value: "O Erro Comum",
          desc: "Muitos vendedores apenas somam 10% ao preço (ex: R$ 100 + 10% = R$ 110). Porém, o marketplace cobra 10% sobre os R$ 110 (R$ 11), deixando você com apenas R$ 99. Nossa calculadora usa o cálculo reverso para que você nunca perca essa diferença!"
        }
      ];
    }
    
    return [
      { 
        label: "1. Custo de Material", 
        value: `Material = (Peso Total / 1000) * Preço Filamento\nMaterial = (${state.results.totalWeight}g / 1000) * ${formatBRL(state.inputs.pricePerKilo)} = ${formatBRL(state.results.materialCost)}`, 
        desc: "O peso total das peças (em gramas) é convertido para quilos e multiplicado pelo preço do quilo do filamento informado." 
      },
      { 
        label: "2. Custo de Energia Elétrica", 
        value: `Custo Energia = Tempo de Impressão (h) * (Potência da Impressora (W) / 1000) * Custo do kWh\nCusto Energia = ${state.results.totalTime}h * (${state.inputs.powerConsumptionWatts}W / 1000) * ${formatBRL(state.inputs.energyCostKwh)} = ${formatBRL(state.results.energyCost)}`, 
        desc: "O consumo é calculado convertendo a potência da impressora (Watts) para kiloWatts, multiplicando pelo tempo total de funcionamento e pela tarifa da sua concessionária de energia." 
      },
      { 
        label: "3. Margem de Falha e Segurança", 
        value: `Custo Ajustado = Custo Base / (1 - (Taxa Falha / 100))\nCusto Ajustado = ${formatBRL(state.results.baseProductionCost)} / (1 - ${state.inputs.failureRate / 100}) = ${formatBRL(state.results.costWithFailure)}`, 
        desc: "Aplicamos um Markup de segurança. Se você tem 10% de falha, o custo é dividido por 0.90 para garantir que as peças perdidas sejam pagas pelas peças vendidas." 
      }
    ];
  };

  const renderCalculateButton = () => (
    <button 
      onClick={handleCalculate}
      disabled={state.isCalculating}
      className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-[0.98] ${
        state.isCalculating ? 'bg-slate-800 text-slate-500 cursor-wait border border-slate-700' : state.isDirty ? 'bg-blue-600 hover:bg-blue-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 border border-slate-700'
      }`}
    >
      {state.isCalculating ? <Loader2 size={24} className="animate-spin" /> : <Play size={24} fill="currentColor" />}
      {state.isCalculating ? 'Calculando...' : 'Calcular Preço de Venda'}
    </button>
  );

  const renderProductionSections = () => (
    <div className="space-y-6">
      <section className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2">
            <Printer className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Configuração do Projeto</h2>
          </div>
          <button onClick={handleReset} className="text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider group">
            <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" /> Resetar
          </button>
        </div>
        
        <div className="mb-6 p-5 bg-slate-800 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={14} className="text-blue-500" />
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Nome do Projeto</label>
          </div>
          <input 
            type="text" 
            placeholder="Ex: Robô Colecionável..."
            value={state.inputs.productName}
            onChange={(e) => handleInputChange('productName', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-4 px-5 text-base focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder-slate-700 font-bold"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="text-blue-500" size={16} />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Partes do Objeto</h3>
            </div>
            <button onClick={() => dispatch({ type: 'ADD_PART' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-500 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">
              <Plus size={14} /> Adicionar Parte
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {state.inputs.parts.map((part, index) => (
              <div key={part.id} className="p-4 bg-slate-800 rounded-2xl border border-slate-700 group/part transition-all hover:border-slate-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center text-[10px] font-black">{index + 1}</span>
                    <input type="text" value={part.name} onChange={(e) => handlePartChange(part.id, 'name', e.target.value)} className="bg-transparent border-none text-white font-bold text-sm focus:ring-0 p-0 w-full" />
                  </div>
                  <button onClick={() => dispatch({ type: 'REMOVE_PART', partId: part.id })} disabled={state.inputs.parts.length <= 1} className="p-1.5 text-slate-600 hover:text-red-500 transition-colors disabled:opacity-0"><Trash2 size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Peso (g)" value={part.weightGrams} onChange={(v) => handlePartChange(part.id, 'weightGrams', v)} suffix="g" step={1} />
                  <InputField label="Tempo (h)" value={part.printTimeHours} onChange={(v) => handlePartChange(part.id, 'printTimeHours', v)} suffix="h" step={0.1} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-2xl">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Totais Acumulados</span>
            <div className="flex gap-6">
              <div className="flex flex-col items-end"><span className="text-[8px] font-bold text-slate-500 uppercase">Peso</span><span className="text-sm font-black text-white">{state.inputs.parts.reduce((s, p) => s + p.weightGrams, 0)}g</span></div>
              <div className="flex flex-col items-end"><span className="text-[8px] font-bold text-slate-500 uppercase">Tempo</span><span className="text-sm font-black text-white">{state.inputs.parts.reduce((s, p) => s + p.printTimeHours, 0)}h</span></div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InputField 
            label="Preço Filamento (kg)" 
            value={state.inputs.pricePerKilo} 
            onChange={(v) => handleInputChange('pricePerKilo', v)} 
            prefix="R$" 
            tooltip="Calculado como: (Peso total em g / 1000) × Preço por kg. Ex: Uma peça de 500g usando filamento de R$ 100/kg resulta em R$ 50,00 de custo de material." 
          />
          <InputField label="Falha Estimada" value={state.inputs.failureRate} onChange={(v) => handleInputChange('failureRate', v)} suffix="%" tooltip="Margem de erro e perda." />
        </div>
      </section>

      <section className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
          <Zap className="text-amber-500" size={20} />
          <h2 className="text-lg font-semibold text-white">Consumo Elétrico</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InputField label="Potência (Watts)" value={state.inputs.powerConsumptionWatts} onChange={(v) => handleInputChange('powerConsumptionWatts', v)} suffix="W" />
          <InputField 
            label="Custo kWh" 
            value={state.inputs.energyCostKwh} 
            onChange={(v) => handleInputChange('energyCostKwh', v)} 
            prefix="R$" 
            tooltip="Detalhe de como o consumo de energia é calculado. Fórmula: Custo Energia = Tempo de Impressão (h) * (Potência da Impressora (W) / 1000) * Custo do kWh"
          />
        </div>
      </section>
      <div className="hidden lg:block pt-4">{renderCalculateButton()}</div>
    </div>
  );

  const renderSalesSections = () => {
    const isCustom = state.selectedPlatform === 'Personalizado';
    return (
      <div className="space-y-6">
        <section className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
            <Package className="text-emerald-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Marketplace e Vendas</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <InputField label="Embalagem" value={state.inputs.packagingCost} onChange={(v) => handleInputChange('packagingCost', v)} prefix="R$" />
            <InputField label="Custos Extras" value={state.inputs.extraCosts} onChange={(v) => handleInputChange('extraCosts', v)} prefix="R$" />
          </div>
          <div className="border-t border-slate-700 pt-6">
            <label className="text-xs font-bold text-slate-500 block mb-3 uppercase tracking-widest">Canal de Venda</label>
            <select value={state.selectedPlatform} onChange={handlePlatformChange} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-4 px-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none mb-6">
              {PLATFORM_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <div className={`p-6 bg-slate-800 border border-slate-700 rounded-xl transition-all ${isCustom ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
              <div className="grid grid-cols-2 gap-6">
                <InputField label="Comissão (%)" value={state.inputs.platformPercentage} onChange={(v) => handleInputChange('platformPercentage', v)} suffix="%" step={0.1} />
                <InputField label="Taxa Fixa" value={state.inputs.platformFixedFee} onChange={(v) => handleInputChange('platformFixedFee', v)} prefix="R$" step={0.5} />
              </div>
            </div>
          </div>
        </section>
        <section className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
            <TrendingUp className="text-violet-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Lucratividade</h2>
          </div>
          <div className="px-2">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm text-slate-400">Margem Pretendida</span>
              <span className="text-3xl font-black text-blue-500">{state.inputs.profitMargin}%</span>
            </div>
            <input type="range" min="0" max="400" step="5" value={state.inputs.profitMargin} onChange={(e) => handleInputChange('profitMargin', parseInt(e.target.value))} className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 border border-slate-700" />
          </div>
        </section>
        <div className="lg:hidden pb-4">{renderCalculateButton()}</div>
      </div>
    );
  };

  const renderResultSidebar = () => {
    if (!state.results) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-900 border border-dashed border-slate-700 rounded-[2rem] p-12 text-center animate-in fade-in duration-700">
          <div className="bg-slate-800 p-6 rounded-full text-slate-600 mb-6 border border-slate-700"><Calculator size={48} /></div>
          <h3 className="text-xl font-bold text-slate-400 mb-2">Aguardando Cálculo</h3>
          <p className="text-slate-500 text-sm max-w-[240px]">Clique no botão de calcular para processar o preço final.</p>
        </div>
      );
    }

    return (
      <div key={state.calcKey} className="space-y-6 h-full animate-in fade-in slide-in-from-right-4 duration-500 relative">
        <CalculationDetailModal 
          isOpen={!!activeDetail} 
          onClose={() => setActiveDetail(null)} 
          title={activeDetail === 'taxas' ? 'Como as taxas são calculadas?' : 'Passo a Passo dos Custos'} 
          steps={activeDetail ? getCalculationSteps(activeDetail) : []} 
        />
        
        <div className="bg-blue-600 text-white p-8 rounded-[2rem] shadow-2xl border border-blue-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} className="text-white" />
              <p className="text-white font-black uppercase text-[11px] tracking-widest truncate">{state.inputs.productName}</p>
            </div>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-[0.2em] mb-1">Preço Sugerido</p>
            <h3 className="text-5xl font-black mb-8 tracking-tighter"><AnimatedCurrency value={state.results.finalSellingPrice} /></h3>
            <div className="space-y-4 pt-6 border-t border-blue-400 text-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Produção</span>
                  <button 
                    onClick={() => setActiveDetail('producao')} 
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-[9px] font-black uppercase border border-blue-400 transition-colors"
                  >
                    Detalhes <ChevronRight size={10} />
                  </button>
                </div>
                <span className="font-bold"><AnimatedCurrency value={state.results.costWithFailure} /></span>
              </div>
              <div className="flex justify-between"><span>Lucro Líquido</span><span className="font-bold"><AnimatedCurrency value={state.results.profitAmount} /></span></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Taxas Canal</span>
                  <button 
                    onClick={() => setActiveDetail('taxas')} 
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-[9px] font-black uppercase border border-blue-400 transition-colors"
                  >
                    Detalhes <ChevronRight size={10} />
                  </button>
                </div>
                <span className="font-bold"><AnimatedCurrency value={state.results.platformFeeAmount} /></span>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button onClick={handleSave} disabled={saveStatus !== 'idle'} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${saveStatus === 'saved' ? 'bg-emerald-600 border-emerald-500' : 'bg-blue-700 border-blue-500'}`}>
                {saveStatus === 'saved' ? <Check size={20} /> : saveStatus === 'saving' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                <span className="text-[10px] font-black uppercase tracking-widest">{saveStatus === 'saved' ? 'Salvo' : 'Salvar'}</span>
              </button>
              <button onClick={handleShare} className="bg-blue-700 border border-blue-500 p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                <Share2 size={20} /><span className="text-[10px] font-black uppercase tracking-widest">Compartilhar</span>
              </button>
              
              <button 
                onClick={handleDownloadPDF} 
                disabled={isExporting}
                className="bg-blue-700 border border-blue-500 p-4 rounded-xl flex flex-col items-center gap-2 transition-all shadow-xl shadow-blue-900/40 hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={20} className="animate-spin" /> : <FileDown size={20} />}
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Exportar Relatório PDF</span>
              </button>

              <button onClick={() => window.print()} className="bg-blue-700 border border-blue-500 p-4 rounded-xl flex flex-col items-center gap-2 transition-all hover:bg-blue-500 active:scale-95">
                <Printer size={20} /><span className="text-[10px] font-black uppercase tracking-widest">Imprimir</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-700">
          <div className="flex items-center gap-2 mb-6"><Info size={16} className="text-slate-500" /><h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Composição de Preço</h4></div>
          <div className="h-64 w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <RechartsTooltip 
                  formatter={(v: number) => formatBRL(v)} 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc' }} 
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(v: number) => formatBRL(v)} 
                    style={{ fill: '#f8fafc', fontSize: '9px', fontWeight: '900' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-[11px] p-3 rounded-xl bg-slate-800 border border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-400 font-bold">{item.name}</span>
                  {item.id === 'material' && (
                    <div className="relative group/tooltip flex items-center">
                      <HelpCircle size={12} className="text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-[10px] leading-relaxed text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100] pointer-events-none font-normal">
                        <p className="font-black text-blue-400 uppercase mb-1">Custo de Material</p>
                        <p>Calculado multiplicando o peso total (em kg) pelo preço do filamento.</p>
                        <p className="mt-2 p-2 bg-slate-900 rounded-lg border border-slate-700 italic">
                          Ex: 100g de peça a R$ 120,00/kg = 0.1kg × 120 = R$ 12,00.
                        </p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  )}
                  {item.id === 'energia' && (
                    <div className="relative group/tooltip flex items-center">
                      <HelpCircle size={12} className="text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-[10px] leading-relaxed text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100] pointer-events-none font-normal">
                        <p className="font-black text-amber-400 uppercase mb-1">Custo de Energia</p>
                        <p>Calculado pelo tempo de impressão e potência da máquina.</p>
                        <p className="mt-2 p-2 bg-slate-900 rounded-lg border border-slate-700 italic">
                          Fórmula: Tempo de Impressão (h) * (Potência da Impressora (W) / 1000) * Custo do kWh.
                        </p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  )}
                  {item.id === 'embalagem' && (
                    <div className="relative group/tooltip flex items-center">
                      <HelpCircle size={12} className="text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-[10px] leading-relaxed text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100] pointer-events-none font-normal">
                        <p className="font-black text-emerald-400 uppercase mb-1">Embalagem</p>
                        <p>Custos diretos com caixas, plástico bolha, fitas e etiquetas para o envio seguro do produto.</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  )}
                  {item.id === 'extras' && (
                    <div className="relative group/tooltip flex items-center">
                      <HelpCircle size={12} className="text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-[10px] leading-relaxed text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100] pointer-events-none font-normal">
                        <p className="font-black text-violet-400 uppercase mb-1">Custos Extras</p>
                        <p>Outros gastos não categorizados, como manutenção, adesivos de mesa, colas ou pós-processamento.</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  )}
                  {item.id === 'falhas' && (
                    <div className="relative group/tooltip flex items-center">
                      <HelpCircle size={12} className="text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-[10px] leading-relaxed text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100] pointer-events-none font-normal">
                        <p className="font-black text-red-400 uppercase mb-1">Margem de Falha</p>
                        <p>Seguro para cobrir o custo de impressões perdidas. Garante que as peças boas paguem pelas peças que falharam.</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  )}
                  {item.id === 'lucro' && (
                    <div className="relative group/tooltip flex items-center">
                      <HelpCircle size={12} className="text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-[10px] leading-relaxed text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100] pointer-events-none font-normal">
                        <p className="font-black text-purple-400 uppercase mb-1">Lucro Líquido</p>
                        <p>O valor real que sobra para você após descontar todos os custos de produção e taxas de venda.</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  )}
                  {item.id === 'taxas' && (
                    <button 
                      onClick={() => setActiveDetail('taxas')} 
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[8px] font-black uppercase border border-slate-600 transition-colors"
                    >
                      Como calculamos? <ChevronRight size={8} />
                    </button>
                  )}
                </div>
                <span className="font-black text-white">{formatBRL(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ColorPatternFooter = () => (
    <footer className="mt-20 border-t border-slate-700 pt-10 pb-20 no-print">
      <div className="flex items-center gap-3 mb-8">
        <Palette className="text-blue-500" size={24} />
        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Padrão de Cores Utilizado</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { name: 'Slate-950 (Background)', hex: COLORS.bg },
          { name: 'Slate-900 (Cards)', hex: COLORS.card },
          { name: 'Slate-800 (Fields)', hex: COLORS.surface },
          { name: 'Slate-700 (Borders)', hex: COLORS.border },
          { name: 'Blue-600 (Primary)', hex: COLORS.primary },
          { name: 'Emerald-600 (Success)', hex: COLORS.success },
          { name: 'Amber-500 (Warning)', hex: COLORS.warning },
          { name: 'Violet-500 (Info)', hex: COLORS.info },
          { name: 'Slate-50 (Texto Primário)', hex: COLORS.textPrimary },
          { name: 'Slate-400 (Texto Secundário)', hex: COLORS.textSecondary },
        ].map((c) => (
          <div key={c.hex} className="bg-slate-900 border border-slate-700 p-4 rounded-2xl flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-slate-700" style={{ backgroundColor: c.hex }}></div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{c.name}</p>
              <code className="text-sm font-mono text-blue-400 font-bold">{c.hex.toUpperCase()}</code>
            </div>
          </div>
        ))}
      </div>
    </footer>
  );

  /**
   * Render the printable version.
   * Instead of 'hidden', we use styling to keep it in the DOM but away from the main view
   * so html2pdf can see it.
   */
  const renderPrintableInvoice = () => {
    if (!state.results) return null;

    const materialCostPerGram = state.inputs.pricePerKilo / 1000;
    const energyCostPerHour = (state.inputs.powerConsumptionWatts / 1000) * state.inputs.energyCostKwh;

    return (
      <div 
        id="pdf-report" 
        className="print:block p-10 font-sans text-black max-w-[800px] mx-auto bg-white border border-slate-300"
        style={{ 
            position: isExporting ? 'static' : 'absolute', 
            top: '-10000px', 
            left: '-10000px',
            backgroundColor: 'white'
        }}
      >
        {/* Fix for html2pdf/html2canvas oklch error */}
        <style dangerouslySetInnerHTML={{ __html: `
          #pdf-report { color: #000000 !important; background-color: #ffffff !important; font-family: sans-serif !important; }
          #pdf-report * { border-color: #cbd5e1 !important; }
          #pdf-report .text-black { color: #000000 !important; }
          #pdf-report .text-white { color: #ffffff !important; }
          #pdf-report .text-blue-600 { color: #2563eb !important; }
          #pdf-report .bg-blue-600 { background-color: #2563eb !important; }
          #pdf-report .border-blue-600 { border-color: #2563eb !important; }
          #pdf-report .text-slate-600 { color: #475569 !important; }
          #pdf-report .text-slate-500 { color: #64748b !important; }
          #pdf-report .text-slate-400 { color: #94a3b8 !important; }
          #pdf-report .text-slate-300 { color: #cbd5e1 !important; }
          #pdf-report .bg-slate-50 { background-color: #f8fafc !important; }
          #pdf-report .bg-slate-100 { background-color: #f1f5f9 !important; }
          #pdf-report .text-slate-900 { color: #0f172a !important; }
          #pdf-report .text-slate-800 { color: #1e293b !important; }
          #pdf-report .text-slate-700 { color: #334155 !important; }
          #pdf-report .text-red-500 { color: #ef4444 !important; }
          #pdf-report .text-red-600 { color: #dc2626 !important; }
          #pdf-report .bg-red-50 { background-color: #fef2f2 !important; }
          #pdf-report .bg-emerald-50 { background-color: #ecfdf5 !important; }
          #pdf-report .text-emerald-600 { color: #059669 !important; }
          #pdf-report .bg-slate-900 { background-color: #0f172a !important; }
          #pdf-report .border-slate-300 { border-color: #cbd5e1 !important; }
          #pdf-report .border-slate-200 { border-color: #e2e8f0 !important; }
          #pdf-report .border-slate-100 { border-color: #f1f5f9 !important; }
          #pdf-report .border-red-100 { border-color: #fee2e2 !important; }
          #pdf-report .border-emerald-100 { border-color: #d1fae5 !important; }
          #pdf-report .bg-slate-50\\/50 { background-color: #f8fafc !important; }
          #pdf-report .bg-slate-50\\/30 { background-color: #f8fafc !important; }
          #pdf-report .bg-white\\/10 { background-color: #ffffff !important; }
          #pdf-report .bg-white\\/20 { background-color: #ffffff !important; }
          #pdf-report .bg-white { background-color: #ffffff !important; }
          #pdf-report .border-b-4 { border-bottom-width: 4px !important; }
          #pdf-report .border-t-4 { border-top-width: 4px !important; }
          #pdf-report .shadow-md { box-shadow: none !important; }
        ` }} />
        {/* Cabeçalho do Relatório */}
        <div className="flex justify-between items-start mb-8 border-b-4 border-blue-600 pb-6">
          <div>
            <h1 className="text-4xl font-black text-blue-600 uppercase tracking-tight">RELATÓRIO TÉCNICO DE PRECIFICAÇÃO 3D</h1>
            <p className="text-slate-600 font-bold uppercase text-xs tracking-widest mt-1">Snapshot Detalhado do Orçamento</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento ID</p>
            <p className="text-sm font-mono font-bold">#{Date.now().toString().slice(-6)}</p>
            <p className="text-xs font-bold mt-1">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>

        {/* Resumo do Projeto */}
        <div className="mb-8 grid grid-cols-2 gap-6">
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DADOS DO PROJETO</p>
            <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4">{state.inputs.productName}</h2>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Total de Partes</p>
                <p className="text-lg font-black text-slate-800">{state.inputs.parts.length} un</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Custo Médio/un</p>
                <p className="text-lg font-black text-slate-800">{formatBRL(state.results.finalSellingPrice / state.inputs.parts.length)}</p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-center">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Peso Total</span>
                <span className="text-lg font-black text-blue-600">{state.results.totalWeight}g</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Tempo Total</span>
                <span className="text-lg font-black text-blue-600">{state.results.totalTime.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Falha Aplicada</span>
                <span className="text-lg font-black text-red-500">{state.inputs.failureRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Parâmetros de Entrada (DADOS DE ENTRADA) */}
        <div className="mb-8">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
            <Settings2 size={14} /> PARÂMETROS TÉCNICOS DE ENTRADA (BASE)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">MATERIAL</p>
              <p className="text-xs font-bold">Filamento: {formatBRL(state.inputs.pricePerKilo)}/kg</p>
              <p className="text-[10px] font-medium text-slate-500">Custo Unitário: {formatBRL(materialCostPerGram)}/g</p>
            </div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">ENERGIA</p>
              <p className="text-xs font-bold">Tarifa: {formatBRL(state.inputs.energyCostKwh)}/kWh</p>
              <p className="text-[10px] font-medium text-slate-500">Máquina: {state.inputs.powerConsumptionWatts}W ({formatBRL(energyCostPerHour)}/h)</p>
            </div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">VENDA</p>
              <p className="text-xs font-bold">Plataforma: {state.selectedPlatform}</p>
              <p className="text-[10px] font-medium text-slate-500">Taxa: {state.inputs.platformPercentage}% + {formatBRL(state.inputs.platformFixedFee)}</p>
            </div>
          </div>
        </div>

        {/* Detalhamento de Peças */}
        <div className="mb-8">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
            <Layers size={14} /> DETALHAMENTO DAS PARTES
          </h3>
          <table className="w-full text-xs">
            <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
              <tr>
                <th className="p-2 text-left w-8">ID</th>
                <th className="p-2 text-left">DESCRIÇÃO DA PARTE</th>
                <th className="p-2 text-right">PESO (g)</th>
                <th className="p-2 text-right">TEMPO (h)</th>
                <th className="p-2 text-right">ESTIMATIVA CUSTO BASE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 border border-slate-100">
              {state.inputs.parts.map((p, i) => {
                const partCost = (p.weightGrams * materialCostPerGram) + (p.printTimeHours * energyCostPerHour);
                return (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                    <td className="p-2 font-bold text-slate-300">{i + 1}</td>
                    <td className="p-2 font-bold text-slate-700">{p.name}</td>
                    <td className="p-2 text-right tabular-nums">{p.weightGrams}g</td>
                    <td className="p-2 text-right tabular-nums">{p.printTimeHours}h</td>
                    <td className="p-2 text-right tabular-nums font-bold">{formatBRL(partCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Resumo Financeiro (DADOS CALCULADOS) */}
        <div className="mb-10">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
            <Coins size={14} /> COMPOSIÇÃO FINANCEIRA E RESULTADOS
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 uppercase text-[9px]">Subtotal Material</span>
                </div>
                <span className="font-bold tabular-nums">{formatBRL(state.results.materialCost)}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500 uppercase text-[9px]">Subtotal Energia</span>
                <span className="font-bold tabular-nums">{formatBRL(state.results.energyCost)}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500 uppercase text-[9px]">Embalagem e Extras</span>
                <span className="font-bold tabular-nums">{formatBRL(state.inputs.packagingCost + state.inputs.extraCosts)}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-red-50 border border-red-100">
                <span className="font-black text-red-600 uppercase text-[9px]">Ajuste por Falha ({state.inputs.failureRate}%)</span>
                <span className="font-black tabular-nums text-red-600">+{formatBRL(state.results.costWithFailure - state.results.baseProductionCost)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-start text-xs p-2 rounded-lg bg-slate-900 text-white shadow-md">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black uppercase text-[9px] tracking-widest">Custo de Produção Total</span>
                    <button onClick={() => setActiveDetail('producao')} className="no-print bg-white/10 hover:bg-white/20 px-1 rounded text-[7px] border border-white/20 transition-colors uppercase font-black">Detalhes</button>
                  </div>
                  <p className="text-[6px] text-slate-400 font-medium uppercase tracking-tighter opacity-80 mt-0.5">
                    (Material + Energia + Embalagem + Extras + Falhas)
                  </p>
                </div>
                <span className="font-black tabular-nums text-lg">{formatBRL(state.results.costWithFailure)}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="font-black text-emerald-600 uppercase text-[9px]">Margem de Lucro ({state.inputs.profitMargin}%)</span>
                <span className="font-black tabular-nums text-emerald-600">+{formatBRL(state.results.profitAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400 uppercase text-[9px]">Taxas do Marketplace</span>
                  <button onClick={() => setActiveDetail('taxas')} className="no-print bg-slate-200 hover:bg-slate-300 px-1 rounded text-[7px] border border-slate-400 transition-colors uppercase font-black text-slate-600">Detalhes</button>
                </div>
                <span className="font-bold tabular-nums text-slate-400">{formatBRL(state.results.platformFeeAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do PDF - PREÇO FINAL */}
        <div className="flex flex-col items-end gap-2 border-t-4 border-blue-600 pt-8 mt-auto">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">VALOR FINAL RECOMENDADO</p>
          <div className="text-6xl font-black text-blue-600 tabular-nums tracking-tighter">
            {formatBRL(state.results.finalSellingPrice)}
          </div>
          <div className="mt-8 text-[8px] text-slate-400 font-bold text-right uppercase tracking-[0.2em] max-w-sm leading-relaxed">
            * Este relatório utiliza fórmulas de cálculo profissionais para garantir a viabilidade comercial do seu serviço de impressão 3D. Os valores de entrada foram fornecidos pelo usuário.
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {renderPrintableInvoice()}
      
      <ConfirmationModal 
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmReset}
        title="Resetar Valores?"
        message="Isso irá apagar todos os dados atuais e restaurar os valores padrão de fábrica. Esta ação não pode ser desfeita."
      />
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50 no-print shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Calculator size={20} /></div>
            <h1 className="text-xl font-black text-white tracking-tighter">CALC<span className="text-blue-500">3D</span></h1>
          </div>
          <div className="flex items-center gap-4">
            {state.results && (
              <div className="flex gap-2">
                <button 
                  onClick={handleDownloadPDF} 
                  disabled={isExporting}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase transition-all shadow-lg shadow-emerald-900 active:scale-95 disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} 
                  Relatório PDF
                </button>
                <button 
                  onClick={() => window.print()} 
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase transition-all shadow-lg shadow-blue-900 active:scale-95"
                >
                  <Printer size={16} /> Imprimir
                </button>
              </div>
            )}
            <button onClick={handleReset} className="p-2 text-slate-500 hover:text-white transition-all"><RotateCcw size={20} /></button>
          </div>
        </div>
      </header>

      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500">
            <div className="bg-white/20 p-1.5 rounded-lg">{toastMessage.icon}</div>
            <span className="text-sm font-black uppercase tracking-wider">{toastMessage.title}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 pb-32 lg:pb-8 no-print">
        <div className="hidden lg:grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">{renderProductionSections()}{renderSalesSections()}</div>
          <div className="col-span-1">{renderResultSidebar()}</div>
        </div>
        <div className="lg:hidden">
          <Routes>
            <Route path="/" element={renderProductionSections()} />
            <Route path="/vendas" element={renderSalesSections()} />
            <Route path="/resultado" element={renderResultSidebar()} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <ColorPatternFooter />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-3 lg:hidden z-50 shadow-2xl no-print">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {state.results && location.pathname === '/resultado' && (
             <div className="flex gap-2 px-2 pb-1">
                <button onClick={handleDownloadPDF} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase active:scale-95">
                  <FileDown size={14} /> Baixar PDF
                </button>
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase active:scale-95">
                  <Printer size={14} /> Imprimir
                </button>
             </div>
          )}
          <div className="flex justify-around">
            <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-blue-500 scale-110' : 'text-slate-500'}`}><Printer size={22} /><span className="text-[10px] font-black uppercase">Projeto</span></NavLink>
            <NavLink to="/vendas" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-emerald-500 scale-110' : 'text-slate-500'}`}><Wallet size={22} /><span className="text-[10px] font-black uppercase">Vendas</span></NavLink>
            <NavLink to="/resultado" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 transition-all relative ${isActive ? 'text-blue-500 scale-110' : 'text-slate-500'}`}>
              <LayoutDashboard size={22} />
              {state.isDirty && state.results && (
                <span className="absolute top-2 right-4 w-2 h-2 bg-amber-500 rounded-full border border-slate-900 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              )}
              <span className="text-[10px] font-black uppercase">Resumo</span>
            </NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;
