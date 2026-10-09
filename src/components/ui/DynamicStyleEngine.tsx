import React, { useMemo } from 'react';

export function DynamicStyleEngine({ overrides }: { overrides?: Record<string, React.CSSProperties | Record<string, string>> }) {
  const cssString = useMemo(() => {
    if (!overrides) return '';
    
    let css = '';
    for (const [designId, styleObj] of Object.entries(overrides)) {
      if (!styleObj || Object.keys(styleObj).length === 0) continue;
      
      css += `[data-design-id="${designId}"] {\n`;
      for (const [key, value] of Object.entries(styleObj)) {
        if (!value && value !== 0) continue;
        
        if (key === 'customCss') {
          // Parse or directly inject raw CSS block lines
          const rawLines = String(value).split(';').map(l => l.trim()).filter(Boolean);
          for (const rawLine of rawLines) {
            if (rawLine.includes(':')) {
              const cleanLine = rawLine.replace(/!important/g, '').trim();
              css += `  ${cleanLine} !important;\n`;
            }
          }
          continue;
        }

        // Convert camelCase to kebab-case
        const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        css += `  ${kebabKey}: ${value} !important;\n`;
        
        // Handle webkit prefixes for backdrop-filter
        if (kebabKey === 'backdrop-filter') {
          css += `  -webkit-backdrop-filter: ${value} !important;\n`;
        }
      }
      css += `}\n\n`;
    }
    return css;
  }, [overrides]);

  if (!cssString) return null;

  return (
    <style id="local-overrides">
      {cssString}
    </style>
  );
}

