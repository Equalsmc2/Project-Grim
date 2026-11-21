// Plays the shared music and ambience selections on this device.
// Browsers only allow audio after a user gesture, so playback starts when
// setEnabled(true) is called from a click.
import { createAmbiencePlayer } from './ambience.js';
import { createMusicPlayer } from './music-playback.js';

export function createAudioDirector({ store, onStatus = () => {} }) {
  let enabled = false;
  const ambience = createAmbiencePlayer({ onStatus: (t, d) => onStatus({ channel: 'ambience', type: t, detail: d }) });
  const music = createMusicPlayer({ onStatus: (t, d) => onStatus({ channel: 'music', type: t, detail: d }) });
  const apply = (s) => {
    ambience.sync(s.environment.ambience, s.environment.ambienceVolume);
    music.sync(s.music);
  };
  store.subscribe((s, change) => { if (change.sections.includes('music') || change.sections.includes('environment') || change.type === 'initial') apply(s); });
  // Advance music when a track ends even if nobody touches anything.
  setInterval(() => { if (enabled && store.getState().music.playing) music.sync(store.getState().music); }, 4000);
  return {
    setEnabled(v) {
      enabled = !!v;
      if (enabled) { apply(store.getState()); ambience.enable(); music.enable(); }
      else { ambience.disable(); music.disable(); }
    },
    get enabled() { return enabled; },
  };
}
