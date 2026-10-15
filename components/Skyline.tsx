/** Decorative New York skyline silhouette (inline SVG, no image file). */
export function Skyline() {
  return (
    <div className="skyline" aria-hidden="true">
      <svg viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice">
        <g className="skyline-far">
          <rect x="0" y="110" width="60" height="50" />
          <rect x="70" y="95" width="45" height="65" />
          <rect x="125" y="80" width="38" height="80" />
          <rect x="300" y="88" width="50" height="72" />
          <rect x="520" y="100" width="70" height="60" />
          <rect x="760" y="85" width="44" height="75" />
          <rect x="900" y="96" width="60" height="64" />
          <rect x="1080" y="90" width="50" height="70" />
          <rect x="1140" y="104" width="60" height="56" />
        </g>
        <g className="skyline-near">
          <rect x="40" y="120" width="70" height="40" />
          <rect x="170" y="70" width="40" height="90" />
          <rect x="215" y="98" width="55" height="62" />
          <path d="M360 160V60h12V44h16v16h12v100z" />
          {/* Empire State–style tower */}
          <path d="M445 160V72h10V54h8V36h6V8h4v28h6v18h8v18h10v88z" />
          <rect x="520" y="90" width="44" height="70" />
          <rect x="575" y="112" width="60" height="48" />
          {/* Chrysler-style crown */}
          <path d="M660 160V66l8-6v-8l6-6v-8l5-6V18l3-12 3 12v14l5 6v8l6 6v8l8 6v94z" />
          <rect x="730" y="104" width="50" height="56" />
          <rect x="800" y="58" width="36" height="102" />
          {/* One World Trade–style tower */}
          <path d="M860 160V40l18-14 18 14v120zM876 26V0h4v26z" />
          <rect x="920" y="100" width="58" height="60" />
          <rect x="990" y="80" width="42" height="80" />
          <rect x="1040" y="116" width="70" height="44" />
          <rect x="1120" y="94" width="40" height="66" />
        </g>
      </svg>
    </div>
  );
}
