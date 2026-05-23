'use client';

import { palettes } from '@/lib/color-palettes';
import { useTheme } from './ThemeProvider';

export default function PaletteSelector() {
  const { palette, setPalette } = useTheme();

  return (
    <div className="palette-selector">
      {Object.values(palettes).map((p) => (
        <button
          key={p.name}
          className={`palette-option ${palette === p.name ? 'active' : ''}`}
          onClick={() => setPalette(p.name)}
        >
          <div className="palette-swatch">
            {p.chart.slice(0, 4).map((color, i) => (
              <span key={i} style={{ backgroundColor: color }} />
            ))}
          </div>
          <span style={{ fontSize: '10px' }}>{p.label}</span>
        </button>
      ))}
    </div>
  );
}
