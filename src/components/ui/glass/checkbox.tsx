'use client';
import { Check } from 'lucide-react';


interface GlassCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function GlassCheckbox({ checked, onChange }: GlassCheckboxProps) {
  return (
    <div
      className={`relative w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${
        checked ? 'border backdrop-blur-sm' : 'bg-white/10 border border-white/20 backdrop-blur-sm'
      }`}
      style={
        checked
          ? {
              background: 'linear-gradient(to bottom right, var(--primary), var(--primary))',
              borderColor: 'var(--primary)',
            }
          : undefined
      }
      onClick={() => onChange(!checked)}
    >
      {checked && (
        <Check className="w-2.5 h-2.5 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      )}
    </div>
  );
}

export default GlassCheckbox;
