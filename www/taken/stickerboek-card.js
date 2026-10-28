/* Stickerboek card, versie 3 (los pakket): envelopjes openen en het stickeralbum per kind.
   Hoort bij de takenlijst (taken-card.js). Bestand: /config/www/stickerboek-card.js
   Gegevens: sensor.taken_status (/config/taken/status.json); openen via script.taken_envelop.
   Stickers: /config/www/stickers/<album>/<id>.png

   Op de eigen tablet van een kind:   type: custom:stickerboek-card
                                      persoon: Sam
   Zonder 'persoon' kun je wisselen tussen de kinderen. De taken-card toont deze kaart zelf
   in het scherm Stickerboek (dan moet dit bestand ook als bron geladen zijn). */

const PALET = ['#3f8f8a', '#c9805f', '#6b7fb3', '#a0628f', '#7a8f3f', '#b58a3a'];
const SB_STANDAARD = {
  persoon: null, // vaste persoon (eigen tablet); leeg = kiezen
  start: null, // eerste keuze als persoon leeg is
  sensor: 'sensor.taken_status',
  script: 'script.taken_envelop',
  samen_script: 'script.taken_samen_envelop',
  kleuren: {}, // { Sam: '#3f8f8a' }; zonder kleur krijgt elk kind er een uit PALET
  wacht_s: 15, // zo lang wachten op de nieuwe sticker
  ingebed: false, // true binnen het gezinsdashboard: geen eigen achtergrond en hoogte
};

const SB_CSS = `
:host{
  display:block;
  --sb-bg:var(--ha-card-background,var(--card-background-color));
  --sb-card:var(--ha-card-background,var(--card-background-color));
  --sb-line:var(--divider-color);
  --sb-ink:var(--primary-text-color);
  --sb-mut:var(--secondary-text-color);
  --sb-soft:var(--secondary-background-color);
  --sb-gold:var(--warning-color,#ff9800);
  --sb-acc:var(--primary-color);
}
.sb{font-family:var(--paper-font-body1_-_font-family);
.sb.los{background:var(--lovelace-background,var(--sb-bg));min-height:100vh;min-height:100dvh;padding:1.2em 1.4em;font-size:clamp(13px,min(1.6vw,2.6dvh),20px)}
.serif{
  font-family:var(--paper-font-headline_-_font-family);
  font-weight:400;
}
.kop{display:flex;flex-wrap:wrap;align-items:center;gap:.8em 1.4em;margin-bottom:1em}
.naam{font-size:2em;line-height:1.05}.naam small{display:block;font-family:'DM Sans',sans-serif;font-size:.42em;color:var(--sb-mut);margin-top:.25em;letter-spacing:.02em}
.wissel{display:flex;gap:.5em;margin-left:auto}
.pil{min-height:44px;border:0;border-radius:999px;background:var(--sb-card);padding:0 1.2em;cursor:pointer;font-weight:500}
.pil.on{background:var(--kc);color:#fff}
.lay{display:grid;grid-template-columns:minmax(14em,1fr) 2.4fr;gap:1.2em;align-items:start}
.kaart{
  background:var(--ha-card-background,var(--card-background-color));
  border-radius:var(--ha-card-border-radius,12px);
  border:1px solid var(--divider-color);
  box-shadow:var(--ha-card-box-shadow,none);
  padding:1.2em 1.3em;
}
.lbl{font-size:.72em;letter-spacing:.12em;text-transform:uppercase;color:var(--sb-mut);font-weight:600;margin-bottom:.8em;display:flex;justify-content:space-between;gap:.6em}
.voortgang{height:.8em;border-radius:999px;background:var(--sb-soft);overflow:hidden;margin:.5em 0 .3em}.voortgang i{display:block;height:100%;background:var(--kc);border-radius:999px}
.tag{font-size:.86em;color:var(--sb-mut)}
.env-knop{display:flex;flex-direction:column;align-items:center;gap:.6em;width:100%;border:0;background:var(--sb-soft);border-radius:1.3em;padding:1em .8em 1.1em;cursor:pointer;margin-top:1em}
.env-knop svg{width:min(9em,80%);height:auto;filter:drop-shadow(0 .3em .4em rgba(60,40,20,.18))}
.env-knop.heeft svg{animation:wiebel 2.4s ease-in-out infinite}
.env-knop b{font-size:1.15em;font-weight:500}
.env-knop:active{transform:scale(.97)}
.leeg-env{margin-top:1em;background:var(--sb-soft);border-radius:1.3em;padding:1em;text-align:center}
.sterren{display:flex;justify-content:space-between;margin-top:1em;padding-top:.8em;border-top:1px solid var(--sb-line)}
.sterren b{font-size:1.6em;font-weight:400}.st{color:var(--sb-gold)}
.album{position:relative;touch-action:pan-y}
.akop{display:flex;align-items:center;gap:.6em;margin-bottom:.9em}
.akop .serif{font-size:1.45em;flex:1;min-width:0}
.nav{width:2.8em;height:2.8em;border-radius:50%;border:0;background:var(--sb-soft);cursor:pointer;font-size:1.2em;display:flex;align-items:center;justify-content:center}
.nav:disabled{opacity:.3;cursor:default}
.raster{display:grid;grid-template-columns:repeat(3,1fr);gap:.8em}
.vak{position:relative;background:var(--sb-soft);border-radius:1.1em;padding:.6em .5em .7em;display:flex;flex-direction:column;align-items:center;gap:.3em;border:0;min-width:0}
button.vak{cursor:pointer}
.vak img{width:100%;max-width:11em;aspect-ratio:1;object-fit:contain;display:block}
.vak .sil{filter:brightness(0) saturate(0);opacity:.09}
.vak .vraag{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);font-family:'Fraunces',Georgia,serif;font-size:2.4em;color:var(--sb-mut);opacity:.45}
.vak span{font-size:.82em;color:var(--sb-mut);text-align:center;line-height:1.2;min-height:2.4em;display:flex;align-items:center}
.vak.heb span{color:var(--sb-ink)}.vak.zeldzaam.heb span{color:var(--sb-acc)}.vak.goud.heb span{color:#9a7420;font-weight:600}
.vak.samen.heb{background:linear-gradient(135deg,color-mix(in srgb,var(--k1) 22%,var(--sb-soft)),color-mix(in srgb,var(--k2) 22%,var(--sb-soft)))}.vak.samen.heb span{color:var(--sb-ink);font-weight:500}
.env-knop.samen{background:linear-gradient(135deg,color-mix(in srgb,var(--k1) 18%,var(--sb-soft)),color-mix(in srgb,var(--k2) 18%,var(--sb-soft)))}
.poot{display:flex;gap:.35em;justify-content:center;margin:.3em 0 .1em;font-size:1.3em}.poot i{font-style:normal;opacity:.22}.poot i.on{opacity:1}
.punt.hart{width:auto;height:auto;background:none;font-size:.8em;line-height:1;color:var(--sb-line);padding:0 .1em}.punt.hart.on{color:var(--kc);background:none}
.vak.goud.heb{background:linear-gradient(
    140deg,
    color-mix(in srgb,var(--warning-color) 25%, var(--sb-card)),
    color-mix(in srgb,var(--warning-color) 45%, var(--sb-card)),
    color-mix(in srgb,var(--warning-color) 20%, var(--sb-card))
  );}
.vak.nieuw{animation:nieuw 1.1s ease-in-out 4}
.punten{display:flex;justify-content:center;gap:.5em;margin-top:.9em}
.punt{width:.7em;height:.7em;border-radius:50%;background:var(--sb-line);border:0;padding:0;cursor:pointer}.punt.on{background:var(--kc)}
.ov{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(30,24,18,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.ov .doos{display:flex;flex-direction:column;align-items:center;gap:1em;text-align:center;color:var(--primary-text-color);padding:1em;max-width:92vw}
.ov .titel{font-family:'Fraunces',Georgia,serif;font-size:1.9em}
.ov .sub{opacity:.85}
.ov .knop{min-height:48px;border:0;border-radius:999px;background:var(--primary-color);color:var(--text-primary-color,#fff);padding:0 1.6em;font-weight:500;cursor:pointer;font-size:1.05em}
.ov .knop.licht{background:transparent;
  color:var(--primary-text-color);
  border:1px solid var(--divider-color);
  outline:none;}
.podium{position:relative;width:min(22em,78vw);aspect-ratio:1;display:flex;align-items:flex-end;justify-content:center;cursor:pointer}
.podium .env{position:absolute;bottom:4%;left:50%;width:84%;transform:translateX(-50%)}
.podium .env svg{width:100%;height:auto;display:block;overflow:visible}
.podium.wacht .env{animation:wiebel .9s ease-in-out infinite}
.podium.dicht .env{animation:stuiter 1.2s ease-in-out infinite}
.flap{transform-origin:50% 0;transform-box:fill-box;transition:transform .45s ease-in}
.podium.open .flap{transform:scaleY(-1)}
.podium.open .env{animation:zak .9s .5s ease-in forwards;pointer-events:none}
.straal,.vonk,.nieuwst{pointer-events:none}
.straal{position:absolute;inset:-12%;border-radius:50%;opacity:0;background:repeating-conic-gradient(rgba(255,226,150,.55) 0 10deg,transparent 10deg 24deg);-webkit-mask:radial-gradient(circle,#000 30%,transparent 68%);mask:radial-gradient(circle,#000 30%,transparent 68%)}
.podium.open .straal{animation:stralen 1s .7s forwards,draai 14s linear infinite}
.podium.open.goud .straal{background:repeating-conic-gradient(rgba(255,205,90,.85) 0 10deg,transparent 10deg 20deg)}
.nieuwst{position:absolute;left:50%;top:50%;width:78%;transform:translate(-50%,-10%) scale(.3);opacity:0;filter:drop-shadow(0 .6em 1em rgba(0,0,0,.35))}
.podium.open .nieuwst{animation:uit 1.1s .55s cubic-bezier(.2,1.4,.4,1) forwards}
.vonk{position:absolute;left:50%;top:45%;width:.7em;height:.7em;border-radius:2px;opacity:0}
.podium.open .vonk{animation:vonk 1.4s .8s ease-out forwards}
.groot{width:min(24em,80vw);aspect-ratio:1;object-fit:contain;filter:drop-shadow(0 .6em 1em rgba(0,0,0,.35))}
@keyframes wiebel{0%,100%{transform:translateX(-50%) rotate(0)}20%{transform:translateX(-50%) rotate(-5deg)}40%{transform:translateX(-50%) rotate(4deg)}60%{transform:translateX(-50%) rotate(-3deg)}80%{transform:translateX(-50%) rotate(2deg)}}
.env-knop.heeft svg{animation-name:wiebel2}
@keyframes wiebel2{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(-6deg)}82%{transform:rotate(5deg)}88%{transform:rotate(-3deg)}94%{transform:rotate(2deg)}}
@keyframes stuiter{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-6%)}}
@keyframes zak{to{transform:translateX(-50%) translateY(70%);opacity:0}}
@keyframes uit{0%{transform:translate(-50%,-10%) scale(.3) rotate(0);opacity:0}40%{opacity:1}100%{transform:translate(-50%,-62%) scale(1) rotate(-4deg);opacity:1}}
@keyframes stralen{to{opacity:1}}
@keyframes draai{to{rotate:360deg}}
@keyframes vonk{0%{opacity:1;transform:translate(-50%,-50%) rotate(0)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--r))}}
@keyframes nieuw{0%,100%{box-shadow:0 0 0 0 var(--kc)}50%{box-shadow:0 0 0 .35em var(--kc)}}
@media(prefers-reduced-motion:reduce){.env-knop.heeft svg,.podium .env,.podium.open .straal{animation:none}.podium.open .nieuwst{animation:uit .01s forwards}}
@media(min-width:761px){.sb.los .vak img{width:auto;max-width:100%;height:calc((100dvh - 24em) / 2);min-height:5em}}
@media(max-width:760px){.lay{grid-template-columns:1fr}.sb.los{padding:.9em}.raster{gap:.6em}}
`;

const sbEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SB_MND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const sbDatum = (iso) => { const q = String(iso || '').split('-'); return q.length === 3 ? `${Number(q[2])} ${SB_MND[Number(q[1]) - 1]}` : ''; };

// envelop als tekening; kleur van het zegel = kleur van het kind
const sbEnvelop = (kc, kc2) => `<svg viewBox="0 0 200 140" aria-hidden="true">
<rect x="4" y="18" width="192" height="118" rx="10" fill="#d8b98a"/>
<path d="M4 128 L100 70 L196 128 L196 126 Q196 136 186 136 L14 136 Q4 136 4 126Z" fill="#cfae7c"/>
<path d="M4 28 L100 92 L196 28" fill="none" stroke="#c19f6d" stroke-width="2"/>
<g class="flap"><path d="M14 18 L186 18 Q196 18 196 28 L100 92 L4 28 Q4 18 14 18Z" fill="#e3c799"/></g>
${kc2 ? `<path d="M100 69 a17 17 0 0 0 0 34z" fill="${kc}"/><path d="M100 69 a17 17 0 0 1 0 34z" fill="${kc2}"/>` : `<circle cx="100" cy="86" r="17" fill="${kc}"/>`}<path d="M100 75l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#fff" opacity=".92"/>
</svg>`;

class StickerboekCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const st = document.createElement('style');
    st.textContent = SB_CSS;
    this._main = document.createElement('div');
    this._ov = document.createElement('div');
    this.shadowRoot.append(st, this._main, this._ov);
    this._pagina = null; this._fase = null; this._last = '';
    this.shadowRoot.addEventListener('click', (e) => { const t = e.target.closest('[data-a]'); if (t) this._act(t); });
    this.shadowRoot.addEventListener('pointerdown', (e) => { if (e.target.closest('.album')) this._sx = e.clientX; else this._sx = null; });
    this.shadowRoot.addEventListener('pointerup', (e) => {
      if (this._sx == null) return;
      const dx = e.clientX - this._sx; this._sx = null;
      if (Math.abs(dx) > 60) { this._veeg = Date.now(); this._blader(dx < 0 ? 1 : -1); }
    });
  }

  setConfig(config) {
    this._c = { ...SB_STANDAARD, ...(config || {}), kleuren: { ...SB_STANDAARD.kleuren, ...((config || {}).kleuren || {}) } };
    if (this._c.persoon) this._kind = this._c.persoon;
    else if (this._c.start) this._kind = this._c.start;
  }

  getCardSize() { return 10; }
  static getStubConfig() { return {}; }

  set hass(h) {
    this._h = h;
    this._controleerNieuw();
    this._render();
  }

  _st() { return this._h?.states[this._c.sensor]?.attributes || {}; }
  _kinderen() { const k = this._st().kinderen; return Array.isArray(k) && k.length ? k : Object.keys(this._c.kleuren); }
  _kc(n) { const i = this._kinderen().indexOf(n); return this._c.kleuren[n] || PALET[(i < 0 ? 0 : i) % PALET.length]; }

  _paginas() {
    const st = this._st(), al = st.album, sa = (st.samen || {}).album;
    const n = al ? Math.max(1, ...al.stickers.map((s) => Number(s.pagina) || 1)) : 0;
    return { n, samen: sa ? n + 1 : 0, totaal: n + (sa ? 1 : 0) };
  }

  _zoek(id) {
    const st = this._st();
    for (const al of [st.album, (st.samen || {}).album]) {
      const s = al && al.stickers.find((x) => x.id === id);
      if (s) return { s, al };
    }
    return null;
  }

  _blader(r) {
    const n = this._paginas().totaal; if (!n) return;
    const p = Math.min(n, Math.max(1, (this._pagina || 1) + r));
    if (p !== this._pagina) { this._pagina = p; this._render(); }
  }

  _act(t) {
    const a = t.dataset.a;
    if (a === 'kind') { this._kind = t.dataset.k; this._pagina = null; return this._render(); }
    if (a === 'pag') { this._pagina = Number(t.dataset.p) || 1; return this._render(); }
    if (a === 'blader') return this._blader(Number(t.dataset.r));
    if (a === 'open') return this._openStart(false);
    if (a === 'open-samen') return this._openStart(true);
    if (a === 'scheur') { if (this._fase === 'dicht') { this._fase = 'open'; this._renderOv(); } return; }
    if (a === 'plak') return this._plak();
    if (a === 'toon') { if (this._veeg && Date.now() - this._veeg < 400) return; this._groot = t.dataset.id; this._fase = 'groot'; return this._renderOv(); }
    if (a === 'sluit') { this._fase = null; this._groot = null; this._renderOv(); return this._render(); }
  }

  _openStart(samen) {
    const h = this._h, k = this._kind, p = (this._st().per_kind || {})[k] || {}, script = samen ? this._c.samen_script : this._c.script;
    if (!k || !(Number(samen ? p.samen_enveloppen : p.enveloppen) > 0) || this._fase) return;
    if (!h.states[script]) { this._fase = 'fout'; this._fout = 'Het script voor envelopjes ontbreekt nog.'; return this._renderOv(); }
    this._samen = !!samen;
    this._vorige = (this._st().laatste_envelop || {}).ts || '';
    this._fase = 'wacht'; this._nieuw = null;
    this._renderOv();
    h.callService('script', script.split('.')[1], { persoon: k }).catch(() => {});
    clearTimeout(this._wachtT);
    this._wachtT = setTimeout(() => {
      if (this._fase === 'wacht') { this._fase = 'fout'; this._fout = 'Het envelopje ging niet open. Probeer het straks nog eens.'; this._renderOv(); }
    }, (this._c.wacht_s || 15) * 1000);
  }

  _controleerNieuw() {
    if (this._fase !== 'wacht') return;
    const le = this._st().laatste_envelop;
    if (le && le.ts && le.ts !== this._vorige && le.persoon === this._kind) {
      clearTimeout(this._wachtT);
      const z = this._zoek(le.sticker);
      this._nieuw = { ...le, info: z ? z.s : { id: le.sticker, naam: le.sticker, soort: 'gewoon', pagina: 1 }, pad: z ? z.al.pad : '' };
      this._fase = 'dicht';
      this._renderOv();
    }
  }

  _plak() {
    const n = this._nieuw;
    this._fase = null;
    if (n) { this._pagina = n.samen ? this._paginas().samen : Number(n.info.pagina) || 1; this._flits = n.sticker; setTimeout(() => { this._flits = null; this._render(); }, 4600); }
    this._renderOv();
    this._render();
  }

  _renderOv() {
    const f = this._fase, kc = this._kc(this._kind);
    if (!f) { this._ov.innerHTML = ''; return; }
    if (f === 'fout') { this._ov.innerHTML = `<div class="sb ov" data-a="sluit"><div class="doos"><div class="titel">Oeps</div><div class="sub">${sbEsc(this._fout)}</div><button class="knop" data-a="sluit">Oké</button></div></div>`; return; }
    if (f === 'groot') {
      const z = this._zoek(this._groot), al = z && z.al, s = z && z.s;
      const mijn = s && (((this._st().per_kind || {})[this._kind] || {}).stickers || []).find((x) => x.id === this._groot && x.album === al.id);
      this._ov.innerHTML = s ? `<div class="sb ov" data-a="sluit"><div class="doos"><img class="groot" src="${sbEsc(al.pad + s.id + '.png')}" alt=""><div class="titel">${sbEsc(s.naam)}</div><div class="sub">${s.soort === 'samen' ? 'samen-sticker van ' + sbEsc(this._kinderen().join(' en ')) : 'nr. ' + s.nr}${s.soort === 'zeldzaam' ? ' · zeldzaam' : s.soort === 'goud' ? ' · goud' : ''}${mijn ? ' · gekregen op ' + sbEsc(sbDatum(mijn.op)) : ''}</div></div></div>` : '';
      return;
    }
    const n = this._nieuw, soort = n ? n.info.soort : 'gewoon', kids = this._kinderen(), k2 = this._samen ? this._kc(kids.find((q) => q !== this._kind) || this._kind) : null;
    const vonken = soort === 'gewoon' ? '' : [...Array(soort === 'goud' ? 22 : 12)].map((_, i) => {
      const hoek = (i / (soort === 'goud' ? 22 : 12)) * Math.PI * 2, r = 9 + (i % 3) * 3;
      const kl = soort === 'goud' ? ['#ffd45a', '#fff1b8', '#e8a93a'][i % 3] : soort === 'samen' ? [kc, '#ffffff', k2 || kc][i % 3] : ['#ffe39a', '#ffffff', kc][i % 3];
      return `<i class="vonk" style="background:${kl};--dx:${(Math.cos(hoek) * r).toFixed(1)}em;--dy:${(Math.sin(hoek) * r).toFixed(1)}em;--r:${i * 47}deg"></i>`;
    }).join('');
    const ander = kids.find((q) => q !== this._kind) || '';
    const tekst = f === 'wacht' ? `<div class="titel">Even geduld…</div><div class="sub">Je ${this._samen ? 'samen-envelopje' : 'envelopje'} komt eraan</div>`
      : f === 'dicht' ? `<div class="titel">Tik op het ${this._samen ? 'samen-envelopje' : 'envelopje'}!</div><div class="sub">${this._samen ? `Verdiend met ${sbEsc(ander)}: jullie hadden samen alles af` : 'Wat zou erin zitten?'}</div>`
        : `<div class="titel">${sbEsc(n.info.naam)}</div><div class="sub">${soort === 'samen' ? `Een samen-sticker! ${sbEsc(ander)} krijgt dezelfde` : soort === 'goud' ? 'De gouden sticker! ✨' : soort === 'zeldzaam' ? 'Een zeldzame sticker!' : `Sticker nr. ${n.info.nr || ''}`}</div><button class="knop" data-a="plak">Plak in mijn boek</button>`;
    this._ov.innerHTML = `<div class="sb ov"><div class="doos">
<div class="podium ${f}${soort === 'goud' ? ' goud' : ''}" data-a="scheur" style="--kc:${kc}">
${f === 'open' ? `<div class="straal"></div>${vonken}<img class="nieuwst" src="${sbEsc(n.pad + n.sticker + '.png')}" alt="">` : ''}
<div class="env">${sbEnvelop(kc, k2)}</div></div>${tekst}</div></div>`;
  }

  _render() {
    if (!this._h || !this._c) return;
    const html = this._html();
    if (html !== this._last) { this._last = html; this._main.innerHTML = html; }
  }

  _html() {
    const c = this._c, h = this._h, st = this._st(), los = !c.ingebed;
    const wrap = (inner) => `<div class="sb${los ? ' los' : ''}">${inner}</div>`;
    if (!h.states[c.sensor]) return wrap('<div class="kaart">sensor.taken_status ontbreekt nog.</div>');
    const kids = this._kinderen();
    if (!this._kind || !kids.includes(this._kind)) this._kind = kids[0];
    const k = this._kind, kc = this._kc(k), p = (st.per_kind || {})[k] || {}, al = st.album;
    const wissel = c.persoon ? '' : `<div class="wissel">${kids.map((n) => `<button class="pil${n === k ? ' on' : ''}" style="--kc:${sbEsc(this._kc(n))}" data-a="kind" data-k="${sbEsc(n)}">${sbEsc(n)}</button>`).join('')}</div>`;
    const mijn = (p.stickers || []).filter((s) => al && s.album === al.id), heb = new Set(mijn.map((s) => s.id));
    const totaal = al ? al.stickers.length : 0;
    const env = Number(p.enveloppen) || 0, ep = Number(st.envelop_per) || 3, nog = Number(p.nog_tot_envelop) || ep - ((Number(p.sterren_totaal) || 0) % ep);
    let envBlok;
    if (!al) envBlok = `<div class="leeg-env"><div class="serif" style="font-size:1.2em">Nog geen album</div><div class="tag">Je envelopjes worden bewaard${env ? ` (${env})` : ''}.</div></div>`;
    else if (p.album_vol) envBlok = `<div class="leeg-env"><div class="serif" style="font-size:1.25em">Je album is vol! 🎉</div><div class="tag">${env ? `${env} ${env === 1 ? 'envelopje wordt' : 'envelopjes worden'} bewaard voor het volgende album.` : 'Knap gedaan!'}</div></div>`;
    else if (env) envBlok = `<button class="env-knop heeft" data-a="open">${sbEnvelop(kc)}<b>${env === 1 ? 'Je hebt 1 envelopje!' : `Je hebt ${env} envelopjes!`}</b><span class="tag">Tik om te openen</span></button>`;
    else envBlok = `<div class="leeg-env"><div class="serif" style="font-size:1.2em">Nog ${nog} ${nog === 1 ? 'ster' : 'sterren'}</div><div class="tag">tot je volgende envelopje</div></div>`;
    const sm = st.samen || {}, sa = sm.album, kids2 = kids.length > 1 ? kids : [k, k];
    const k1c = this._kc(kids2[0]), k2c = this._kc(kids2[1]), ander = kids.find((q) => q !== k) || '';
    const senv = Number(p.samen_enveloppen) || 0, nodig = Number(sm.nodig) || 5, poot = Number(sm.pootjes) || 0;
    const samenBlok = !sa ? '' : senv ? `<button class="env-knop heeft samen" data-a="open-samen" style="--k1:${sbEsc(k1c)};--k2:${sbEsc(k2c)}">${sbEnvelop(k1c, k2c)}<b>Samen-envelopje!</b><span class="tag">Verdiend met ${sbEsc(ander)}</span></button>`
      : `<div class="leeg-env" style="margin-top:.8em"><div class="tag">Samen alles af</div><div class="poot">${[...Array(nodig)].map((_, i) => `<i class="${i < poot ? 'on' : ''}">🐾</i>`).join('')}</div><div class="tag">nog ${nodig - poot} ${nodig - poot === 1 ? 'dag' : 'dagen'} samen tot een samen-sticker</div></div>`;
    const links = `<div class="kaart"><div class="lbl"><span>${al ? sbEsc(al.titel) : 'Album'}</span><span>${mijn.length} van ${totaal}</span></div>
<div class="voortgang"><i style="width:${totaal ? Math.round((mijn.length / totaal) * 100) : 0}%"></i></div>
${envBlok}${samenBlok}
<div class="sterren"><div><span class="st">★</span> <b class="serif">${Number(p.sterren_vandaag) || 0}</b> <span class="tag">vandaag</span></div><div><b class="serif">${Number(p.sterren_week) || 0}</b> <span class="tag">deze week</span></div></div></div>`;
    let rechts = '';
    if (al || sa) {
      const P = this._paginas(), pags = P.totaal;
      if (!this._pagina) this._pagina = 1;
      this._pagina = Math.min(this._pagina, pags);
      const pg = this._pagina, isSamen = !!P.samen && pg === P.samen, A = isSamen ? sa : al;
      const hebA = new Set((p.stickers || []).filter((s) => s.album === A.id).map((s) => s.id));
      const vakken = A.stickers.filter((s) => isSamen || (Number(s.pagina) || 1) === pg).sort((a, b) => a.nr - b.nr).map((s) => {
        const src = sbEsc(A.pad + s.id + '.png'), heb = hebA;
        if (heb.has(s.id)) return `<button class="vak heb ${sbEsc(s.soort)}${this._flits === s.id ? ' nieuw' : ''}" data-a="toon" data-id="${sbEsc(s.id)}"><img src="${src}" alt="" loading="lazy"><span>${sbEsc(s.naam)}</span></button>`;
        return `<div class="vak ${sbEsc(s.soort)}"><img class="sil" src="${src}" alt="" loading="lazy" draggable="false"><b class="vraag">?</b><span>${isSamen ? 'samen' : `nr. ${s.nr}`}${s.soort === 'goud' ? ' · goud' : ''}</span></div>`;
      }).join('');
      rechts = `<div class="kaart album" style="--k1:${sbEsc(k1c)};--k2:${sbEsc(k2c)}"><div class="akop"><button class="nav" data-a="blader" data-r="-1" ${pg <= 1 ? 'disabled' : ''} aria-label="Vorige pagina">‹</button><div class="serif">${isSamen ? `Samen · ${sbEsc(kids.join(' en '))}` : `${sbEsc(al.titel)} · pagina ${pg}`}</div><button class="nav" data-a="blader" data-r="1" ${pg >= pags ? 'disabled' : ''} aria-label="Volgende pagina">›</button></div>
<div class="raster">${vakken}</div><div class="punten">${[...Array(pags)].map((_, i) => (P.samen && i + 1 === P.samen ? `<button class="punt hart${i + 1 === pg ? ' on' : ''}" data-a="pag" data-p="${i + 1}" aria-label="Pagina Samen">♥</button>` : `<button class="punt${i + 1 === pg ? ' on' : ''}" data-a="pag" data-p="${i + 1}" aria-label="Pagina ${i + 1}"></button>`)).join('')}</div></div>`;
    }
    return wrap(`<div style="--kc:${sbEsc(kc)}"><div class="kop"><div class="serif naam">Stickerboek van ${sbEsc(k)}<small>${al ? `${sbEsc(al.titel)} · tot ${sbEsc(sbDatum(al.tot))}` : ''}</small></div>${wissel}</div>
<div class="lay">${links}${rechts}</div></div>`);
  }
}

customElements.define('stickerboek-card', StickerboekCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'stickerboek-card', name: 'Stickerboek', description: 'Envelopjes openen en het stickeralbum (hoort bij de takenlijst)' });
