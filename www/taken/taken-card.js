/* Taken card, versie 1 (los pakket): takenlijst voor kinderen met sterren, bonustaken, samen-doel en stickerboek.
   Bestand: /config/www/taken-card.js  (bron: /local/taken-card.js?v=1, type JavaScript-module)
   Gegevens: sensor.taken_status (/config/taken/status.json, gemaakt door /config/taken/taken.py).
   Stickerboek: laad ook /local/stickerboek-card.js als bron; dan opent 'Stickerboek ›' het album.

   Minimaal:   type: custom:taken-card
   Tip: zet de kaart in een view van het type Paneel (één kaart, volle breedte) op de tablet.

   Alle opties (met standaardwaarden):
     sensor: sensor.taken_status
     scripts: { afvinken: script.taken_afvinken, ongedaan: script.taken_ongedaan, bonus: script.taken_bonus, doel: script.taken_doel }
     kleuren: { Sam: '#3f8f8a', Fenna: '#c9805f' }   # per kind; zonder kleur een vaste kleur uit het palet
     thema: auto              # auto (volgt het donkere thema van HA), licht of donker
     volledig_scherm: true    # true = vult het scherm en scrollt binnen de kaart (paneel-view); false = gewone kaarthoogte
     ouder_tonen: true        # kaart 'Ouders' met ouder-taken
     titel: Taken
     lang_ms: 700             # zo lang ingedrukt houden op het samen-doel om het aan te passen
     bevestig_ms: 3000        # terugzetten: binnen deze tijd nog een keer tikken
*/

const TK_STANDAARD = {
  sensor: 'sensor.taken_status',
  scripts: { afvinken: 'script.taken_afvinken', ongedaan: 'script.taken_ongedaan', bonus: 'script.taken_bonus', doel: 'script.taken_doel' },
  kleuren: {},
  thema: 'auto',
  volledig_scherm: true,
  ouder_tonen: true,
  titel: 'Taken',
  lang_ms: 700,
  bevestig_ms: 3000,
  bevestig_min_ms: 400,
};
const TK_PALET = ['#3f8f8a', '#c9805f', '#6b7fb3', '#a0628f', '#7a8f3f', '#b58a3a'];
const TK_MND = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const tkEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tkList = (v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return []; } } return []; };
const tkObj = (v) => { if (v && typeof v === 'object' && !Array.isArray(v)) return v; if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return {}; } } return {}; };
const tkEn = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} en ${l[l.length - 1]}`);

const TK_CSS = `
:host{display:block}
*{box-sizing:border-box}
button{font:inherit;color:inherit}
.root{
  --bg: var(--ha-card-background, var(--card-background-color));
  --card: var(--ha-card-background, var(--card-background-color));
  --line: var(--divider-color);
  --ink: var(--primary-text-color);
  --mut: var(--secondary-text-color);
  --acc: var(--primary-color);
  --acct: var(--primary-color);
  --ok: var(--success-color,#4caf50);
  --bad: var(--error-color,#f44336);
  --mat: var(--warning-color,#ff9800);
  --tint: rgba(var(--rgb-primary-color),0.15);
  --soft: var(--secondary-background-color);
  position:relative;
  background:transparent;
  color:var(--ink);
  font-family:var(--paper-font-body1_-_font-family);
}
.root.vol{height:100vh;height:100dvh;overflow:hidden;border-radius:0}
.wrap{flex:1;min-height:0;width:100%;max-width:1500px;margin:0 auto;display:flex;flex-direction:column}
.serif{font-family:'Fraunces',Georgia,serif;font-weight:400}
.col{display:flex;flex-direction:column;gap:1.2em;min-width:0}
.card{display:block;width:100%;border:0;text-align:left;background:var(--card);border-radius:1.6em;padding:1.2em 1.4em}
.lbl{display:flex;justify-content:space-between;gap:.4em 1em;flex-wrap:wrap;font-size:.75em;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin:0 0 .9em;font-weight:600}
.go{color:var(--acct);letter-spacing:.04em}
.row{display:flex;align-items:center;justify-content:space-between;gap:.8em;padding:.7em 0;border-top:1px solid var(--line)}
.row>*{min-width:0}.row b{font-weight:500;font-size:1.05em}.row .tag,.row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tag{font-size:.88em;color:var(--mut)}.ok{color:var(--ok)}
.bar{display:flex;align-items:center;gap:1em;padding:0 .4em 1em;border-bottom:1px solid var(--line);flex:none}
.back{min-height:44px;border:0;border-radius:999px;background:var(--card);padding:0 1.2em;cursor:pointer;font-weight:500}
.btn{min-height:44px;border:0;border-radius:.9em;background:var(--acc);color:#fff;padding:0 1.4em;font-weight:500;cursor:pointer}
.ttl{font-size:1.9em;line-height:1}
.scroll{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding-top:1.2em}
.root:not(.vol) .scroll{overflow:visible}
.two{display:grid;grid-template-columns:1fr 1fr;gap:1.2em;align-items:start}
.dh{font-size:.8em;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);font-weight:600;margin:1em 0 .5em}.dh:first-child{margin-top:0}
.act{min-height:4.2em;border:0;border-radius:1.1em;background:var(--soft);cursor:pointer;font-weight:500}
.act.undo{background:transparent;outline:1px solid var(--line);color:var(--mut)}
.chk{display:flex;align-items:center;gap:.9em;width:100%;text-align:left;border:0;background:none;border-top:1px solid var(--line);padding:.7em 0;min-height:44px;font-size:1.05em;cursor:pointer}
.card>.chk:first-child{border-top:0}
.circle{width:1.5em;height:1.5em;border-radius:50%;border:2px solid var(--acct);flex:none}.circle.full{background:var(--acct)}
.add{display:flex;gap:.6em;margin-top:1em}
.add input,.fld input{flex:1;min-height:44px;border:1px solid var(--line);background:var(--card);border-radius:.9em;padding:0 1em;font:inherit;color:var(--ink);min-width:0}
.fld{display:flex;flex-direction:column;gap:.3em;font-size:.9em;color:var(--mut);margin-bottom:.8em}
.acts2{display:flex;gap:.8em;margin-top:1em}
.scenes{display:flex;flex-wrap:wrap;gap:.5em;margin-top:.6em}
.fav{display:flex;align-items:center;gap:.4em;background:var(--soft);border:0;border-radius:1em;padding:.5em .9em;min-height:44px;font-size:.9em;cursor:pointer}
.fav.on{background:var(--tint);outline:2px solid var(--acct)}
.kh{display:flex;align-items:center;justify-content:space-between;gap:.8em;margin-bottom:.2em}
.toast{position:absolute;left:50%;bottom:1.4em;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:.7em 1.4em;border-radius:999px;font-weight:500;z-index:5;white-space:nowrap}
.tgrid{display:grid;grid-template-columns:repeat(var(--kol,3),minmax(0,1fr));gap:1.2em;align-items:start}
.poot{font-size:1.25em;letter-spacing:.15em;white-space:nowrap;flex:none}
.kid{border-top:.4em solid var(--kc,var(--acct))}.kid .dh{margin-top:1em}
.ster{color:var(--mat)}.ster-s{margin-left:auto;color:var(--mat);font-size:.9em;flex:none}
.wks{display:grid;grid-template-columns:repeat(7,1fr);gap:.3em;margin:.5em 0 .2em;text-align:center;font-size:.78em;color:var(--mut)}
.wks>div{padding:.25em 0;border-radius:.6em}.wks b{display:block;color:var(--ink);font-size:1.3em;font-weight:500}.wks .nu{background:var(--soft)}
.klaar{background:var(--tint);border-radius:.8em;padding:.55em .9em;margin-top:.7em}
.chk.env{margin-top:.6em;font-size:.92em;color:var(--mut)}.chk.env .go{flex:none;font-size:.9em}
.chk.tk{gap:.8em}.tk-n{flex:1;min-width:0}.chk.tk.done{color:var(--mut)}.chk.tk.done .tk-n{text-decoration:line-through}
.tk-n .tag{display:block;font-size:.78em;margin-top:.1em}
.chk.tk .wiet{flex:none;font-size:.85em;color:var(--mut)}
.chk.tk.arm{background:var(--bad);color:#fff;border-radius:.8em;padding-left:.6em;padding-right:.6em}.chk.tk.arm .tk-n{text-decoration:none}.chk.tk.arm .wiet{color:#fff}
.wie{border-top:1px solid var(--line);padding:.7em 0}.card>.wie:first-child{border-top:0;padding-top:0}
.wie-k{display:flex;gap:.5em;flex-wrap:wrap}.wie-k .act{flex:1 1 4.5em;min-height:3.2em}.wie-k .act.kc{background:var(--kc);color:#fff}
.doel{cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.balk{height:1em;border-radius:999px;background:var(--soft);overflow:hidden;margin-top:.8em}.balk i{display:block;height:100%;background:var(--mat);border-radius:999px;transition:width .4s}
.chk:active,.act:active,.fav:active,.btn:active,.back:active{filter:brightness(.93)}
@media(max-width:1000px){
.tgrid,.two{grid-template-columns:1fr}
.root.vol{height:auto;min-height:100vh;min-height:100dvh;overflow:visible}
.wrap,.scroll{flex:none;overflow:visible;min-height:0}
.toast{position:fixed}
}
@media(max-width:700px){
.root{font-size:15px;padding:.8em .9em calc(1.6em + env(safe-area-inset-bottom))}
.card{padding:1em 1.1em;border-radius:1.4em}
.bar{flex-wrap:wrap;gap:.6em}.ttl{font-size:1.5em}
.poot{font-size:1em;letter-spacing:0}
}
`;

class TakenCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const st = document.createElement('style');
    st.textContent = TK_CSS;
    this._r = document.createElement('div');
    this.shadowRoot.append(st, this._r);
    this._view = 'taken'; this._form = {}; this._toast = { t: '', until: 0 }; this._last = '';
    this.shadowRoot.addEventListener('click', (e) => { const t = e.target.closest('[data-act]'); if (t) this._act(t); });
    this.shadowRoot.addEventListener('input', (e) => { const t = e.target; if (t.dataset.f) this._form[t.dataset.f] = t.value; });
    this.shadowRoot.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.f === 'bonus') e.target.blur(); });
    this.shadowRoot.addEventListener('pointerdown', (e) => {
      const lp = e.target.closest && e.target.closest('[data-lang]');
      clearTimeout(this._lpT);
      if (lp) this._lpT = setTimeout(() => this._act({ dataset: { act: lp.dataset.lang } }), this._c?.lang_ms ?? 700);
    });
    this.shadowRoot.addEventListener('pointerup', () => clearTimeout(this._lpT));
    this.shadowRoot.addEventListener('pointercancel', () => clearTimeout(this._lpT));
    this.shadowRoot.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('[data-lang]')) e.preventDefault(); });
    // invoerveld verlaten: alsnog bijwerken wat tijdens het typen is blijven liggen
    this.shadowRoot.addEventListener('focusout', () => setTimeout(() => this._render(), 0));
  }

  setConfig(config) {
    const c = config || {};
    this._c = { ...TK_STANDAARD, ...c, scripts: { ...TK_STANDAARD.scripts, ...(c.scripts || {}) }, kleuren: { ...(c.kleuren || {}) } };
  }

  getCardSize() { return 12; }
  static getStubConfig() { return {}; }

  connectedCallback() { this._iv = setInterval(() => this._render(), 30 * 1000); }
  disconnectedCallback() { clearInterval(this._iv); }

  set hass(h) {
    this._h = h;
    this._render();
  }

  _kinderen() { return tkList(this._h?.states[this._c.sensor]?.attributes?.kinderen); }
  _kleur(n) { const i = this._kinderen().indexOf(n); return this._c.kleuren[n] || TK_PALET[(i < 0 ? 0 : i) % TK_PALET.length]; }
  _kleuren() { const m = {}; this._kinderen().forEach((n) => { m[n] = this._kleur(n); }); return m; }

  _melding(t) {
    this._toast = { t, until: Date.now() + 2200 };
    this._render();
    setTimeout(() => this._render(), 2300);
  }

  _script(naam, data, msg) {
    const ent = this._c.scripts[naam];
    if (!ent || !this._h.states[ent]) return this._melding(`${ent || 'Script'} ontbreekt (package taken.yaml geladen?)`);
    this._h.callService('script', ent.split('.')[1], data);
    return this._melding(msg);
  }

  _act(t) {
    const a = t.dataset.act, h = this._h, c = this._c;
    const allen = () => (this._kinderen().length === 2 ? 'allebei' : 'iedereen');
    if (a === 'view') {
      this._view = t.dataset.v;
      if (this._view === 'taken') { this._wie = null; this._tArm = null; }
      return this._render();
    }
    if (a === 'tk-wie') { this._wie = t.dataset.k || null; this._tArm = null; return this._render(); }
    if (a === 'tk-af') {
      this._wie = null;
      const p = t.dataset.p, kind = p && p !== 'Ouder';
      return this._script('afvinken', { taak: t.dataset.taak, persoon: p }, p === 'Samen' ? `Goed gedaan samen! Een ster voor ${allen()} ★` : kind ? `Goed gedaan, ${p}! ★` : 'Afgevinkt');
    }
    if (a === 'tk-terug') {
      const k = t.dataset.k, ar = this._tArm, nuT = Date.now();
      if (!ar || ar.k !== k || nuT - ar.t > c.bevestig_ms) {
        this._tArm = { k, t: nuT }; this._wie = null;
        setTimeout(() => this._render(), c.bevestig_ms + 100);
        return this._render();
      }
      if (nuT - ar.t < c.bevestig_min_ms) return undefined;
      this._tArm = null;
      return this._script('ongedaan', { id: Number(t.dataset.id) }, 'Teruggezet');
    }
    if (a === 'tk-sug') { this._form.bonus = tkList(h.states[c.sensor]?.attributes.bonus_suggesties)[Number(t.dataset.i)] || ''; return this._render(); }
    if (a === 'tk-bonus') {
      const txt = String(this._form.bonus || '').replace(/\s+/g, ' ').trim(), p = t.dataset.p;
      if (!txt) return this._melding('Kies of typ eerst een bonustaak');
      const ta = h.states[c.sensor]?.attributes || {}, pk = tkObj(ta.per_kind), max = Number(ta.bonus_max) || 2, al = Number(pk[p]?.bonus_vandaag) || 0;
      this._form.bonus = '';
      if (p === 'Samen') {
        const met = Object.keys(pk).filter((k) => (Number(pk[k]?.bonus_vandaag) || 0) < max);
        return this._script('bonus', { naam: txt.slice(0, 60), persoon: p }, met.length === Object.keys(pk).length ? `Samen gedaan! Een bonusster voor ${allen()} ★` : met.length ? `Samen gedaan! Bonusster voor ${tkEn(met)} ★` : 'Samen genoteerd (vandaag geen bonussterren meer)');
      }
      return this._script('bonus', { naam: txt.slice(0, 60), persoon: p }, p === 'Ouder' ? 'Bonustaak genoteerd' : al < max ? `Bonusster voor ${p}! ★` : `Genoteerd, ${p} (vandaag geen bonusster meer)`);
    }
    if (a === 'tk-sb') { this._sbP = t.dataset.k; this._view = 'stickers'; return this._render(); }
    if (a === 'tk-doel') {
      const dl = tkObj(h.states[c.sensor]?.attributes.maanddoel);
      this._form.doelBel = dl.beloning || ''; this._form.doelSt = String(dl.sterren || 40);
      this._view = 'doel'; return this._render();
    }
    if (a === 'tk-doelok') {
      const n = parseInt(String(this._form.doelSt || '').trim(), 10);
      if (!(n >= 1 && n <= 500)) return this._melding('Vul een aantal sterren in (1 tot 500)');
      this._view = 'taken';
      return this._script('doel', { beloning: String(this._form.doelBel || '').trim().slice(0, 60), sterren: n }, 'Samen-doel opgeslagen');
    }
    return undefined;
  }

  _render() {
    if (!this._h || !this._c) return;
    const ae = this.shadowRoot.activeElement;
    if (ae && ae.tagName === 'INPUT') return; // niet storen tijdens het typen
    const inner = this._view === 'doel' ? this._vDoel() : this._view === 'stickers' ? this._vStickers() : this._vTaken();
    const toast = Date.now() < this._toast.until ? `<div class="toast">${tkEsc(this._toast.t)}</div>` : '';
    const html = `<div class="root${this._c.volledig_scherm ? ' vol' : ''}"><div class="wrap">${inner}</div>${toast}</div>`;
    if (html !== this._last) { this._last = html; this._r.innerHTML = html; }
    this._sbSync();
  }

  _balk(titel, terug, extra = '') {
    const back = terug ? `<button class="back" data-act="view" data-v="${terug}">‹ Terug</button>` : '';
    return `<div class="bar">${back}<div class="serif ttl">${tkEsc(titel)}</div>${extra}</div>`;
  }

  _vTaken() {
    const c = this._c, nu = new Date(), ent = this._h.states[c.sensor];
    if (!ent) return this._balk(c.titel) + `<div class="scroll"><section class="card" style="max-width:46em"><div class="tag">${tkEsc(c.sensor)} ontbreekt. Controleer of packages/taken.yaml geladen is en herstart Home Assistant volledig.</div></section></div>`;
    const st = ent.attributes || {}, esc = tkEsc;
    const kids = tkList(st.kinderen);
    const per = tkObj(st.per_kind), dagL = tkList(st.taken_dag), weekL = tkList(st.taken_week), ouderL = tkList(st.taken_ouder), bonus = tkList(st.bonus);
    const kl = (n) => this._kleur(n);
    const verloop = kids.length > 1 ? `linear-gradient(90deg,${kids.map((n, i) => `${kl(n)} ${(i * 100) / kids.length}% ${((i + 1) * 100) / kids.length}%`).join(',')})` : '';
    const samenKnop = (act, extra) => (kids.length > 1 ? `<button class="act kc" style="--kc:${esc(kl(kids[0]))};background:${esc(verloop)}" data-act="${act}" ${extra} data-p="Samen">Samen</button>` : '');
    const ar = this._tArm, armd = (k) => ar && ar.k === k && Date.now() - ar.t <= c.bevestig_ms;
    const gedaanRij = (k, naam, door, om, id, voor) => {
      const a = armd(k), wie = door === voor ? '' : door === 'Ouder' ? 'ouder' : door === 'Samen' ? 'samen' : door || '';
      return `<button class="chk tk done${a ? ' arm' : ''}" data-act="tk-terug" data-k="${esc(k)}" data-id="${esc(id)}"><span class="circle full"></span><span class="tk-n">${a ? 'Nog eens tikken om terug te zetten' : esc(naam)}</span><span class="wiet">${esc(wie)}${wie && om ? ' · ' : ''}${esc(om || '')}</span></button>`;
    };
    const rij = (t, modus) => {
      const k = `${t.id}|${t.voor || ''}`;
      if (t.gedaan) return gedaanRij(k, t.naam, t.door, t.om, t.log_id, t.voor);
      const sub = [t.toelichting, t.tot ? `voor ${t.tot}` : ''].filter(Boolean).join(' · ');
      const ster = modus !== 'ouder' && (t.soort === 'eigen' || t.kinderklus) ? '<span class="ster-s">★</span>' : '';
      if (modus === 'wie' && this._wie === k) {
        return `<div class="wie"><div style="margin-bottom:.55em">${esc(t.naam)} · <span class="tag">wie deed het?</span></div><div class="wie-k">${kids.map((n) => `<button class="act kc" style="--kc:${esc(kl(n))}" data-act="tk-af" data-taak="${esc(t.id)}" data-p="${esc(n)}">${esc(n)}</button>`).join('')}${samenKnop('tk-af', `data-taak="${esc(t.id)}"`)}<button class="act undo" data-act="tk-af" data-taak="${esc(t.id)}" data-p="Ouder">Ouder</button><button class="act undo" style="flex:0 0 3.2em" data-act="tk-wie" data-k="" aria-label="Annuleren">✕</button></div></div>`;
      }
      const act = modus === 'wie' ? `data-act="tk-wie" data-k="${esc(k)}"` : `data-act="tk-af" data-taak="${esc(t.id)}" data-p="${esc(modus === 'ouder' ? 'Ouder' : t.voor)}"`;
      return `<button class="chk tk" ${act}><span class="circle"></span><span class="tk-n">${esc(t.naam)}${sub ? `<span class="tag">${esc(sub)}</span>` : ''}</span>${ster}</button>`;
    };
    const open1 = (l) => l.filter((t) => !t.gedaan).concat(l.filter((t) => t.gedaan));
    const vd = (nu.getDay() + 6) % 7, ep = Number(st.envelop_per) || 3;
    const kaart = (n) => {
      const p = per[n] || {}, eigen = open1(dagL.filter((t) => t.voor === n && !t.optioneel)), opt = dagL.filter((t) => t.voor === n && t.optioneel), wk = open1(weekL.filter((t) => t.voor === n)), ws = tkList(p.week_sterren);
      const week = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((d, i) => `<div class="${i === vd ? 'nu' : ''}">${d}<b>${i > vd ? '·' : Number(ws[i]) || 0}</b></div>`).join('');
      const env = Number(p.enveloppen) || 0, nog = Number(p.nog_tot_envelop) || ep - ((Number(p.sterren_totaal) || 0) % ep);
      const sb = customElements.get('stickerboek-card') && st.album ? `<button class="chk env" data-act="tk-sb" data-k="${esc(n)}"><span class="tk-n">✉ ${env ? `<b style="color:var(--ink)">${env} ${env === 1 ? 'envelopje' : 'envelopjes'} openen</b>` : `nog ${nog} ★ tot het volgende envelopje`}${Number(p.samen_enveloppen) ? ' · <b style="color:var(--ink)">samen-envelopje!</b>' : ''}</span><span class="go">Stickerboek ›</span></button>` : '';
      return `<section class="card kid" style="--kc:${esc(kl(n))}"><div class="kh"><div class="serif" style="font-size:1.7em">${esc(n)}</div><div><span class="ster">★</span> <b class="serif" style="font-size:1.5em">${Number(p.sterren_vandaag) || 0}</b> <span class="tag">vandaag</span></div></div>
<div class="wks">${week}</div>${p.dag_compleet ? '<div class="klaar">Alles af vandaag! ✨</div>' : ''}
<div class="dh">Vandaag</div>${eigen.map((t) => rij(t, 'kind')).join('') || '<div class="tag">Niets meer voor vandaag</div>'}
${opt.length ? `<div class="dh">Als het zo uitkomt</div>${opt.map((t) => rij(t, 'kind')).join('')}` : ''}
${wk.length ? `<div class="dh">Deze week</div>${wk.map((t) => rij(t, 'kind')).join('')}` : ''}${sb}</section>`;
    };
    const huis = open1(dagL.filter((t) => !t.voor && t.soort !== 'ouder').concat(weekL.filter((t) => !t.voor && t.soort !== 'ouder')));
    const bmax = Number(st.bonus_max) || 2, sug = tkList(st.bonus_suggesties);
    const bonusKaart = `<section class="card"><div class="lbl">Bonustaak<span>${kids.map((n) => `${esc(n)} nog ${Math.max(0, bmax - (Number(per[n]?.bonus_vandaag) || 0))}`).join(' · ')} ★</span></div>
${sug.length ? `<div class="scenes" style="margin-top:0">${sug.map((s2, i) => `<button class="fav${this._form.bonus === s2 ? ' on' : ''}" data-act="tk-sug" data-i="${i}">${esc(s2)}</button>`).join('')}</div>` : ''}
<div class="add"><input type="text" maxlength="60" data-f="bonus" value="${esc(this._form.bonus || '')}" placeholder="Wat heb je extra gedaan?" aria-label="Bonustaak"></div>
<div class="wie-k" style="margin-top:.7em">${kids.map((n) => `<button class="act kc" style="--kc:${esc(kl(n))}" data-act="tk-bonus" data-p="${esc(n)}">${esc(n)}</button>`).join('')}${samenKnop('tk-bonus', '')}<button class="act undo" data-act="tk-bonus" data-p="Ouder">Ouder</button></div>
${bonus.length ? `<div class="dh">Vandaag extra gedaan</div>${bonus.map((b) => gedaanRij(`bonus|${b.log_id}`, b.naam + (b.ster ? ' ★' : ''), b.door, b.om, b.log_id)).join('')}` : ''}</section>`;
    const ouder = c.ouder_tonen === false || !ouderL.length ? '' : `<section class="card"><div class="lbl">Ouders</div>${open1(ouderL).map((t) => rij(t, 'ouder')).join('')}</section>`;
    const sm = tkObj(st.samen), smN = Number(sm.nodig) || 5, smP = Number(sm.pootjes) || 0, smKlaar = kids.some((n) => Number(per[n]?.samen_enveloppen));
    const samenRij = !sm.album || kids.length < 2 ? '' : `<div class="row" style="margin-top:.8em"><div><b>Samen alles af</b><div class="tag">${smKlaar ? 'Samen-sticker verdiend! Open hem in het stickerboek' : sm.vandaag ? `Vandaag hadden jullie ${kids.length === 2 ? 'allebei' : 'allemaal'} alles af ✨` : `Nog ${smN - smP} ${smN - smP === 1 ? 'dag' : 'dagen'} samen tot een samen-sticker`}</div></div><span class="poot">${[...Array(smN)].map((_, i) => `<span style="opacity:${i < smP || smKlaar ? 1 : 0.22}">🐾</span>`).join('')}</span></div>`;
    const dl = tkObj(st.maanddoel), doelN = Number(dl.sterren) || 0, stand = Number(dl.stand) || 0, pct = doelN ? Math.min(100, Math.round((stand / doelN) * 100)) : 0;
    const doel = `<section class="card doel" data-lang="tk-doel"><div class="lbl">Samen-doel ${esc(TK_MND[nu.getMonth()])}<span>${dl.gehaald ? 'Gehaald! 🎉' : `${stand} van ${doelN} ★`}</span></div>
<div class="serif" style="font-size:1.35em">${esc(dl.beloning || 'Nog geen beloning gekozen')}</div><div class="balk"><i style="width:${pct}%"></i></div>
<div class="tag" style="margin-top:.5em">Sterren van ${esc(tkEn(kids))} tellen samen · houd ingedrukt om aan te passen</div>${samenRij}</section>`;
    const leeg = kids.length ? '' : '<section class="card" style="margin-top:1.2em"><div class="tag">Nog geen kinderen: vul "personen" in /config/taken/taken.json.</div></section>';
    return this._balk(c.titel, null, `<span class="tag" style="margin-left:auto">${st.vakantie ? 'Vakantie' : st.schooldag ? 'Schooldag' : 'Weekend'}</span>`)
      + `<div class="scroll">${doel}${leeg}<div class="tgrid" style="margin-top:1.2em;--kol:${Math.min(Math.max(kids.length + 1, 2), 4)}">${kids.map(kaart).join('')}<div class="col"><section class="card"><div class="lbl">Huis · wie het doet krijgt een ster</div>${huis.map((t) => rij(t, 'wie')).join('') || '<div class="tag">Niets meer te doen</div>'}</section>${bonusKaart}${ouder}</div></div></div>`;
  }

  _vStickers() {
    if (!customElements.get('stickerboek-card')) return this._balk('Stickerboek', 'taken') + '<div class="scroll"><section class="card" style="max-width:46em"><div class="tag">De stickerboek-kaart is nog niet geladen. Voeg /local/stickerboek-card.js toe als bron (Instellingen → Dashboards → Bronnen).</div></section></div>';
    return this._balk('Stickerboek', 'taken') + '<div class="scroll"><stickerboek-card></stickerboek-card></div>';
  }

  _sbSync() {
    const sb = this._view === 'stickers' && this._r.querySelector('stickerboek-card');
    if (!sb || !this._h) return;
    if (sb._sbVoor !== this._sbP || !sb._c) { sb.setConfig({ ingebed: true, start: this._sbP, sensor: this._c.sensor, kleuren: this._kleuren() }); sb._sbVoor = this._sbP; }
    sb.hass = this._h;
  }

  _vDoel() {
    const esc = tkEsc, nu = new Date(), hist = tkList(this._h.states[this._c.sensor]?.attributes?.doelen_historie);
    const mn = (m) => { const q = String(m).split('-'); return `${TK_MND[Number(q[1]) - 1] || ''} ${q[0]}`; };
    return this._balk('Samen-doel', 'taken') + `<div class="scroll"><div class="two">
<section class="card"><div class="lbl">Doel voor ${esc(TK_MND[nu.getMonth()])}</div>
<label class="fld">Beloning<input type="text" maxlength="60" data-f="doelBel" value="${esc(this._form.doelBel || '')}" placeholder="Bijvoorbeeld: samen pannenkoeken bakken"></label>
<label class="fld">Aantal sterren samen<input type="number" min="1" max="500" inputmode="numeric" data-f="doelSt" value="${esc(this._form.doelSt || '')}"></label>
<div class="tag">Op de 1e van de maand begint de teller opnieuw.</div>
<div class="acts2"><button class="back" data-act="view" data-v="taken">Annuleren</button><button class="btn" data-act="tk-doelok">Opslaan</button></div></section>
<section class="card"><div class="lbl">Eerdere maanden</div>${hist.map((d2) => `<div class="row"><div><b>${esc(mn(d2.maand))}</b><div class="tag">${esc(d2.beloning || 'Geen beloning')}</div></div><span class="${d2.gehaald ? 'ok' : 'tag'}">${Number(d2.stand) || 0} / ${Number(d2.sterren) || 0} ★${d2.gehaald ? ' · gehaald' : ''}</span></div>`).join('') || '<div class="tag">Nog geen eerdere maanden</div>'}</section></div></div>`;
  }
}

if (!customElements.get('taken-card')) customElements.define('taken-card', TakenCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'taken-card', name: 'Taken', description: 'Takenlijst voor kinderen met sterren, bonustaken, samen-doel en stickerboek' });
