'use client';

interface GlassToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  title?: string;
}

function GlassToggle({ checked, onChange, label, title }: GlassToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer" title={title}>
      {label && (
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
      <div
        className="relative w-10 h-5 rounded-full transition-all duration-300"
        style={{
          background: checked
            ? 'linear-gradient(to right, var(--primary), var(--primary))'
            : 'rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </label>
  );
}

export default GlassToggle;
