import { mkdirSync, writeFileSync } from 'fs';
import { PurgeCSS } from 'purgecss';

const result = await new PurgeCSS().purge({
  content: ['docs/index.html'],
  css: ['node_modules/rippleui/dist/css/styles.css'],
  safelist: { standard: [/^btn/, /^badge/, /^chip/, /data-theme/] },
});
mkdirSync('docs/vendor', { recursive: true });
writeFileSync('docs/vendor/rippleui.css', result[0].css);
console.log('rippleui.css written', result[0].css.length, 'bytes');
