"use client";

import { useEffect, useRef, useState } from "react";

// ── Mercator projection ───────────────────────────────────────────────────────
// Matches the Mapbox Static Image bbox exactly so SVG pins land on the right pixel.
// bbox: [west, south, east, north]
const BBOX = { w: 143, s: -40, e: 180, n: -12 };
const VW = 800;
const VH = 450;

function mercY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}
const Y_MIN = mercY(BBOX.s);
const Y_MAX = mercY(BBOX.n);

function px(lon: number, lat: number): [number, number] {
  return [
    Math.round(((lon - BBOX.w) / (BBOX.e - BBOX.w)) * VW),
    Math.round((1 - (mercY(lat) - Y_MIN) / (Y_MAX - Y_MIN)) * VH),
  ];
}

// ── Key locations ─────────────────────────────────────────────────────────────
const G  = px(178.5,   -16.5);   // Galoa Village, Bua
const LA = px(179.4,   -16.4);   // Labasa
const NA = px(177.5,   -17.8);   // Nadi airport
const CB = px(149.13,  -35.28);  // Canberra
const WW = px(147.37,  -35.12);  // Wagga Wagga

// Great-circle arc control point (Nadi → Canberra, bows slightly north)
const ARC_CP: [number, number] = [Math.round((NA[0] + CB[0]) / 2), 120];

// ── Mapbox Static Image URL ───────────────────────────────────────────────────
// @2x gives 800×450 actual pixels (400×225 @2x).
// Token is public (NEXT_PUBLIC_) — restrict by URL in Mapbox console.
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_URL = TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/[${BBOX.w},${BBOX.s},${BBOX.e},${BBOX.n}]/400x225@2x?access_token=${TOKEN}`
  : "";

type Phase = "idle" | "zoom" | "marker" | "path" | "done";

export default function GaloaMap() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible]   = useState(false);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [imgError, setImgError] = useState(false);

  // Trigger animation when section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !visible) setVisible(true); },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  // Animation phases
  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setPhase("zoom"),   200);
    const t2 = setTimeout(() => setPhase("marker"), 900);
    const t3 = setTimeout(() => setPhase("path"),   1600);
    const t4 = setTimeout(() => setPhase("done"),   3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [visible]);

  const showMarker = phase === "marker" || phase === "path" || phase === "done";
  const showPath   = phase === "path"   || phase === "done";
  const showLabels = phase === "done";
  const hasMap     = !!MAP_URL && !imgError;

  return (
    <section ref={sectionRef} className="px-4 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            Our Supply Chain
          </h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-xl mx-auto">
            Caught in Bua Province, Vanua Levu — flown directly to Canberra, then
            driven to the Riverina.
          </p>
        </div>

        {/* Map container — locked to 16:9 to match image */}
        <div
          className="relative rounded-2xl border border-border-default overflow-hidden"
          style={{ aspectRatio: "16/9" }}
        >
          {/* ── Base layer: Mapbox dark-v11 static image ── */}
          {hasMap ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={MAP_URL}
              alt="Dark map showing Fiji and eastern Australia"
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: "fill" }}
              draggable={false}
              onError={() => setImgError(true)}
            />
          ) : (
            /* Fallback: dark ocean gradient */
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 90% 70% at 70% 25%, #0c1a2e 0%, #0a0f1a 65%)",
              }}
            />
          )}

          {/* ── Tactical grid overlay ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(79,195,247,1) 1px, transparent 1px), " +
                "linear-gradient(90deg, rgba(79,195,247,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              opacity: 0.025,
            }}
          />

          {/* ── Edge vignette to frame the map ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 110% 110% at 50% 50%, transparent 55%, rgba(10,15,26,0.65) 100%)",
            }}
          />

          {/* ── SVG overlay: markers, paths, labels ── */}
          {/* preserveAspectRatio="none" because viewBox exactly matches 16:9 */}
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            aria-label="Animated supply chain route from Galoa Village, Fiji to the Riverina, Australia"
          >
            <defs>
              <style>{`
                @keyframes dashDraw {
                  from { stroke-dashoffset: 1500; }
                  to   { stroke-dashoffset: 0; }
                }
                @keyframes shortDraw {
                  from { stroke-dashoffset: 300; }
                  to   { stroke-dashoffset: 0; }
                }
                @keyframes ringFade1 {
                  0%   { opacity: 0.75; r: 8; }
                  100% { opacity: 0;    r: 28; }
                }
                @keyframes ringFade2 {
                  0%   { opacity: 0.5;  r: 10; }
                  100% { opacity: 0;    r: 32; }
                }
                @keyframes dotBlink {
                  0%, 100% { opacity: 1; }
                  50%      { opacity: 0.45; }
                }
                .flight-arc {
                  stroke-dasharray: 12 7;
                  stroke-dashoffset: 1500;
                  animation: dashDraw 2s ease-out forwards;
                  animation-delay: 0.3s;
                }
                .short-path {
                  stroke-dasharray: 5 4;
                  stroke-dashoffset: 300;
                  animation: shortDraw 0.7s ease-out forwards;
                }
                .road-path {
                  stroke-dasharray: 5 5;
                  stroke-dashoffset: 300;
                  animation: shortDraw 0.5s ease-out forwards;
                  animation-delay: 1.4s;
                }
                .pulse-r1 { animation: ringFade1 2.2s ease-out infinite; }
                .pulse-r2 { animation: ringFade2 2.2s ease-out 0.9s infinite; }
                .marker-dot { animation: dotBlink 2.2s ease-in-out infinite; }
              `}</style>

              {/* Fiji area glow */}
              <radialGradient id="fijiGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#4fc3f7" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#4fc3f7" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ── Fiji area glow: visible from zoom phase ── */}
            <ellipse
              cx={G[0]}
              cy={G[1]}
              rx={55}
              ry={35}
              fill="url(#fijiGlow)"
              style={{
                opacity: phase === "idle" ? 0 : phase === "zoom" ? 0.7 : 1,
                transition: "opacity 0.7s ease",
              }}
            />

            {/* ── City dots ── */}
            <g
              style={{
                opacity: showMarker ? 1 : 0,
                transition: "opacity 0.4s ease",
              }}
            >
              {/* Labasa */}
              <circle cx={LA[0]} cy={LA[1]} r="2.5" fill="#4fc3f7" opacity="0.6" />
              {/* Nadi */}
              <circle cx={NA[0]} cy={NA[1]} r="3" fill="#4fc3f7" opacity="0.55" />
              {/* Canberra */}
              <circle cx={CB[0]} cy={CB[1]} r="3.5" fill="#4fc3f7" opacity="0.6" />
              <circle cx={CB[0]} cy={CB[1]} r="1.8" fill="#4fc3f7" />
              {/* Wagga */}
              <circle cx={WW[0]} cy={WW[1]} r="3" fill="#ffab40" opacity="0.65" />
              <circle cx={WW[0]} cy={WW[1]} r="1.5" fill="#ffab40" />
            </g>

            {/* ── Galoa Village pulsing marker ── */}
            {showMarker && (
              <g>
                <circle className="pulse-r1" cx={G[0]} cy={G[1]} r="8"  fill="none" stroke="#4fc3f7" strokeWidth="1.5" />
                <circle className="pulse-r2" cx={G[0]} cy={G[1]} r="10" fill="none" stroke="#4fc3f7" strokeWidth="1" />
                <circle className="marker-dot" cx={G[0]} cy={G[1]} r="5" fill="#4fc3f7" />
                <circle cx={G[0]} cy={G[1]} r="2.5" fill="#0a0f1a" />
              </g>
            )}

            {/* ── Route paths ── */}
            {showPath && (
              <g>
                {/* Galoa → Labasa: local road/boat */}
                <path
                  className="short-path"
                  d={`M ${G[0]} ${G[1]} L ${LA[0]} ${LA[1]}`}
                  fill="none"
                  stroke="#4fc3f7"
                  strokeWidth="1"
                  opacity="0.35"
                />

                {/* Labasa → Nadi: inter-island leg */}
                <path
                  className="short-path"
                  d={`M ${LA[0]} ${LA[1]} Q ${Math.round((LA[0] + NA[0]) / 2)} ${Math.round((LA[1] + NA[1]) / 2) - 18} ${NA[0]} ${NA[1]}`}
                  fill="none"
                  stroke="#4fc3f7"
                  strokeWidth="1.2"
                  opacity="0.45"
                  style={{ animationDelay: "0.2s" }}
                />

                {/* Nadi → Canberra: main flight arc (great-circle bow) */}
                <path
                  className="flight-arc"
                  d={`M ${NA[0]} ${NA[1]} Q ${ARC_CP[0]} ${ARC_CP[1]} ${CB[0]} ${CB[1]}`}
                  fill="none"
                  stroke="#4fc3f7"
                  strokeWidth="2"
                  opacity="0.8"
                />

                {/* Canberra → Wagga: road leg */}
                <path
                  className="road-path"
                  d={`M ${CB[0]} ${CB[1]} L ${WW[0]} ${WW[1]}`}
                  fill="none"
                  stroke="#ffab40"
                  strokeWidth="1.6"
                  opacity="0.85"
                />

                {/* Plane emoji near arc midpoint */}
                <text
                  x={ARC_CP[0]}
                  y={ARC_CP[1] + 28}
                  fontSize="15"
                  textAnchor="middle"
                  style={{
                    opacity: showLabels ? 0.9 : 0,
                    transition: "opacity 0.5s ease 0.2s",
                  }}
                >
                  ✈
                </text>
              </g>
            )}

            {/* ── Labels (fade in at "done" phase) ── */}
            <g
              style={{
                opacity: showLabels ? 1 : 0,
                transition: "opacity 0.7s ease",
              }}
            >
              {/* Galoa callout */}
              <line
                x1={G[0]} y1={G[1] - 9}
                x2={G[0]} y2={G[1] - 38}
                stroke="#4fc3f7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5"
              />
              <rect x={G[0] - 58} y={G[1] - 60} width="116" height="20" rx="4" fill="#0d1520" stroke="#1e2a3a" strokeWidth="0.8" />
              <text x={G[0]} y={G[1] - 46} fontSize="9" fill="#4fc3f7" fontFamily="monospace" textAnchor="middle" fontWeight="600">
                GALOA VILLAGE, BUA
              </text>
              <rect x={G[0] - 58} y={G[1] - 82} width="116" height="16" rx="3" fill="#4fc3f7" fillOpacity="0.1" />
              <text x={G[0]} y={G[1] - 70} fontSize="8" fill="#e0e6ed" fontFamily="monospace" textAnchor="middle" opacity="0.85">
                Your Fish Starts Here
              </text>

              {/* Labasa */}
              <text x={LA[0] + 5} y={LA[1] - 4} fontSize="7" fill="#90a4ae" fontFamily="monospace">
                LABASA
              </text>

              {/* Nadi */}
              <text x={NA[0] - 5} y={NA[1] + 15} fontSize="7" fill="#90a4ae" fontFamily="monospace" textAnchor="end">
                NADI
              </text>

              {/* Canberra */}
              <text x={CB[0]} y={CB[1] + 15} fontSize="7.5" fill="#90a4ae" fontFamily="monospace" textAnchor="middle">
                CANBERRA
              </text>

              {/* Wagga */}
              <text x={WW[0] - 6} y={WW[1] - 6} fontSize="7.5" fill="#ffab40" fontFamily="monospace" textAnchor="end">
                WAGGA WAGGA
              </text>

              {/* FJ391 flight label */}
              <rect x={ARC_CP[0] - 28} y={ARC_CP[1] + 35} width="56" height="14" rx="3" fill="#0d1520" stroke="#1e2a3a" strokeWidth="0.6" />
              <text x={ARC_CP[0]} y={ARC_CP[1] + 46} fontSize="7.5" fill="#4fc3f7" fontFamily="monospace" textAnchor="middle" opacity="0.9">
                FJ391
              </text>

              {/* Distance */}
              <text
                x={Math.round((NA[0] + CB[0]) / 2)}
                y={ARC_CP[1] + 75}
                fontSize="7.5" fill="#90a4ae" fontFamily="monospace" textAnchor="middle" opacity="0.4"
              >
                ≈ 3,500 km
              </text>
            </g>

            {/* ── HUD chrome (visible once section is seen) ── */}
            {visible && (
              <g>
                {/* Top-left scan lines + coords */}
                <rect x="10" y="10" width="62" height="2" fill="#4fc3f7" opacity="0.14" />
                <rect x="10" y="15" width="42" height="1" fill="#4fc3f7" opacity="0.07" />
                <text x="12" y="30" fontSize="7" fill="#4fc3f7" fontFamily="monospace" opacity="0.5">
                  LIVE TRACK
                </text>
                <text x="12" y="40" fontSize="6" fill="#90a4ae" fontFamily="monospace" opacity="0.35">
                  LAT -16.85° LON 178.55°
                </text>

                {/* Bottom-right watermark */}
                <text
                  x={VW - 12} y={VH - 10}
                  fontSize="6" fill="#90a4ae" fontFamily="monospace" textAnchor="end" opacity="0.22"
                >
                  FIJIFISH SUPPLY CHAIN v1.0
                </text>
              </g>
            )}
          </svg>

          {/* ── Legend ── */}
          <div className="absolute bottom-3 left-4 flex items-center gap-4 text-xs font-mono text-text-secondary z-10">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px bg-ocean-teal inline-block" style={{ borderTop: "2px dashed #4fc3f7" }} />
              Air freight
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px bg-sunset-gold inline-block" style={{ borderTop: "2px dashed #ffab40" }} />
              Road delivery
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
