/* Taak-editor voor Home Assistant.
  Bron: /local/taken/taken-editor-card.js?v=4 (JavaScript-module)
   Gebruik: type: custom:taken-editor-card
*/

const TE_DEFAULTS = { sensor: 'sensor.taken_status', script: 'script.taken_bewerken' };
const teEsc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const teList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { try { return JSON.parse(value); } catch (error) { return []; } }
  return [];
};
const TE_RHYTHMS = [
  ['dag', 'Elke dag'], ['schooldag', 'Schooldag'], ['week', 'Elke week'],
  ['elke_custom', 'Elke N dagen'], ['2_weken_weekend', 'Om de week in het weekend'], ['op_aanvraag', 'Op aanvraag'],
];

const TE_CSS = `
:host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family)}
*{box-sizing:border-box}button,input,select{font:inherit;color:inherit}
.wrap{max-width:920px;margin:0 auto;padding:1rem}
.head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--divider-color);padding:0 0 1rem;margin-bottom:1rem}
h1{font-family:var(--paper-font-headline_-_font-family,Georgia,serif);font-size:1.55rem;font-weight:500;line-height:1.15;margin:0}
.primary,.quiet,.danger{min-height:42px;border:0;border-radius:8px;padding:.55rem .9rem;cursor:pointer;font-weight:600}
.primary{background:var(--primary-color);color:var(--text-primary-color,#fff)}.quiet{background:var(--secondary-background-color);outline:1px solid var(--divider-color)}.danger{background:color-mix(in srgb,var(--error-color,#c33) 12%,var(--card-background-color));color:var(--error-color,#c33)}
.list{display:grid;gap:.45rem}.item{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.8rem;padding:.7rem 0;border-bottom:1px solid var(--divider-color)}
.name{font-weight:600;overflow-wrap:anywhere}.meta{display:flex;gap:.45rem .8rem;flex-wrap:wrap;margin-top:.18rem;color:var(--secondary-text-color);font-size:.86rem}.id{font-family:monospace}
.actions{display:flex;gap:.45rem}.actions button{min-height:40px}
.form{margin-top:1.2rem;padding:1rem;background:var(--secondary-background-color);border-radius:8px}
.form h2{font-size:1.05rem;margin:0 0 .9rem;font-weight:600}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}
label{display:flex;flex-direction:column;gap:.3rem;min-width:0;font-size:.88rem;color:var(--secondary-text-color)}
input[type=text],input[type=time],input[type=number],select{width:100%;min-height:42px;border:1px solid var(--divider-color);border-radius:6px;padding:.45rem .65rem;background:var(--card-background-color);color:var(--primary-text-color)}
.editor-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:1rem;background:#0007}
.editor-dialog{width:min(920px,calc(100vw - 2rem));max-height:calc(100dvh - 2rem);overflow:auto;border-radius:10px;background:var(--card-background-color);color:var(--primary-text-color);box-shadow:0 12px 48px #0005}
.editor-dialog .form{margin:0;padding:1.2rem;background:var(--card-background-color)}
.checks{display:flex;gap:.8rem 1.4rem;flex-wrap:wrap;margin-top:.85rem}.checks label{flex-direction:row;align-items:center;min-height:36px;color:var(--primary-text-color)}input[type=checkbox]{width:18px;height:18px;accent-color:var(--primary-color)}
.form-actions{display:flex;justify-content:flex-end;gap:.55rem;margin-top:1rem}.empty,.message{padding:.9rem 0;color:var(--secondary-text-color)}.message.error{color:var(--error-color,#c33)}
@media(max-width:600px){.wrap{padding:.8rem}.head{align-items:flex-start}.fields{grid-template-columns:1fr}.item{grid-template-columns:minmax(0,1fr)}.actions button{flex:1}.form-actions button{flex:1}}
`;

class TakenEditorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = TE_CSS;
    this._root = document.createElement('div');
    this.shadowRoot.append(style, this._root);
    this._form = null;
    this._editing = false;
    this._deleteConfirm = '';
    this._message = '';
    this._error = false;
    this.shadowRoot.addEventListener('click', (event) => {
      const overlay = event.target.closest('.editor-overlay');
      if (overlay && event.target === overlay) {
        this._form = null;
        this._render(true);
        return;
      }
      const target = event.target.closest('[data-action]');
      if (target) this._act(target.dataset.action, target.dataset.id);
    });
    this.shadowRoot.addEventListener('input', (event) => this._updateField(event.target));
    this.shadowRoot.addEventListener('change', (event) => this._updateField(event.target));
    this.shadowRoot.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this._form && !event.target.matches('select')) {
        event.preventDefault();
        this._form = null;
        this._render(true);
      }
    });
  }

  setConfig(config) { this._config = { ...TE_DEFAULTS, ...(config || {}) }; }
  getCardSize() { return 6; }
  static getStubConfig() { return {}; }
  set hass(value) { this._hass = value; this._render(); }

  _updateField(target) {
    if (!target.dataset.field || !this._form) return;
    this._form[target.dataset.field] = target.type === 'checkbox' ? target.checked : target.value;
  }

  _newForm(task = {}) {
    const interval = String(task.ritme || '').match(/^elke_(\d+)_dagen$/);
    return {
      id: task.id || '', naam: task.naam || '', soort: task.soort || 'eigen', ritme: interval ? 'elke_custom' : task.ritme || 'dag',
      aantal_dagen: interval?.[1] || '3',
      vanaf: task.vanaf || '', tot: task.tot || '', toelichting: task.toelichting || '',
      telt_mee: Boolean(task.telt_mee), optioneel: Boolean(task.optioneel), kinderklus: Boolean(task.kinderklus),
    };
  }

  _act(action, id) {
    const tasks = teList(this._hass?.states[this._config.sensor]?.attributes?.taak_config);
    if (action === 'add') {
      this._form = this._newForm(); this._editing = false; this._deleteConfirm = ''; this._message = '';
    } else if (action === 'edit') {
      const task = tasks.find((item) => item.id === id);
      if (!task) return this._notify('Deze taak is niet meer beschikbaar.', true);
      this._form = this._newForm(task); this._editing = true; this._deleteConfirm = ''; this._message = '';
    } else if (action === 'cancel') {
      this._form = null; this._message = '';
      return this._render(true);
    } else if (action === 'save') {
      return this._save();
    } else if (action === 'delete') {
      if (this._deleteConfirm !== id) {
        this._deleteConfirm = id;
        this._notify('Tik nogmaals op Verwijderen om deze taak te wissen.');
        return;
      }
      this._call('taak_verwijderen', id, `Taak "${tasks.find((task) => task.id === id)?.naam || id}" verwijderd.`);
    }
    this._render();
  }

  _save() {
    const values = { ...this._form };
    const tasks = teList(this._hass?.states[this._config.sensor]?.attributes?.taak_config);
    const ids = new Set(tasks.map((task) => task.id));
    let id = values.id || values.naam.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!this._editing && !values.id) {
      const base = id;
      let suffix = 2;
      while (ids.has(id)) id = `${base}_${suffix++}`;
    } else if (!this._editing && ids.has(id)) {
      return this._notify('Deze taak-id is al in gebruik.', true);
    }
    const task = { ...values, id, naam: values.naam.trim().replace(/\s+/g, ' ') };
    if (task.ritme === 'elke_custom') {
      const interval = Number(task.aantal_dagen);
      if (!Number.isInteger(interval) || interval < 1 || interval > 365) return this._notify('Kies een interval van 1 tot 365 dagen.', true);
      task.ritme = `elke_${interval}_dagen`;
    }
    delete task.aantal_dagen;
    if (!task.id || !task.naam) return this._notify('Vul ten minste een taaknaam in.', true);
    if (!/^[a-z0-9_]{1,48}$/.test(task.id)) return this._notify('Gebruik voor de taak-id kleine letters, cijfers en underscores.', true);
    if (task.naam.length > 80) return this._notify('De taaknaam mag maximaal 80 tekens zijn.', true);
    this._call('taak_opslaan', JSON.stringify(task), this._editing ? 'Taak bijgewerkt.' : 'Taak toegevoegd.');
  }

  _call(action, task, success) {
    const script = this._config.script;
    if (!this._hass?.states[script]) return this._notify(`${script} ontbreekt. Controleer of packages/taken.yaml geladen is.`, true);
    this._hass.callService('script', script.split('.')[1], { actie: action, taak: task })
      .then(() => { this._form = null; this._deleteConfirm = ''; this._notify(success, false, true); })
      .catch((error) => this._notify(error?.message || 'Opslaan is mislukt.', true, true));
  }

  _notify(message, error = false, force = false) {
    this._message = message; this._error = error; this._render(force);
  }

  _render(force = false) {
    if (!this._config || !this._hass) return;
    const active = this.shadowRoot.activeElement;
    if (!force && this._form && active && active.matches('input, select, textarea')) return;
    const entity = this._hass.states[this._config.sensor];
    const tasks = teList(entity?.attributes?.taak_config);
    const esc = teEsc;
    const rows = tasks.map((task) => `<div class="item"><div><div class="name">${esc(task.naam)}</div><div class="meta"><span class="id">${esc(task.id)}</span><span>${esc(task.soort || 'huis')}</span><span>${esc(task.ritme || 'dag')}</span></div></div><div class="actions"><button class="quiet" data-action="edit" data-id="${esc(task.id)}">Wijzigen</button><button class="${this._deleteConfirm === task.id ? 'danger' : 'quiet'}" data-action="delete" data-id="${esc(task.id)}">${this._deleteConfirm === task.id ? 'Bevestig verwijderen' : 'Verwijderen'}</button></div></div>`).join('');
    const form = this._form ? `<div class="editor-overlay"><section class="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">${this._formHtml()}</section></div>` : '';
    const message = this._message ? `<div class="message${this._error ? ' error' : ''}" role="status">${esc(this._message)}</div>` : '';
    const noSensor = !entity ? `<div class="message error">${esc(this._config.sensor)} ontbreekt. Controleer of de taken-package geladen is.</div>` : '';
    this._root.innerHTML = `<main class="wrap"><header class="head"><h1>Taken beheren</h1><button class="primary" data-action="add">Taak toevoegen</button></header>${noSensor}${message}<div class="list">${rows || '<div class="empty">Nog geen taken ingesteld.</div>'}</div>${form}</main>`;
    const dialog = this._root.querySelector('.editor-dialog');
    if (dialog) dialog.querySelector('input, select, button')?.focus();
  }

  _formHtml() {
    const value = (key) => teEsc(this._form[key]);
    const checked = (key) => this._form[key] ? ' checked' : '';
    const rhythms = [...TE_RHYTHMS];
    if (!rhythms.some(([key]) => key === this._form.ritme)) rhythms.push([this._form.ritme, this._form.ritme.replaceAll('_', ' ')]);
    return `<section class="form"><h2 id="editor-title">${this._editing ? 'Taak wijzigen' : 'Nieuwe taak'}</h2><div class="fields">
<label>Naam<input type="text" maxlength="80" data-field="naam" value="${value('naam')}" autocomplete="off"></label>
<label>Taak-id<input type="text" maxlength="48" data-field="id" value="${value('id')}" placeholder="automatisch uit naam" ${this._editing ? 'readonly' : ''} autocomplete="off"></label>
<label>Soort<select data-field="soort">${[['eigen', 'Per kind'], ['huis', 'Huistaak'], ['ouder', 'Oudertaak']].map(([key, label]) => `<option value="${key}"${this._form.soort === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
<label>Ritme<select data-field="ritme">${rhythms.map(([key, label]) => `<option value="${teEsc(key)}"${this._form.ritme === key ? ' selected' : ''}>${teEsc(label)}</option>`).join('')}</select></label>
<label>Aantal dagen<input type="number" min="1" max="365" data-field="aantal_dagen" value="${value('aantal_dagen')}" inputmode="numeric"></label>
<label>Zichtbaar vanaf<input type="time" data-field="vanaf" value="${value('vanaf')}"></label>
<label>Zichtbaar tot<input type="time" data-field="tot" value="${value('tot')}"></label>
<label>Toelichting<input type="text" maxlength="120" data-field="toelichting" value="${value('toelichting')}"></label>
</div><div class="checks"><label><input type="checkbox" data-field="telt_mee"${checked('telt_mee')}> Telt mee voor alles af</label><label><input type="checkbox" data-field="optioneel"${checked('optioneel')}> Optionele taak</label><label><input type="checkbox" data-field="kinderklus"${checked('kinderklus')}> Huistaak geeft een kind een ster</label></div>
<div class="form-actions"><button class="quiet" data-action="cancel">Annuleren</button><button class="primary" data-action="save">Opslaan</button></div></section>`;
  }
}

if (!customElements.get('taken-editor-card')) customElements.define('taken-editor-card', TakenEditorCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'taken-editor-card', name: 'Taken-editor', description: 'Taken toevoegen, wijzigen en verwijderen' });