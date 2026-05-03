// AnEntrypoint design-system theme for flatspace.
// Renders site chrome via anentrypoint-design SDK using REAL SDK components.
// theme.mjs emits HTML shell + bootstrap that consumes YAML baked into <script id="__site__">.
// SDK provides ALL styling via installStyles(); plus a tiny inline body-margin reset.

const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const escapeJson = (obj) => JSON.stringify(obj)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  .replace(new RegExp('\\u2028', 'g'), '\\u2028').replace(new RegExp('\\u2029', 'g'), '\\u2029');

const SDK_URL = 'https://unpkg.com/anentrypoint-design@latest/dist/247420.js';

const clientScript = `
import { h, applyDiff, installStyles, components as C } from 'anentrypoint-design';
installStyles();
document.documentElement.classList.add('ds-247420');

const data = JSON.parse(document.getElementById('__site__').textContent);
const { site, nav, home } = data;

function Hero() {
  if (!home || !home.hero) return null;
  return C.Panel({
    style: 'margin:8px',
    children: h('div', { style: 'padding:24px 22px' },
      C.Heading({ level: 1, style: 'margin:0 0 8px 0', children: home.hero.heading || site.title }),
      home.hero.subheading ? C.Lede({ children: home.hero.subheading }) : null,
      home.hero.body ? h('p', { style: 'margin:8px 0 16px 0;color:var(--panel-text-2);max-width:64ch' }, home.hero.body) : null,
      (home.hero.badges && home.hero.badges.length) ? h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px 0' },
        ...home.hero.badges.map((b, i) => C.Chip({ key: 'b' + i, children: b.label }))
      ) : null,
      (home.hero.ctas && home.hero.ctas.length) ? h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
        ...home.hero.ctas.map((c, i) => C.Btn({ key: 'c' + i, href: c.href, primary: c.primary, children: c.label }))
      ) : null
    )
  });
}

function Features() {
  if (!home || !home.features || !home.features.items || !home.features.items.length) return null;
  const rows = home.features.items.map((it, i) => C.RowLink({
    key: 'f' + i,
    code: String(i + 1).padStart(2, '0'),
    title: it.name,
    sub: it.desc || '',
    meta: it.meta || '',
    href: it.href || '#'
  }));
  return C.Panel({
    title: home.features.heading || 'features',
    style: 'margin:8px',
    children: rows
  });
}

function Quickstart() {
  if (!home || !home.quickstart || !home.quickstart.lines || !home.quickstart.lines.length) return null;
  const lineNodes = home.quickstart.lines.map((l, i) => {
    const isComment = l.kind === 'cmt';
    return h('div', { key: 'q' + i, class: 'cli' },
      h('span', { class: 'prompt' }, isComment ? '#' : '$'),
      h('span', { class: 'cmd' }, l.text)
    );
  });
  return C.Panel({
    title: home.quickstart.heading || 'quick start',
    style: 'margin:8px',
    children: h('div', { style: 'padding:16px 22px' }, ...lineNodes)
  });
}

function Chunks() {
  if (!home || !home.chunks || !home.chunks.groups || !home.chunks.groups.length) return null;
  const groups = home.chunks.groups.map((g, gi) => h('div', { key: 'cg' + gi, style: 'padding:14px 22px 6px 22px' },
    C.Heading({ level: 3, style: 'margin:0 0 8px 0;font-size:0.85rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--panel-text-2)', children: g.heading }),
    h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' },
      ...(g.items || []).map((t, ti) => C.Chip({ key: 'c' + gi + '-' + ti, children: t }))
    )
  ));
  const intro = home.chunks.intro
    ? h('p', { style: 'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.chunks.intro)
    : null;
  return C.Panel({
    title: home.chunks.heading || 'chunk types',
    style: 'margin:8px',
    children: h('div', {}, intro, ...groups, h('div', { style: 'height:14px' }))
  });
}

function Operators() {
  if (!home || !home.operators || !home.operators.items || !home.operators.items.length) return null;
  const intro = home.operators.intro
    ? h('p', { style: 'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.operators.intro)
    : null;
  const rows = home.operators.items.map((it, i) => C.RowLink({
    key: 'op' + i,
    code: String(i + 1).padStart(2, '0'),
    title: it.name,
    sub: it.desc || ''
  }));
  return C.Panel({
    title: home.operators.heading || 'operators',
    style: 'margin:8px',
    children: h('div', {}, intro, ...rows)
  });
}

function Usage() {
  if (!home || !home.usage || !home.usage.code) return null;
  const intro = home.usage.intro
    ? h('p', { style: 'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.usage.intro)
    : null;
  return C.Panel({
    title: home.usage.heading || 'usage',
    style: 'margin:8px',
    children: h('div', {}, intro,
      h('pre', { style: 'margin:14px 22px 18px 22px;padding:14px 16px;background:var(--panel-bg-2,#161b22);border-radius:10px;overflow:auto;font-family:var(--ff-mono,ui-monospace,monospace);font-size:0.85rem;line-height:1.55;color:var(--panel-text)' }, home.usage.code)
    )
  });
}

const RAIL = { kit:'rail-green', deck:'rail-sun', preview:'rail-purple', doc:'rail-mascot', external:'rail-sky', flame:'rail-flame' };
const DOT  = { kit:'green', deck:'sun', preview:'purple', doc:'mascot', external:'sky', flame:'flame' };

function Problem() {
  if (!home || !home.problem || !home.problem.items) return null;
  const intro = home.problem.intro
    ? h('p', { style:'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.problem.intro)
    : null;
  const rows = home.problem.items.map((it, i) => h('div', {
    key:'pr'+i,
    class:'row '+(RAIL[it.cat] || 'rail-flame'),
    style:'display:flex;align-items:flex-start;gap:14px;padding:12px 22px;margin:0 14px;border-radius:14px;background:var(--panel-2);margin-bottom:8px'
  },
    h('span', { style:'font-family:var(--ff-mono);font-size:1.1rem;line-height:1.2;color:var(--flame,#FF6B4A);flex:0 0 auto' }, it.glyph || '◌'),
    h('div', { style:'flex:1' },
      h('div', { style:'font-weight:600;font-size:0.95rem;margin-bottom:2px' }, it.name),
      h('div', { style:'color:var(--panel-text-2);font-size:0.88rem;line-height:1.5' }, it.desc)
    )
  ));
  return C.Panel({ title: home.problem.heading || 'the problem', style:'margin:8px',
    children: h('div', {}, intro, h('div', { style:'height:14px' }), ...rows, h('div', { style:'height:8px' }))
  });
}

function Compare() {
  if (!home || !home.compare || !home.compare.before || !home.compare.after) return null;
  const intro = home.compare.intro
    ? h('p', { style:'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.compare.intro)
    : null;
  const codeBlock = (label, code, accent) => h('div', { style:'flex:1;min-width:280px;padding:12px' },
    h('div', { style:'font-family:var(--ff-mono);font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase;color:'+accent+';margin-bottom:6px' }, label),
    h('pre', { style:'margin:0;padding:14px 16px;background:var(--panel-2);border-radius:12px;overflow:auto;font-family:var(--ff-mono);font-size:0.8rem;line-height:1.55;color:var(--panel-text);box-shadow:inset 4px 0 0 '+accent }, code)
  );
  return C.Panel({ title: home.compare.heading || 'before / after', style:'margin:8px',
    children: h('div', {}, intro,
      h('div', { style:'display:flex;flex-wrap:wrap;gap:8px;padding:10px 12px 16px 12px' },
        codeBlock(home.compare.before.label || 'before', home.compare.before.code, 'var(--flame,#FF6B4A)'),
        codeBlock(home.compare.after.label  || 'after',  home.compare.after.code,  'var(--green,#3F8A4A)')
      )
    )
  });
}

function When() {
  if (!home || !home.when || !home.when.items) return null;
  const intro = home.when.intro
    ? h('p', { style:'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.when.intro)
    : null;
  const rows = home.when.items.map((it, i) => h('div', {
    key:'wn'+i,
    class:'row '+(RAIL[it.cat] || 'rail-green'),
    style:'display:flex;align-items:center;gap:14px;padding:12px 18px;margin:0 14px 8px 14px;border-radius:14px;background:var(--panel-1)'
  },
    h('span', { class:'dot '+(DOT[it.cat] || 'green'), style:'width:10px;height:10px;border-radius:999px;background:currentColor;flex:0 0 auto;color:var(--'+(DOT[it.cat]||'green')+',#3F8A4A)' }),
    h('div', { style:'flex:1' },
      h('div', { style:'font-weight:600;font-size:0.95rem;margin-bottom:2px' }, it.name),
      h('div', { style:'color:var(--panel-text-2);font-size:0.88rem;line-height:1.5' }, it.desc)
    ),
    it.meta ? h('span', { style:'font-family:var(--ff-mono);font-size:0.78rem;color:var(--panel-text-3,#888);letter-spacing:0.04em' }, it.meta) : null
  ));
  return C.Panel({ title: home.when.heading || 'when to use', style:'margin:8px',
    children: h('div', {}, intro, h('div', { style:'height:14px' }), ...rows, h('div', { style:'height:8px' }))
  });
}

function How() {
  if (!home || !home.how || !home.how.steps) return null;
  const intro = home.how.intro
    ? h('p', { style:'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.how.intro)
    : null;
  const steps = home.how.steps.map((s, i) => h('div', {
    key:'hw'+i,
    style:'flex:1;min-width:240px;padding:18px 18px;margin:6px;border-radius:16px;background:var(--panel-1);box-shadow:inset 4px 0 0 var(--green,#3F8A4A)'
  },
    h('div', { style:'display:flex;align-items:baseline;gap:10px;margin-bottom:8px' },
      h('span', { style:'font-family:var(--ff-mono);font-size:0.85rem;color:var(--panel-text-3,#888);letter-spacing:0.06em' }, s.rank),
      h('span', { style:'font-family:var(--ff-mono);font-size:1.15rem;color:var(--green,#3F8A4A)' }, s.glyph || '●'),
      h('span', { style:'font-weight:700;font-size:1.05rem' }, s.name)
    ),
    h('div', { style:'color:var(--panel-text-2);font-size:0.9rem;line-height:1.55' }, s.desc)
  ));
  return C.Panel({ title: home.how.heading || 'how it works', style:'margin:8px',
    children: h('div', {}, intro,
      h('div', { style:'display:flex;flex-wrap:wrap;padding:8px 8px 14px 8px' }, ...steps)
    )
  });
}

function Recipes() {
  if (!home || !home.recipes || !home.recipes.items) return null;
  const intro = home.recipes.intro
    ? h('p', { style:'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.recipes.intro)
    : null;
  const cards = home.recipes.items.map((r, i) => {
    const accent = 'var(--'+(DOT[r.cat]||'green')+',#3F8A4A)';
    return h('div', { key:'rc'+i, style:'padding:14px 18px;margin:8px 14px;border-radius:16px;background:var(--panel-1);box-shadow:inset 4px 0 0 '+accent },
      h('div', { style:'display:flex;align-items:baseline;gap:10px;margin-bottom:4px' },
        h('span', { class:'dot', style:'width:8px;height:8px;border-radius:999px;background:'+accent+';display:inline-block' }),
        h('span', { style:'font-weight:700;font-size:0.98rem' }, r.name)
      ),
      h('div', { style:'color:var(--panel-text-2);font-size:0.88rem;line-height:1.5;margin-bottom:10px' }, r.desc),
      h('pre', { style:'margin:0;padding:12px 14px;background:var(--panel-2);border-radius:10px;overflow:auto;font-family:var(--ff-mono);font-size:0.78rem;line-height:1.55;color:var(--panel-text)' }, r.code)
    );
  });
  return C.Panel({ title: home.recipes.heading || 'recipes', style:'margin:8px',
    children: h('div', {}, intro, h('div', { style:'height:8px' }), ...cards, h('div', { style:'height:8px' }))
  });
}

function Audience() {
  if (!home || !home.audience || !home.audience.items) return null;
  const intro = home.audience.intro
    ? h('p', { style:'padding:16px 22px 0 22px;margin:0;color:var(--panel-text-2);max-width:72ch' }, home.audience.intro)
    : null;
  const rows = home.audience.items.map((it, i) => h('div', {
    key:'au'+i,
    class:'row '+(RAIL[it.cat] || 'rail-green'),
    style:'display:flex;align-items:flex-start;gap:14px;padding:14px 18px;margin:0 14px 8px 14px;border-radius:14px;background:var(--panel-1)'
  },
    h('div', { style:'flex:1' },
      h('div', { style:'font-weight:600;font-size:0.95rem;margin-bottom:3px' }, it.name),
      h('div', { style:'color:var(--panel-text-2);font-size:0.88rem;line-height:1.55' }, it.desc)
    )
  ));
  return C.Panel({ title: home.audience.heading || 'who it is for', style:'margin:8px',
    children: h('div', {}, intro, h('div', { style:'height:14px' }), ...rows, h('div', { style:'height:8px' }))
  });
}

function Examples() {
  if (!home || !home.examples || !home.examples.items || !home.examples.items.length) return null;
  const rows = home.examples.items.map((it, i) => C.RowLink({
    key: 'e' + i,
    title: it.name,
    sub: it.desc || '',
    meta: it.cta || 'open',
    href: it.href || '#'
  }));
  return C.Panel({
    title: home.examples.heading || 'examples',
    style: 'margin:8px',
    children: rows
  });
}

function Footer() {
  return h('footer', { class: 'app-status' },
    h('span', { class: 'item' }, 'styled with '),
    h('a', { class: 'item', href: 'https://anentrypoint.github.io/design/' }, 'anentrypoint-design'),
    h('span', { class: 'item' }, '·'),
    h('a', { class: 'item', href: 'https://247420.xyz' }, '247420.xyz'),
    h('span', { class: 'spread' }),
    site.repo ? h('a', { class: 'item', href: site.repo }, 'source ↗') : null
  );
}

const navItems = (nav && nav.links ? nav.links : []).map(l => [String(l.label || ''), l.href]);

const App = C.AppShell({
  topbar: C.Topbar({
    brand: '247420',
    leaf: site.title || '',
    items: navItems
  }),
  crumb: C.Crumb({
    trail: ['247420'],
    leaf: site.title || ''
  }),
  main: h('div', {},
    Hero(),
    Problem(),
    Compare(),
    When(),
    How(),
    Recipes(),
    Quickstart(),
    Usage(),
    Operators(),
    Audience(),
    Chunks(),
    Examples()
  ),
  status: Footer()
});

applyDiff(document.getElementById('app'), [App]);
`;

const html = ({ site, nav, home }) => `<!DOCTYPE html>
<html lang="en" class="ds-247420">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(site.title)}${site.tagline ? ' — ' + escapeHtml(site.tagline) : ''}</title>
  <meta name="description" content="${escapeHtml(site.description || site.tagline || site.title)}" />
  <meta property="og:title" content="${escapeHtml(site.title)}" />
  <meta property="og:description" content="${escapeHtml(site.description || site.tagline || '')}" />
  <meta property="og:url" content="${escapeHtml(site.url || '')}" />
  <link rel="canonical" href="${escapeHtml(site.url || '')}" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E${encodeURIComponent(site.glyph || '◆')}%3C/text%3E%3C/svg%3E" />
  <script type="importmap">{"imports":{"anentrypoint-design":"${SDK_URL}"}}</script>
  <style>html,body{margin:0;padding:0}body{background:var(--app-bg,#FBF6EB);color:var(--ink,#1F1B16);font-family:var(--ff-ui,'Nunito',system-ui,sans-serif)}</style>
</head>
<body>
  <div id="app"></div>
  <script type="application/json" id="__site__">${escapeJson({ site, nav, home })}</script>
  <script type="module">${clientScript}</script>
</body>
</html>
`;

export default {
  render: async (ctx) => {
    const site = ctx.readGlobal('site') || {};
    const nav = ctx.readGlobal('navigation') || { links: [] };
    const homeDoc = ctx.read('pages').docs.find(p => p.id === 'home');
    if (!homeDoc) throw new Error('config/pages/home.yaml missing or has no id: home');

    return [{
      path: 'index.html',
      html: html({ site, nav, home: homeDoc })
    }];
  }
};
