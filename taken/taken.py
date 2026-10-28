#!/usr/bin/env python3
"""Takenlijst voor kinderen: afvinken, sterren, bonustaken, envelopjes met stickers en een samen-doel per maand.

Bestanden in /config/taken/:
  taken.json   vaste taken en instellingen (handmatig aan te passen)
  log.json     alles wat er gebeurt (afvinken, bonus, aanvraag, envelop)
  doel.json    maanddoelen per maand
  albums/      stickeralbums (album.json per seizoen)
  context.json laatst bekende schoolvakantie-stand
  status.json  uitvoer voor de sensor (wordt na elke actie opnieuw geschreven)

Gebruik:
  taken.py status [--vakantie on|off]
  taken.py afvinken --taak ID --persoon KIND|Samen|Ouder [--voor KIND]
  taken.py ongedaan --id N
  taken.py bonus --naam TEKST --persoon KIND|Samen|Ouder
  taken.py aanvraag --taak ID
  taken.py envelop --persoon KIND
  taken.py samen_envelop --persoon KIND
  taken.py doel --beloning TEKST --sterren N [--maand JJJJ-MM]
  taken.py stickers   (pakt albums/*.zip uit naar /config/www/stickers/<album>/)
Optioneel overal: --nu 'JJJJ-MM-DD HH:MM' (alleen voor testen).
"""
import argparse, fcntl, json, os, random, tempfile, time
from datetime import datetime, timedelta, date

MAP = os.environ.get('TAKEN_MAP', '/config/taken')
P = lambda n: os.path.join(MAP, n)
KINDEREN_STD = ['Kind 1', 'Kind 2']  # alleen als taken.json geen 'personen' heeft


def lees(naam, std):
    try:
        with open(P(naam), encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return std
    # Kapot bestand: fout in plaats van leeg verder (zou log.json wissen)


def schrijf(naam, data):
    fd, tmp = tempfile.mkstemp(dir=MAP, suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        if naam == 'status.json':
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        else:
            json.dump(data, f, ensure_ascii=False, indent=1)
    os.chmod(tmp, 0o644)
    os.replace(tmp, P(naam))


def tijd(s):
    return datetime.strptime(s, '%Y-%m-%d %H:%M:%S')


def hm(s):
    h, m = s.split(':')
    return int(h) * 60 + int(m)


# ---------- regels ----------

def maandag(d):
    return d - timedelta(days=d.weekday())


def zichtbaar(t, nu, schooldag):
    """Is taak t nu aan de beurt (los van of hij al gedaan is)?"""
    r = t.get('ritme', 'dag')
    minuut = nu.hour * 60 + nu.minute
    if t.get('vanaf') and minuut < hm(t['vanaf']):
        return False
    if t.get('tot') and minuut >= hm(t['tot']):
        return False
    if r == 'schooldag' and not schooldag:
        return False
    if r == '2_weken_weekend':
        return nu.weekday() >= 5 and nu.isocalendar()[1] % 2 == 0
    return True


def periode_start(t, nu, log):
    """Vanaf wanneer telt een afvinking voor deze taak (begin van de huidige periode)."""
    r = t.get('ritme', 'dag')
    vandaag = datetime(nu.year, nu.month, nu.day)
    if r in ('dag', 'schooldag'):
        return vandaag
    if r == 'week':
        return datetime.combine(maandag(nu.date()), datetime.min.time())
    if r == '2_weken_weekend':
        return vandaag - timedelta(days=nu.weekday() - 5)  # zaterdag van dit weekend
    if r.startswith('elke_') and r.endswith('_dagen'):
        n = int(r.split('_')[1])
        ma = datetime.combine(maandag(nu.date()), datetime.min.time())
        return max(ma, vandaag - timedelta(days=n - 1))
    if r == 'op_aanvraag':
        aanvr = [tijd(e['ts']) for e in log if e['soort'] == 'aanvraag' and e['taak'] == t['id']]
        return max(aanvr) if aanvr else None
    return vandaag


def telt_voor(e, k):
    """Telt ster-regel e mee voor kind k? 'Samen' telt voor elk kind in ster_voor (standaard allebei)."""
    if not e.get('ster'):
        return False
    if e.get('persoon') == k:
        return True
    return e.get('persoon') == 'Samen' and k in e.get('ster_voor', [k])


def herbereken_bonus(log, dag, kinderen, maxi):
    """Verdeel de bonussterren van een dag opnieuw (in volgorde), na toevoegen of terugzetten; max per kind per dag."""
    tel = {k: 0 for k in kinderen}
    for x in log:
        if x['soort'] != 'bonus' or x.get('ongedaan') or x['ts'][:10] != dag:
            continue
        p = x.get('persoon')
        if p in tel:
            x['ster'] = tel[p] < maxi
            if x['ster']:
                tel[p] += 1
        elif p == 'Samen':
            sv = [k for k in kinderen if tel[k] < maxi]
            for k in sv:
                tel[k] += 1
            x['ster_voor'] = sv
            x['ster'] = bool(sv)
        else:
            x['ster'] = False


def heeft_ster(t, persoon, kinderen):
    if persoon not in list(kinderen) + ['Samen']:
        return False
    if t.get('soort') == 'eigen':
        return True
    return bool(t.get('kinderklus'))


# ---------- status ----------

def bereken(nu, vakantie):
    cfg = lees('taken.json', {'taken': []})
    log = [e for e in lees('log.json', []) if not e.get('ongedaan')]
    kinderen = cfg.get('personen', KINDEREN_STD)
    schooldag = nu.weekday() < 5 and not vakantie
    vandaag = datetime(nu.year, nu.month, nu.day)
    ma = datetime.combine(maandag(nu.date()), datetime.min.time())
    maand0 = datetime(nu.year, nu.month, 1)

    def afgevinkt(t, voor, sinds):
        for e in reversed(log):
            if e['soort'] != 'taak' or e['taak'] != t['id']:
                continue
            if t.get('soort') == 'eigen' and e.get('voor') != voor:
                continue
            if sinds is not None and tijd(e['ts']) >= sinds:
                return e
        return None

    lijst = {'dag': [], 'week': [], 'ouder': []}
    for t in cfg.get('taken', []):
        sinds = periode_start(t, nu, log)
        if t.get('ritme') == 'op_aanvraag' and sinds is None:
            continue
        zicht = zichtbaar(t, nu, schooldag)
        voor_lijst = kinderen if t.get('soort') == 'eigen' else [None]
        for voor in voor_lijst:
            e = afgevinkt(t, voor, sinds)
            if not zicht and not e:
                continue
            if e and t.get('ritme') == 'op_aanvraag' and tijd(e['ts']) < vandaag:
                continue  # gisteren al gedaan: pas weer tonen bij een nieuwe aanvraag
            groep = 'ouder' if t.get('soort') == 'ouder' else ('week' if t.get('ritme') in ('week', '2_weken_weekend') else 'dag')
            lijst[groep].append({
                'id': t['id'], 'naam': t['naam'], 'soort': t.get('soort', 'huis'), 'ritme': t.get('ritme', 'dag'),
                'voor': voor, 'kinderklus': bool(t.get('kinderklus')), 'telt_mee': bool(t.get('telt_mee', False)),
                'toelichting': t.get('toelichting', ''), 'vanaf': t.get('vanaf', ''), 'tot': t.get('tot', ''), 'optioneel': bool(t.get('optioneel')),
                'gedaan': bool(e), 'door': e.get('persoon') if e else None, 'om': e['ts'][11:16] if e else None,
                'log_id': e['id'] if e else None,
            })

    bonus = [{'log_id': e['id'], 'naam': e['naam'], 'door': e.get('persoon'), 'om': e['ts'][11:16], 'ster': e.get('ster', False)}
             for e in log if e['soort'] == 'bonus' and tijd(e['ts']) >= vandaag]

    def sterren(persoon, sinds):
        return sum(1 for e in log if telt_voor(e, persoon) and tijd(e['ts']) >= sinds)

    albums = actieve_albums(nu)
    album = albums[0] if albums else None
    per = {}
    for k in kinderen:
        totaal = sterren(k, datetime(2000, 1, 1))
        geopend = [e for e in log if e['soort'] == 'envelop' and e.get('persoon') == k]
        # envelop_vanaf (taken.json, 'JJJJ-MM-DD'): alleen sterren en envelopjes vanaf die dag tellen voor nieuwe envelopjes
        ev0 = datetime.strptime(cfg['envelop_vanaf'], '%Y-%m-%d') if cfg.get('envelop_vanaf') else datetime(2000, 1, 1)
        e_st = sterren(k, ev0)
        e_op = sum(1 for e in geopend if tijd(e['ts']) >= ev0)
        ep = envelop_per(cfg)
        e_env = max(0, e_st // ep - e_op)
        eigen_vandaag = [x for x in lijst['dag'] if x['voor'] == k and x['telt_mee']]
        stickers = [{'id': e['sticker'], 'album': e['album'], 'op': e['ts'][:10]} for e in geopend if e.get('sticker')]
        stickers += [{'id': e['sticker'], 'album': e['album'], 'op': e['ts'][:10], 'samen': True} for e in log if e['soort'] == 'samen_envelop' and e.get('persoon') == k]
        per[k] = {
            'sterren_vandaag': sterren(k, vandaag), 'sterren_week': sterren(k, ma), 'sterren_maand': sterren(k, maand0),
            'sterren_totaal': totaal,
            'bonus_vandaag': sum(1 for e in log if e['soort'] == 'bonus' and telt_voor(e, k) and tijd(e['ts']) >= vandaag),
            'enveloppen': e_env,
            'nog_tot_envelop': (e_op + e_env + 1) * ep - e_st,
            'dag_compleet': bool(eigen_vandaag) and all(x['gedaan'] for x in eigen_vandaag),
            'week_sterren': [sterren_dag(log, k, ma + timedelta(days=i)) for i in range(7)],
            'stickers': stickers,
            'album_vol': bool(album) and len(vrije_stickers(album, stickers)) == 0,
        }

    doelen = lees('doel.json', {})
    mk = nu.strftime('%Y-%m')
    d = doelen.get(mk) or cfg.get('maanddoel', {})
    stand = sum(per[k]['sterren_maand'] for k in kinderen)
    doel = {'maand': mk, 'beloning': d.get('beloning', ''), 'sterren': int(d.get('sterren', 0) or 0), 'stand': stand}
    doel['gehaald'] = bool(doel['sterren']) and stand >= doel['sterren']
    historie = []
    for m, v in sorted(doelen.items(), reverse=True):
        if m >= mk or not v.get('sterren'):
            continue
        j, mm = map(int, m.split('-'))
        s0 = datetime(j, mm, 1)
        s1 = datetime(j + (mm == 12), mm % 12 + 1, 1)
        st = sum(1 for e in log for k in kinderen if telt_voor(e, k) and s0 <= tijd(e['ts']) < s1)
        historie.append({'maand': m, 'beloning': v.get('beloning', ''), 'sterren': v['sterren'], 'stand': st, 'gehaald': st >= v['sterren']})

    # samen: dagen waarop iedereen alles af had; per samen_dagen zo'n dag een samen-sticker voor elk kind
    sa = samen_album()
    sd = samen_dagen(cfg, log, kinderen, nu, vakantie)
    nodig = max(1, int(cfg.get('samen_dagen', 5)))
    verdiend = len(sd) // nodig
    samen = {'dagen': len(sd), 'pootjes': len(sd) % nodig, 'nodig': nodig, 'verdiend': verdiend,
             'vandaag': nu.strftime('%Y-%m-%d') in sd, 'laatste': sd[-5:],
             'album': {'id': sa['album'], 'titel': sa.get('titel', 'Samen'), 'pad': sa.get('pad', ''),
                       'stickers': [{'id': x['id'], 'naam': x['naam'], 'soort': x.get('soort', 'samen'), 'nr': x['nr']} for x in sa['stickers']]} if sa else None}
    for k in kinderen:
        open_s = sum(1 for e in log if e['soort'] == 'samen_envelop' and e.get('persoon') == k)
        per[k]['samen_enveloppen'] = max(0, min(verdiend, len(sa['stickers']) if sa else 0) - open_s)

    return {
        'samen': samen,
        'bijgewerkt': nu.strftime('%Y-%m-%d %H:%M'), 'schooldag': schooldag, 'vakantie': vakantie,
        'kinderen': kinderen, 'taken_dag': lijst['dag'], 'taken_week': lijst['week'], 'taken_ouder': lijst['ouder'],
        'bonus': bonus, 'bonus_suggesties': cfg.get('bonus_suggesties', []), 'bonus_max': cfg.get('bonus_max_sterren_per_dag', 2),
        'per_kind': per, 'maanddoel': doel, 'doelen_historie': historie[:12],
        'album': {'id': album['album'], 'titel': album['titel'], 'pad': album.get('pad', ''), 'van': album.get('van'), 'tot': album.get('tot'),
                  'stickers': [{'id': x['id'], 'naam': x['naam'], 'soort': x['soort'], 'nr': x['nr'], 'pagina': x['pagina']} for x in album['stickers']]} if album else None,
        'envelop_per': envelop_per(cfg),
    }


def sterren_dag(log, k, dag):
    eind = dag + timedelta(days=1)
    return sum(1 for e in log if telt_voor(e, k) and dag <= tijd(e['ts']) < eind)


def envelop_per(cfg):
    return max(1, int(cfg.get('envelop_per_sterren', 3)))


# ---------- albums ----------

def actieve_albums(nu):
    d = P('albums')
    res = []
    if not os.path.isdir(d):
        return res
    for f in sorted(os.listdir(d)):
        if not f.endswith('.json'):
            continue
        try:
            a = json.load(open(os.path.join(d, f), encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            continue
        if a.get('samen'):
            continue
        if a.get('van', '0000') <= nu.strftime('%Y-%m-%d') <= a.get('tot', '9999'):
            res.append(a)
    return res


def samen_album():
    """Album met samen-stickers (albums/*.json met "samen": true); de volgorde ligt vast per album."""
    d = P('albums')
    if not os.path.isdir(d):
        return None
    for f in sorted(os.listdir(d)):
        if f.endswith('.json'):
            try:
                a = json.load(open(os.path.join(d, f), encoding='utf-8'))
            except (OSError, json.JSONDecodeError):
                continue
            if a.get('samen'):
                volg = [x['id'] for x in a['stickers'] if not x.get('laatst')]
                random.Random(a['album']).shuffle(volg)
                volg += [x['id'] for x in a['stickers'] if x.get('laatst')]  # bijzondere sticker als laatste
                a['volgorde'] = volg
                return a
    return None


def samen_dagen(cfg, log, kinderen, nu, vakantie_nu=False):
    """Datums (vanaf samen_vanaf) waarop alle kinderen al hun vaste dagtaken af hadden (eigen, telt_mee, ritme dag;
    ritme schooldag alleen op ma-vr buiten de vakantie; vakantiedagen staan in context.json)."""
    eig = [t for t in cfg.get('taken', []) if t.get('soort') == 'eigen' and t.get('telt_mee') and not t.get('optioneel')]
    ids_dag = {t['id'] for t in eig if t.get('ritme', 'dag') == 'dag'}
    ids_school = {t['id'] for t in eig if t.get('ritme') == 'schooldag'}
    ids = ids_dag | ids_school
    if not ids_dag:
        return []
    vak = set(lees('context.json', {}).get('vakantie_dagen', []))
    if vakantie_nu:
        vak.add(nu.strftime('%Y-%m-%d'))
    gedaan = {}
    for e in log:
        if e['soort'] == 'taak' and not e.get('ongedaan') and e['taak'] in ids and e.get('voor') in kinderen:
            gedaan.setdefault((e['ts'][:10], e['voor']), set()).add(e['taak'])
    # samen_vanaf in taken.json; anders vanaf de eerste afvinking (of vandaag)
    eerste = min((e['ts'][:10] for e in log if e.get('soort') == 'taak'), default=nu.strftime('%Y-%m-%d'))
    start = datetime.strptime(cfg.get('samen_vanaf') or eerste, '%Y-%m-%d').date()
    res, d = [], start
    while d <= nu.date():
        dag = d.strftime('%Y-%m-%d')
        nodig = ids_dag | (ids_school if d.weekday() < 5 and dag not in vak else set())
        if all(nodig <= gedaan.get((dag, k), set()) for k in kinderen):
            res.append(dag)
        d += timedelta(days=1)
    return res


def vrije_stickers(album, stickers):
    al = {s['id'] for s in stickers if s.get('album') == album['album']}
    return [s for s in album['stickers'] if s['id'] not in al]


def kies_sticker(album, stickers, rnd):
    vrij = vrije_stickers(album, stickers)
    if not vrij:
        return None
    heeft = len(album['stickers']) - len(vrij)
    gewoon = [s for s in vrij if s['soort'] == 'gewoon']
    zeld = [s for s in vrij if s['soort'] == 'zeldzaam']
    goud = [s for s in vrij if s['soort'] == 'goud' and heeft >= 12]  # goud pas na 12 stickers
    pot = [(gewoon, 82), (zeld, 14), (goud, 4)]
    pot = [(l, w) for l, w in pot if l]
    if not pot:
        pot = [(vrij, 1)]
    keuze = rnd.choices([l for l, _ in pot], weights=[w for _, w in pot])[0]
    return rnd.choice(keuze)


# ---------- acties ----------

def nieuw_id(log):
    return (max((e['id'] for e in log), default=0) + 1)


def main():
    # Eén actie tegelijk: voorkomt dat twee tikken elkaars log.json overschrijven
    with open(P('.taken.lock'), 'a') as fh:
        eind = time.monotonic() + 30
        while True:
            try:
                fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() > eind:
                    raise TimeoutError('taken: slot langer dan 30 s bezet')
                time.sleep(0.05)
        try:
            _main()
        finally:
            fcntl.flock(fh, fcntl.LOCK_UN)


def _main():
    ap = argparse.ArgumentParser()
    ap.add_argument('actie')
    ap.add_argument('--taak'); ap.add_argument('--persoon'); ap.add_argument('--voor')
    ap.add_argument('--id', type=int); ap.add_argument('--naam'); ap.add_argument('--beloning')
    ap.add_argument('--sterren', type=int); ap.add_argument('--maand')
    ap.add_argument('--vakantie'); ap.add_argument('--nu')
    a = ap.parse_args()

    nu = datetime.strptime(a.nu, '%Y-%m-%d %H:%M') if a.nu else datetime.now().replace(microsecond=0)
    ts = nu.strftime('%Y-%m-%d %H:%M:%S')
    ctx = lees('context.json', {'vakantie': False})
    if a.vakantie is not None:
        ctx['vakantie'] = str(a.vakantie).lower() in ('on', 'true', '1', 'ja')
        if ctx['vakantie']:
            # vakantiedagen onthouden, zodat de samen-telling achteraf weet dat de schooltas die dag niet hoefde
            vd = set(ctx.get('vakantie_dagen', [])) | {nu.strftime('%Y-%m-%d')}
            ctx['vakantie_dagen'] = sorted(vd)[-400:]
        schrijf('context.json', ctx)

    log = lees('log.json', [])
    cfg = lees('taken.json', {'taken': []})
    taken = {t['id']: t for t in cfg.get('taken', [])}
    kinderen = cfg.get('personen', KINDEREN_STD)
    # naam hoofdletterongevoelig koppelen aan de schrijfwijze in taken.json; elke andere naam telt als Ouder
    p0 = (a.persoon or '').strip()
    namen = {n.lower(): n for n in list(kinderen) + ['Samen', 'Ouder']}
    persoon = (namen.get(p0.lower(), 'Ouder') if p0 else None)

    if a.actie == 'afvinken':
        t = taken.get(a.taak)
        if t and t.get('soort') == 'eigen' and persoon == 'Samen':
            t = None  # eigen taken zijn per kind; 'Samen' geldt alleen voor huis- en bonustaken
        if t:
            voor = (namen.get((a.voor or '').strip().lower()) if a.voor else None) if t.get('soort') == 'eigen' else None
            voor = voor if voor in kinderen else None
            if t.get('soort') == 'eigen' and not voor:
                voor = persoon if persoon in kinderen else None
            if t.get('soort') == 'eigen' and persoon in kinderen:
                voor = persoon
            st = bereken(nu, ctx['vakantie'])
            al = [x for x in st['taken_dag'] + st['taken_week'] + st['taken_ouder'] if x['id'] == t['id'] and x['voor'] == voor and x['gedaan']]
            if not al:
                log.append({'id': nieuw_id(log), 'ts': ts, 'soort': 'taak', 'taak': t['id'], 'persoon': persoon, 'voor': voor,
                            'ster': heeft_ster(t, persoon, kinderen)})
    elif a.actie == 'ongedaan' and a.id:
        for e in log:
            if e['id'] == a.id and e['soort'] in ('taak', 'bonus') and not e.get('ongedaan'):
                e['ongedaan'] = ts
                if e['soort'] == 'bonus':
                    # bonusster vrijgekomen: de eerstvolgende bonus van die dag krijgt hem
                    herbereken_bonus(log, e['ts'][:10], cfg.get('personen', KINDEREN_STD), int(cfg.get('bonus_max_sterren_per_dag', 2)))
    elif a.actie == 'bonus' and a.naam:
        log.append({'id': nieuw_id(log), 'ts': ts, 'soort': 'bonus', 'naam': a.naam.strip()[:60], 'persoon': persoon, 'ster': False})
        herbereken_bonus(log, ts[:10], cfg.get('personen', KINDEREN_STD), int(cfg.get('bonus_max_sterren_per_dag', 2)))
    elif a.actie == 'aanvraag' and a.taak in taken:
        log.append({'id': nieuw_id(log), 'ts': ts, 'soort': 'aanvraag', 'taak': a.taak})
    elif a.actie == 'envelop' and persoon in kinderen:
        st = bereken(nu, ctx['vakantie'])
        k = st['per_kind'][persoon]
        albums = actieve_albums(nu)
        if k['enveloppen'] > 0 and albums:
            album = albums[0]
            s = kies_sticker(album, k['stickers'], random.Random())
            if s:
                log.append({'id': nieuw_id(log), 'ts': ts, 'soort': 'envelop', 'persoon': persoon,
                            'album': album['album'], 'sticker': s['id'], 'zeldzaam': s['soort']})
    elif a.actie == 'samen_envelop' and persoon in kinderen:
        st = bereken(nu, ctx['vakantie'])
        sa = samen_album()
        if sa and st['per_kind'][persoon].get('samen_enveloppen', 0) > 0:
            m = sum(1 for e in log if e['soort'] == 'samen_envelop' and e.get('persoon') == persoon)
            if m < len(sa['volgorde']):
                log.append({'id': nieuw_id(log), 'ts': ts, 'soort': 'samen_envelop', 'persoon': persoon,
                            'album': sa['album'], 'sticker': sa['volgorde'][m], 'mijlpaal': m + 1})
    elif a.actie == 'stickers':
        # pakt albums/<album>.zip uit naar /config/www/taken/stickers/<album>/ (alleen png en svg)
        import zipfile
        doel0 = os.path.join(os.path.dirname(MAP.rstrip('/')), 'www', 'taken', 'stickers')
        for f in sorted(os.listdir(P('albums'))) if os.path.isdir(P('albums')) else []:
            if not f.endswith('.zip'):
                continue
            uit = os.path.join(doel0, f[:-4])
            os.makedirs(uit, exist_ok=True)
            n = 0
            with zipfile.ZipFile(os.path.join(P('albums'), f)) as z:
                for info in z.infolist():
                    naam = os.path.basename(info.filename)
                    if info.is_dir() or not naam.lower().endswith(('.png', '.svg')) or naam.startswith('.'):
                        continue
                    with z.open(info) as bron, open(os.path.join(uit, naam), 'wb') as dst:
                        dst.write(bron.read())
                    n += 1
            print(f'{f}: {n} stickers naar {uit}')
    elif a.actie == 'doel':
        doelen = lees('doel.json', {})
        m = a.maand or nu.strftime('%Y-%m')
        doelen[m] = {'beloning': (a.beloning or '').strip()[:60], 'sterren': max(0, int(a.sterren or 0))}
        schrijf('doel.json', doelen)

    if a.actie != 'status' or not os.path.exists(P('log.json')):
        schrijf('log.json', log)
    st = bereken(nu, ctx['vakantie'])
    if a.actie in ('envelop', 'samen_envelop') and log and log[-1]['soort'] == a.actie and log[-1]['ts'] == ts:
        st['laatste_envelop'] = {'persoon': log[-1]['persoon'], 'sticker': log[-1]['sticker'], 'album': log[-1]['album'], 'ts': ts,
                                 'samen': a.actie == 'samen_envelop'}
    else:
        st['laatste_envelop'] = lees('status.json', {}).get('laatste_envelop')
    schrijf('status.json', st)
    print('ok')


if __name__ == '__main__':
    main()
