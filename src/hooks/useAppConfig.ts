import { useState, useEffect } from 'react';

export function useAppConfig() {
  const [uiStyle, setUiStyle] = useState<'glass' | 'flat' | 'line-brown' | 'line-green'>(() => {
    return (localStorage.getItem('tavern_vault_style') as any) || 'flat';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('tavern_vault_theme') as 'light' | 'dark') || 'light';
  });
  const [flatTheme, setFlatTheme] = useState<string>(() => {
    return localStorage.getItem('tavern_vault_flat_theme') || 'wulan';
  });

  // Apply theme classes to document
  useEffect(() => {
    const isFlat = uiStyle === 'flat' || uiStyle === 'line-brown' || uiStyle === 'line-green' || !uiStyle;
    if (isFlat) {
      document.documentElement.classList.add('theme-flat');
      document.body.classList.add('theme-flat');
      document.documentElement.setAttribute('data-theme', flatTheme || 'wulan');
      document.body.setAttribute('data-theme', flatTheme || 'wulan');
    } else {
      document.documentElement.classList.remove('theme-flat');
      document.body.classList.remove('theme-flat');
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
  }, [uiStyle, theme, flatTheme]);

  return {
    uiStyle,
    setUiStyle,
    theme,
    setTheme,
    flatTheme,
    setFlatTheme,
  };
}
