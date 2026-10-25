import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Both palettes come from the Figma boards:
 *   Cactus flower: #E491A6  #845763  #92E4BA  #90C67F
 *   Lotus garden:  #ADEBB3  #FF857A  #EBAEE6  #6B403C
 * Each is applied on a dark background derived from its darkest tone.
 * The actual CSS variables live in styles.css under [data-theme="..."].
 */
export type ThemeName = 'cactus' | 'lotus';

export interface Palette {
  name: ThemeName;
  label: string;
  swatches: string[];
  /** Colors a group can be tagged with. */
  groupColors: string[];
}

export const PALETTES: Record<ThemeName, Palette> = {
  cactus: {
    name: 'cactus',
    label: 'Cactus flower',
    swatches: ['#E491A6', '#845763', '#92E4BA', '#90C67F'],
    groupColors: ['#E491A6', '#92E4BA', '#90C67F', '#B97C8D'],
  },
  lotus: {
    name: 'lotus',
    label: 'Lotus garden',
    swatches: ['#ADEBB3', '#FF857A', '#EBAEE6', '#6B403C'],
    groupColors: ['#FF857A', '#EBAEE6', '#ADEBB3', '#B07A74'],
  },
};

export const THEME_ORDER: ThemeName[] = ['cactus', 'lotus'];

const KEY = 'rendezvoo.theme';

function loadTheme(): ThemeName {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'cactus' || v === 'lotus') return v;
  } catch {
    /* storage can be blocked; fall through */
  }
  return 'cactus';
}

interface Ctx {
  themeName: ThemeName;
  setThemeName: (t: ThemeName) => void;
  palette: Palette;
}

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(loadTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = themeName;
    try {
      localStorage.setItem(KEY, themeName);
    } catch {
      /* ignore */
    }
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName, palette: PALETTES[themeName] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
