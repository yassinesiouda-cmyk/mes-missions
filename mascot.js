/* Compagnons kawaii originaux, dessinés en SVG. Humeurs : calme, contente, fiere, dodo. */
'use strict';

const MASCOTS = {
  mochi: { name: 'Mochi', body: '#fff8f0', inner: '#ffc2d6', ears: 'cat' },
  pyon: { name: 'Pyon', body: '#ffffff', inner: '#ffb6cf', ears: 'bunny' },
  kuma: { name: 'Kuma', body: '#f3d9bf', inner: '#e0b48e', ears: 'bear' },
  kitsu: { name: 'Kitsu', body: '#ffbe85', inner: '#fff1e0', ears: 'fox' },
};

function mascotSVG(kind, mood) {
  const m = MASCOTS[kind] || MASCOTS.mochi;
  const ink = '#4a3557';
  const st = `stroke="${ink}" stroke-width="3" stroke-linejoin="round"`;
  let ears = '';
  if (m.ears === 'cat') {
    ears = `<path d="M20 52 L28 14 L54 36 Z" fill="${m.body}" ${st}/><path d="M28 44 L31 25 L44 37 Z" fill="${m.inner}"/>
            <path d="M100 52 L92 14 L66 36 Z" fill="${m.body}" ${st}/><path d="M92 44 L89 25 L76 37 Z" fill="${m.inner}"/>`;
  } else if (m.ears === 'bunny') {
    ears = `<ellipse cx="42" cy="26" rx="11" ry="25" transform="rotate(-12 42 26)" fill="${m.body}" ${st}/>
            <ellipse cx="42" cy="28" rx="5" ry="17" transform="rotate(-12 42 28)" fill="${m.inner}"/>
            <ellipse cx="78" cy="26" rx="11" ry="25" transform="rotate(12 78 26)" fill="${m.body}" ${st}/>
            <ellipse cx="78" cy="28" rx="5" ry="17" transform="rotate(12 78 28)" fill="${m.inner}"/>`;
  } else if (m.ears === 'bear') {
    ears = `<circle cx="27" cy="38" r="14" fill="${m.body}" ${st}/><circle cx="27" cy="38" r="7" fill="${m.inner}"/>
            <circle cx="93" cy="38" r="14" fill="${m.body}" ${st}/><circle cx="93" cy="38" r="7" fill="${m.inner}"/>`;
  } else {
    ears = `<path d="M18 56 L24 8 L56 34 Z" fill="${m.body}" ${st}/><path d="M24 30 L24 8 L38 20 Z" fill="${ink}"/>
            <path d="M102 56 L96 8 L64 34 Z" fill="${m.body}" ${st}/><path d="M96 30 L96 8 L82 20 Z" fill="${ink}"/>`;
  }

  const head = `<ellipse cx="60" cy="70" rx="45" ry="38" fill="${m.body}" ${st}/>` +
    (m.ears === 'fox' ? `<path d="M30 84 Q60 62 90 84 Q78 104 60 106 Q42 104 30 84 Z" fill="${m.inner}"/>` : '') +
    (m.ears === 'bear' ? `<ellipse cx="60" cy="84" rx="15" ry="11" fill="${m.inner}"/>` : '');

  let eyes = '';
  let extra = '';
  if (mood === 'contente') {
    eyes = `<path d="M37 73 Q44 64 51 73" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M69 73 Q76 64 83 73" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
  } else if (mood === 'fiere') {
    eyes = `<ellipse cx="44" cy="70" rx="7.5" ry="9" fill="${ink}"/><circle cx="46.5" cy="66" r="3" fill="#fff"/><circle cx="41.5" cy="73" r="1.6" fill="#fff"/>
            <ellipse cx="76" cy="70" rx="7.5" ry="9" fill="${ink}"/><circle cx="78.5" cy="66" r="3" fill="#fff"/><circle cx="73.5" cy="73" r="1.6" fill="#fff"/>`;
    extra = `<path d="M104 22 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#ffd34d"/>
             <path d="M12 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ff9ec8"/>`;
  } else if (mood === 'dodo') {
    eyes = `<path d="M37 71 Q44 77 51 71" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M69 71 Q76 77 83 71" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    extra = `<text x="96" y="30" font-size="16" font-weight="900" fill="#9b8bd9" font-family="sans-serif">z</text>
             <text x="106" y="18" font-size="11" font-weight="900" fill="#9b8bd9" font-family="sans-serif">z</text>`;
  } else {
    eyes = `<ellipse cx="44" cy="71" rx="5.5" ry="7" fill="${ink}"/><circle cx="46" cy="68" r="2.2" fill="#fff"/>
            <ellipse cx="76" cy="71" rx="5.5" ry="7" fill="${ink}"/><circle cx="78" cy="68" r="2.2" fill="#fff"/>`;
  }

  const blush = `<ellipse cx="31" cy="84" rx="8" ry="4.5" fill="#ff9fbd" opacity=".75"/>
                 <ellipse cx="89" cy="84" rx="8" ry="4.5" fill="#ff9fbd" opacity=".75"/>`;
  let mouth;
  if (mood === 'dodo') mouth = `<ellipse cx="60" cy="86" rx="3" ry="3.5" fill="${ink}"/>`;
  else if (m.ears === 'cat' || m.ears === 'fox') mouth = `<path d="M52 82 Q56 88 60 82 Q64 88 68 82" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
  else mouth = `<path d="M53 82 Q60 ${mood === 'contente' || mood === 'fiere' ? 92 : 87} 67 82" fill="${mood === 'contente' || mood === 'fiere' ? '#ff7a9c' : 'none'}" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const nose = m.ears === 'bear' ? `<ellipse cx="60" cy="78" rx="4" ry="3" fill="${ink}"/>` : '';

  return `<svg viewBox="0 0 120 112" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${m.name}">${ears}${head}${eyes}${blush}${nose}${mouth}${extra}</svg>`;
}
