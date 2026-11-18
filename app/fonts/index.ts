import localFont from 'next/font/local';

// The site's typefaces, all under the SIL Open Font License (OFL.txt beside each). Nothing else is loaded.
// The heading font (headings, display text, the big lettering on the drawn boards) is --font-heading: to try another,
// change only the `heading` font below. Plus Jakarta Sans covers everything else (body text, forms, buttons, labels,
// readouts, the opening's terminal). The .woff2 files are compressed copies of the downloaded .ttf files.

export const jakarta = localFont({
  src: [
    { path: './Plus_Jakarta_Sans/PlusJakartaSans-VariableFont_wght.woff2', weight: '200 800', style: 'normal' },
    { path: './Plus_Jakarta_Sans/PlusJakartaSans-Italic-VariableFont_wght.woff2', weight: '200 800', style: 'italic' },
  ],
  variable: '--font-jakarta',
  display: 'swap',
});

// Bricolage Grotesque: one variable file for weights 200-800 (its optical size follows the text size on its own).
// A smaller copy of the download: Latin characters only, width fixed at normal (the site never narrows it). No italic.
export const heading = localFont({
  src: [{ path: './Bricolage_Grotesque/BricolageGrotesque-Variable.woff2', weight: '200 800', style: 'normal' }],
  variable: '--font-heading',
  display: 'swap',
});

/** All the fonts' CSS variables, for the <html> element */
export const fontVariables = `${jakarta.variable} ${heading.variable}`;
