const fs = require('fs');
const { PurgeCSS } = require('purgecss');

async function main() {
  const result = await new PurgeCSS().purge({
    content: ['docs/index.html'],
    css: ['node_modules/rippleui/dist/css/styles.css'],
    safelist: { standard: [/^btn/, /^badge/, /^chip/, /data-theme/] },
  });
  fs.mkdirSync('docs/vendor', { recursive: true });
  fs.writeFileSync('docs/vendor/rippleui.css', result[0].css);
  console.log('rippleui.css written', result[0].css.length, 'bytes');
}
main().catch(e => { console.error(e); process.exit(1); });
