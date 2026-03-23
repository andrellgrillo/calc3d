
import React from 'react';
import { HelpCircle } from 'lucide-react';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  tooltip?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 0.01,
  min = 0,
  tooltip
}) => {
  return (
    <div className="flex flex-col gap-1 w-full group">
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
          {label}
        </label>
        {tooltip && (
          <div className="relative flex items-center group/tooltip">
            <HelpCircle size={14} className="text-slate-600 hover:text-blue-400 cursor-help transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-[10px] leading-relaxed text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100] pointer-events-none">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-slate-500 text-sm font-semibold">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-slate-600 font-medium ${
            prefix ? 'pl-9' : 'pl-4'
          } ${suffix ? 'pr-9' : 'pr-4'}`}
        />
        {suffix && (
          <span className="absolute right-3 text-slate-500 text-sm font-semibold">{suffix}</span>
        )}
      </div>
    </div>
  );
};
