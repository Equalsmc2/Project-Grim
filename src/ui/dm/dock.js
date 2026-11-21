// Bottom dock: music, ambience, presentation overlays and chat — reachable
// without leaving the encounter.
import { html, useState, useMemo, useEffect, useRef, Icon, Button, Popover, Segmented, cx, toast } from '../kit.js';
import { MUSIC_CATALOG } from '../../audio/music-catalog.js';
import { resolveMusic, formatDuration, TRACK_MAP } from '../../audio/music-playback.js';
import { importMusicArchives, musicArchiveStatus, clearMusicArchives } from '../../audio/music-local.js';
import { AMBIENCE_TRACKS } from '../../audio/ambience.js';
import { readFileAsDataUrl } from '../kit.js';

const ALBUMS = new Map(MUSIC_CATALOG.albums.map((a) => [a.id, a]));

export function musicActions(state, dispatch) {
  const m = state.music;
  const now = Date.now();
  const res = resolveMusic(m, now);
  return {
    res,
    play(trackId, playlist = m.playlist) { dispatch('music/set', { trackId, playlist, playing: true, startedAt: now, pausedAt: 0 }); },
    toggle() {
      if (!m.trackId) return;
      if (m.playing) dispatch('music/set', { playing: false, pausedAt: res.offset, trackId: res.track?.id || m.trackId });
      else dispatch('music/set', { playing: true, startedAt: now - (m.pausedAt || 0) * 1000 });
    },
    step(dir) {
      const list = res.list || [];
      if (!list.length) return;
      const i = ((res.index ?? 0) + dir + list.length) % list.length;
      dispatch('music/set', { trackId: list[i].id, playing: true, startedAt: now, pausedAt: 0 });
    },
    stop() { dispatch('music/set', { playing: false, pausedAt: 0 }); },
    volume(v) { dispatch('music/set', { volume: v }); },
    repeat(r) { dispatch('music/set', { repeat: r }); },
  };
}

function MusicLibrary({ state, dispatch, onClose }) {
  const [folder, setFolder] = useState('all');
  const [q, setQ] = useState('');
  const [local, setLocal] = useState('');
  const act = musicActions(state, dispatch);
  useEffect(() => { musicArchiveStatus().then((s) => setLocal(s?.text || describeLocal(s))).catch(() => setLocal('')); }, []);
  const tracks = useMemo(() => {
    let list = MUSIC_CATALOG.tracks;
    if (folder.startsWith('album:')) list = list.filter((t) => t.album === folder.slice(6));
    else if (folder.startsWith('mood:')) list = list.filter((t) => t.folder === folder.slice(5));
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((t) => t.title.toLowerCase().includes(s) || (ALBUMS.get(t.album)?.name || '').toLowerCase().includes(s));
    return list;
  }, [folder, q]);
  const current = state.music.trackId;
  return html`<div class="lib" role="dialog" aria-label="Music library">
    <header class="lib-head"><h3>Music</h3><input type="search" placeholder="Search tracks or games" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} aria-label="Search music" /><${Button} icon="close" aria-label="Close library" onClick=${onClose} /></header>
    <div class="lib-body">
      <nav class="lib-folders">
        <button type="button" class=${cx(folder === 'all' && 'is-on')} onClick=${() => setFolder('all')}>All tracks<small>${MUSIC_CATALOG.tracks.length}</small></button>
        <span class="eyebrow">Scenes</span>
        ${MUSIC_CATALOG.folders.map((f) => html`<button type="button" class=${cx(folder === `mood:${f.id}` && 'is-on')} title=${f.description} onClick=${() => setFolder(`mood:${f.id}`)}>${f.name}</button>`)}
        <span class="eyebrow">Soundtracks</span>
        ${MUSIC_CATALOG.albums.map((a) => html`<button type="button" class=${cx(folder === `album:${a.id}` && 'is-on')} onClick=${() => setFolder(`album:${a.id}`)}>${a.name}<small>${a.tracks}</small></button>`)}
      </nav>
      <ol class="lib-tracks">
        ${tracks.slice(0, 400).map((t) => html`<li class=${cx(t.id === current && 'is-on')}><button type="button" onClick=${() => act.play(t.id, folder === 'all' ? 'all' : folder)}><span class="num">${t.number}</span><span class="t">${t.title}<small>${ALBUMS.get(t.album)?.name || ''}</small></span><span class="num d">${formatDuration(t.duration)}</span></button></li>`)}
      </ol>
    </div>
    <footer class="lib-foot">
      <label class="btn btn-ghost btn-sm"><${Icon} name="upload" /><span>Load soundtrack ZIPs</span><input type="file" accept=".zip,application/zip" multiple hidden onChange=${async (e) => { const files = [...e.currentTarget.files]; if (!files.length) return; setLocal('Importing…'); try { const r = await importMusicArchives(files, (p) => setLocal(p?.text || 'Importing…')); setLocal(describeLocal(r)); toast('Soundtracks stored in this browser'); } catch (err) { setLocal(err.message); } }} /></label>
      <${Button} size="sm" onClick=${async () => { await clearMusicArchives(); setLocal('Local files removed'); }}>Remove local files<//>
      <span class="hint">${local || 'Audio files stay on this device; only the track choice is shared.'}</span>
    </footer>
  </div>`;
}
const describeLocal = (s) => (!s ? '' : typeof s === 'string' ? s : s.albums !== undefined ? `${s.albums} album${s.albums === 1 ? '' : 's'} stored locally` : s.message || '');

function OverlayComposer({ state, dispatch, preset, onClose }) {
  const [kind, setKind] = useState(preset?.kind || 'dialogue');
  const [speaker, setSpeaker] = useState(preset?.speaker || '');
  const [characterId, setCharacterId] = useState(preset?.characterId || '');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const show = () => {
    if (kind === 'dialogue' && !text.trim()) return toast('Write the line first');
    if (kind === 'title' && !title.trim()) return toast('Add a title');
    if (kind === 'handout' && !image) return toast('Choose an image');
    dispatch('overlay/show', { kind, speaker: speaker || state.characters.find((c) => c.id === characterId)?.name || '', characterId, title, text, image });
    onClose();
  };
  return html`<div class="composer">
    <${Segmented} label="Overlay type" value=${kind} onChange=${setKind} options=${[{ value: 'dialogue', icon: 'speech', label: 'Dialogue' }, { value: 'title', icon: 'title', label: 'Title card' }, { value: 'handout', icon: 'image', label: 'Handout' }]} />
    ${kind === 'dialogue' ? html`
      <div class="row"><select value=${characterId} aria-label="Speaker" onChange=${(e) => { setCharacterId(e.currentTarget.value); setSpeaker(''); }}><option value="">Narrator / other</option>${state.characters.map((c) => html`<option value=${c.id}>${c.name}</option>`)}</select>
      ${!characterId ? html`<input placeholder="Speaker name" maxlength="48" value=${speaker} onInput=${(e) => setSpeaker(e.currentTarget.value)} />` : null}</div>
      <textarea rows="3" maxlength="800" placeholder="What is said…" value=${text} onInput=${(e) => setText(e.currentTarget.value)}></textarea>` : null}
    ${kind === 'title' ? html`<input placeholder="Chapter or location title" maxlength="90" value=${title} onInput=${(e) => setTitle(e.currentTarget.value)} /><input placeholder="Subtitle (optional)" maxlength="200" value=${text} onInput=${(e) => setText(e.currentTarget.value)} />` : null}
    ${kind === 'handout' ? html`<label class="drop">${image ? html`<img src=${image} alt="Handout preview" />` : html`<span><${Icon} name="image" size=${22} /> Choose an image</span>`}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange=${async (e) => { const f = e.currentTarget.files?.[0]; if (f) setImage(await readFileAsDataUrl(f, { maxSide: 1400, quality: 0.85 })); }} /></label><input placeholder="Caption (optional)" maxlength="90" value=${title} onInput=${(e) => setTitle(e.currentTarget.value)} />` : null}
    <div class="row end"><${Button} onClick=${onClose}>Cancel<//><${Button} variant="primary" onClick=${show}>Show on stage<//></div>
  </div>`;
}

function ChatPanel({ state, dispatch, onClose }) {
  const [text, setText] = useState('');
  const [toStage, setToStage] = useState(true);
  const list = useRef(null);
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [state.chat.length]);
  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch('chat/post', { from: 'gm', name: 'GM', text: text.trim(), toStage });
    setText('');
  };
  return html`<div class="chat">
    <header class="row between"><h3>Table chat</h3><div class="row"><${Button} size="sm" icon="trash" title="Clear chat" onClick=${() => dispatch('chat/clear')} /><${Button} size="sm" icon="close" aria-label="Close chat" onClick=${onClose} /></div></header>
    <ol class="chat-list" ref=${list}>
      ${state.chat.length ? state.chat.map((m) => html`<li class=${cx('msg', `from-${m.from}`)}><b>${m.name}</b><span>${m.text}</span><time>${new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></li>`) : html`<li class="hint">Messages from the GM and players appear here.</li>`}
    </ol>
    <form class="chat-form" onSubmit=${send}>
      <input placeholder="Message the table" maxlength="300" value=${text} onInput=${(e) => setText(e.currentTarget.value)} aria-label="Message" />
      <label class="mini-check" title="Also show on the TV"><input type="checkbox" checked=${toStage} onChange=${(e) => setToStage(e.currentTarget.checked)} />TV</label>
      <${Button} type="submit" variant="primary" icon="arrowRight" aria-label="Send" />
    </form>
  </div>`;
}

export function Dock({ state, dispatch, overlayPreset, setOverlayPreset, monitor, setMonitor }) {
  const [open, setOpen] = useState('');
  const [seen, setSeen] = useState(state.chat.length);
  useEffect(() => { if (overlayPreset) setOpen('overlay'); }, [overlayPreset]);
  useEffect(() => { if (open === 'chat') setSeen(state.chat.length); }, [open, state.chat.length]);
  const act = musicActions(state, dispatch);
  const track = act.res.track || (state.music.trackId ? TRACK_MAP.get(state.music.trackId) : null);
  const env = state.environment;
  const unread = Math.max(0, state.chat.length - seen);
  const ov = state.overlay;
  const close = () => { setOpen(''); setOverlayPreset(null); };
  return html`<footer class="dock">
    <div class="dock-group dock-music">
      <${Button} icon="music" title="Music library" active=${open === 'library'} onClick=${() => setOpen(open === 'library' ? '' : 'library')} data-popover-trigger />
      <div class="np"><b>${track ? track.title : 'No music'}</b><small>${track ? ALBUMS.get(track.album)?.name : 'Open the library to choose a track'}</small></div>
      <${Button} icon="prev" aria-label="Previous track" disabled=${!track} onClick=${() => act.step(-1)} />
      <${Button} icon=${state.music.playing ? 'pause' : 'play'} aria-label=${state.music.playing ? 'Pause' : 'Play'} disabled=${!state.music.trackId} onClick=${act.toggle} />
      <${Button} icon="next" aria-label="Next track" disabled=${!track} onClick=${() => act.step(1)} />
      <input type="range" class="vol" min="0" max="1" step="0.02" value=${state.music.volume} aria-label="Music volume" onInput=${(e) => act.volume(Number(e.currentTarget.value))} />
    </div>
    <div class="dock-group">
      <${Icon} name="wind" />
      <select value=${env.ambience} aria-label="Ambience" onChange=${(e) => dispatch('env/set', { ambience: e.currentTarget.value })}>${Object.entries(AMBIENCE_TRACKS).map(([k, v]) => html`<option value=${k}>${k === 'none' ? 'No ambience' : v.label}</option>`)}</select>
      <input type="range" class="vol" min="0" max="1" step="0.02" value=${env.ambienceVolume} aria-label="Ambience volume" onInput=${(e) => dispatch('env/set', { ambienceVolume: Number(e.currentTarget.value) })} />
      <${Button} icon=${monitor ? 'volume' : 'mute'} active=${monitor} title="Hear music and ambience on this computer" onClick=${() => setMonitor(!monitor)} />
    </div>
    <div class="dock-group">
      <${Button} icon="speech" onClick=${() => { setOverlayPreset({ kind: 'dialogue' }); setOpen('overlay'); }} data-popover-trigger>Dialogue<//>
      <${Button} icon="title" onClick=${() => { setOverlayPreset({ kind: 'title' }); setOpen('overlay'); }} data-popover-trigger>Title<//>
      <${Button} icon="image" onClick=${() => { setOverlayPreset({ kind: 'handout' }); setOpen('overlay'); }} data-popover-trigger>Handout<//>
      ${ov.kind !== 'none' ? html`<${Button} variant="ember" icon="close" onClick=${() => dispatch('overlay/hide')}>Dismiss ${ov.kind === 'dialogue' ? 'dialogue' : ov.kind === 'title' ? 'title' : 'handout'}<//>` : null}
    </div>
    <div class="dock-group end">
      <${Button} icon="chat" active=${open === 'chat'} onClick=${() => setOpen(open === 'chat' ? '' : 'chat')} data-popover-trigger>Chat${unread ? html` <i class="badge">${unread}</i>` : ''}<//>
    </div>
    <${Popover} open=${open === 'library'} onClose=${close} anchor="top" class="pop-library"><${MusicLibrary} state=${state} dispatch=${dispatch} onClose=${close} /><//>
    <${Popover} open=${open === 'overlay'} onClose=${close} anchor="top" class="pop-overlay"><${OverlayComposer} key=${JSON.stringify(overlayPreset)} state=${state} dispatch=${dispatch} preset=${overlayPreset} onClose=${close} /><//>
    <${Popover} open=${open === 'chat'} onClose=${close} anchor="top" class="pop-chat"><${ChatPanel} state=${state} dispatch=${dispatch} onClose=${close} /><//>
  </footer>`;
}
