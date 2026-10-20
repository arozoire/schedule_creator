// The week as rows: one row per weekday, one bar per slot of each schedule.
// Overlapping slots of the same day stack in thin lanes, others share a lane.
import { t } from './i18n.js';

const WR_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const WR_LANE = 22;
const wrTime = (m) => (m === 1440 ? '24:00' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);

// segments: weeklySegments() output. block(segment, day) returns the tag
// (button or span) and attributes for one bar; the rest is shared.
export function weekRowsHtml(segments, {today, minutes, color, live, block, escape}) {
  const ticks = `<div class="wr-ticks" aria-hidden="true"><span></span><div>${['00', '06', '12', '18', '24'].map((h) => `<span>${h}</span>`).join('')}</div></div>`;
  const rows = segments.map((day, index) => {
    const lanes = Math.max(1, ...day.map((s) => s.lanes || 1));
    const bars = day.map((segment) => {
      const {schedule, start, end, lane} = segment;
      const label = `${schedule.name} · ${t(WR_DAYS[index])} ${wrTime(start)}–${wrTime(end)}`;
      const state = index === today && start <= minutes && minutes < end ? live(schedule) : '';
      const [tag, attrs] = block(segment, index);
      return `<${tag} class="wr-block ${schedule.enabled === false ? 'is-off' : ''} ${state}" ${attrs} title="${escape(label)}" aria-label="${escape(label)}" style="left:${start / 14.4}%;width:${(end - start) / 14.4}%;top:${4 + lane * WR_LANE}px;--block-color:${color(schedule)}">${end - start >= 150 ? `<span>${escape(schedule.name)}</span>` : ''}</${tag}>`;
    }).join('');
    const now = index === today ? `<span class="wr-now" style="left:${minutes / 14.4}%"></span>` : '';
    return `<div class="wr-row${index === today ? ' is-today' : ''}"><div class="wr-day">${t(WR_DAYS[index])}${index === today ? `<small>${t('oggi')}</small>` : ''}</div><div class="wr-track" style="height:${lanes * WR_LANE + 6}px">${bars}${now}</div></div>`;
  }).join('');
  return `<div class="wr" role="group" aria-label="${t('Settimana')}">${ticks}${rows}</div>`;
}

// The chosen view is remembered per browser: the best one depends on the screen.
export function readView(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
export function saveView(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode: keep it for this page only */ }
}
