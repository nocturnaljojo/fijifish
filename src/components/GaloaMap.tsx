"use client";

import { useEffect, useRef, useState } from "react";

export default function GaloaMap() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"idle" | "zoom" | "marker" | "path" | "done">("idle");

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          setVisible(true);
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setPhase("zoom"), 200);
    const t2 = setTimeout(() => setPhase("marker"), 900);
    const t3 = setTimeout(() => setPhase("path"), 1600);
    const t4 = setTimeout(() => setPhase("done"), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [visible]);

  const showMarker = phase === "marker" || phase === "path" || phase === "done";
  const showPath = phase === "path" || phase === "done";
  const showLabels = phase === "done";

  return (
    <section ref={sectionRef} className="px-4 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            Where Your Fish Comes From
          </h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-xl mx-auto">
            Caught in Bua Province, Vanua Levu — flown directly to Canberra, then
            driven to the Riverina.
          </p>
        </div>

        <div
          className="relative rounded-2xl border border-border-default overflow-hidden bg-bg-secondary"
          style={{ minHeight: "360px" }}
        >
          {/* Tactical grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(79,195,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Radial ocean glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 35% 45%, rgba(79,195,247,0.06) 0%, transparent 70%)",
            }}
          />

          <svg
            viewBox="0 0 800 420"
            className="w-full h-full"
            style={{ minHeight: "320px" }}
            aria-label="Animated map showing fish journey from Galoa Village, Fiji to the Riverina, Australia"
          >
            {/* ── Deep ocean background ── */}
            <rect width="800" height="420" fill="#0a0f1a" />

            {/* ── Subtle ocean depth gradient ── */}
            <defs>
              <radialGradient id="oceanGlow" cx="35%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#0d1e35" />
                <stop offset="100%" stopColor="#0a0f1a" />
              </radialGradient>
              <radialGradient id="ausGlow" cx="72%" cy="72%" r="30%">
                <stop offset="0%" stopColor="#0e1a2e" />
                <stop offset="100%" stopColor="#0a0f1a" />
              </radialGradient>

              {/* Flight path dash animation */}
              <style>{`
                @keyframes dashDraw {
                  from { stroke-dashoffset: 600; }
                  to   { stroke-dashoffset: 0; }
                }
                @keyframes markerPulse {
                  0%, 100% { r: 6; opacity: 0.9; }
                  50%       { r: 10; opacity: 0.4; }
                }
                @keyframes ringExpand {
                  0%   { r: 8;  opacity: 0.8; }
                  100% { r: 22; opacity: 0; }
                }
                .flight-path {
                  stroke-dasharray: 8 5;
                  stroke-dashoffset: 600;
                  animation: dashDraw 1.4s ease-out forwards;
                }
                .pulse-ring {
                  animation: ringExpand 1.8s ease-out infinite;
                }
                .marker-dot {
                  animation: markerPulse 2s ease-in-out infinite;
                }
              `}</style>
            </defs>

            <rect width="800" height="420" fill="url(#oceanGlow)" />

            {/* ── Fiji islands (Vanua Levu, Viti Levu) — stylised outlines ── */}
            {/* Vanua Levu — elongated island */}
            <g
              style={{
                transform: phase === "zoom" || showMarker ? "scale(1.08) translate(-18px, -8px)" : "scale(1)",
                transformOrigin: "280px 160px",
                transition: "transform 0.8s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {/* Vanua Levu */}
              <path
                d="M 170 130 C 185 118 210 115 240 120 C 265 125 285 122 310 128 C 330 133 345 140 355 148 C 362 155 358 162 348 167 C 335 173 315 170 295 165 C 272 160 250 163 230 165 C 210 167 190 162 178 155 C 168 148 163 140 170 130 Z"
                fill="#1a2a1a"
                stroke="#2a4a2a"
                strokeWidth="0.8"
                opacity="0.9"
              />
              {/* Taveuni */}
              <ellipse cx="370" cy="143" rx="12" ry="7" fill="#1a2a1a" stroke="#2a4a2a" strokeWidth="0.6" opacity="0.8" transform="rotate(-20, 370, 143)" />

              {/* Viti Levu */}
              <path
                d="M 190 215 C 205 200 230 195 255 200 C 275 205 288 215 290 228 C 292 240 280 250 262 254 C 242 258 220 252 205 244 C 192 237 183 228 190 215 Z"
                fill="#1a2a1a"
                stroke="#2a4a2a"
                strokeWidth="0.8"
                opacity="0.85"
              />

              {/* Labasa — city dot on Vanua Levu north */}
              <circle cx="270" cy="126" r="3" fill="#4fc3f7" opacity="0.7" />
              <circle cx="270" cy="126" r="1.5" fill="#4fc3f7" />

              {/* Nadi — city dot on Viti Levu west */}
              <circle cx="204" cy="218" r="3" fill="#4fc3f7" opacity="0.7" />
              <circle cx="204" cy="218" r="1.5" fill="#4fc3f7" />

              {/* Galoa village marker */}
              {showMarker && (
                <g>
                  {/* Pulse rings */}
                  <circle className="pulse-ring" cx="300" cy="148" r="8" fill="none" stroke="#4fc3f7" strokeWidth="1.5" />
                  <circle className="pulse-ring" cx="300" cy="148" r="8" fill="none" stroke="#4fc3f7" strokeWidth="1" style={{ animationDelay: "0.6s" }} />
                  {/* Main dot */}
                  <circle className="marker-dot" cx="300" cy="148" r="5" fill="#4fc3f7" />
                  <circle cx="300" cy="148" r="2.5" fill="#0a0f1a" />
                </g>
              )}
            </g>

            {/* ── Australia outline (eastern coast + rough shape) ── */}
            <g opacity="0.9">
              <path
                d="M 510 190 C 525 182 545 178 560 182 C 575 186 582 195 585 208 C 588 220 584 235 578 248 C 570 264 558 275 545 282 C 532 290 518 292 506 288 C 492 283 483 272 480 258 C 477 244 480 228 488 216 C 495 206 503 196 510 190 Z
                 M 510 190 C 520 195 535 198 548 202 C 558 206 565 215 566 226 C 567 238 560 250 550 258 C 538 267 522 270 508 266 C 494 262 484 251 482 238 C 480 225 486 212 496 205 C 502 200 506 194 510 190 Z"
                fill="#1a2a14"
                stroke="#2a4a20"
                strokeWidth="0.8"
              />
              {/* Simplified ACT/Canberra region */}
              <path
                d="M 558 268 C 563 262 570 260 576 264 C 582 268 583 276 580 283 C 577 290 570 294 563 292 C 556 290 552 283 554 276 C 555 272 556 270 558 268 Z"
                fill="#1e2e18"
                stroke="#3a5a28"
                strokeWidth="0.6"
              />
              {/* Wagga Wagga region */}
              <circle cx="548" cy="270" r="3" fill="#ffab40" opacity="0.6" />
              <circle cx="548" cy="270" r="1.5" fill="#ffab40" />
              {/* Canberra dot */}
              <circle cx="566" cy="278" r="3" fill="#4fc3f7" opacity="0.7" />
              <circle cx="566" cy="278" r="1.5" fill="#4fc3f7" />
            </g>

            {/* ── Flight path: Labasa → Nadi → Canberra ── */}
            {showPath && (
              <g>
                {/* Labasa → Nadi segment */}
                <path
                  className="flight-path"
                  d="M 270 126 C 240 160 215 200 204 218"
                  fill="none"
                  stroke="#4fc3f7"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
                {/* Nadi → Canberra — great circle arc */}
                <path
                  className="flight-path"
                  d="M 204 218 C 280 240 380 265 450 268 C 500 270 535 272 566 278"
                  fill="none"
                  stroke="#4fc3f7"
                  strokeWidth="1.8"
                  strokeDasharray="10 6"
                  opacity="0.7"
                  style={{ animationDelay: "0.3s" }}
                />
                {/* Canberra → Wagga delivery */}
                <path
                  className="flight-path"
                  d="M 566 278 C 560 274 554 272 548 270"
                  fill="none"
                  stroke="#ffab40"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.8"
                  style={{ animationDelay: "0.8s" }}
                />

                {/* Plane icon along path */}
                <text
                  x="390"
                  y="258"
                  fontSize="16"
                  textAnchor="middle"
                  style={{
                    opacity: showLabels ? 1 : 0,
                    transition: "opacity 0.5s ease 0.4s",
                  }}
                >
                  ✈
                </text>
              </g>
            )}

            {/* ── Labels ── */}
            {showLabels && (
              <g
                style={{
                  opacity: showLabels ? 1 : 0,
                  transition: "opacity 0.6s ease",
                }}
              >
                {/* Galoa callout */}
                <line x1="300" y1="140" x2="300" y2="108" stroke="#4fc3f7" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" />
                <rect x="244" y="88" width="114" height="22" rx="4" fill="#0d1520" stroke="#1e2a3a" strokeWidth="0.8" />
                <text x="301" y="103" fontSize="9" fill="#4fc3f7" fontFamily="monospace" textAnchor="middle" fontWeight="600">GALOA VILLAGE, BUA</text>

                {/* "Your Fish Starts Here" */}
                <rect x="244" y="64" width="114" height="16" rx="3" fill="#4fc3f7" fillOpacity="0.1" />
                <text x="301" y="76" fontSize="8" fill="#e0e6ed" fontFamily="monospace" textAnchor="middle" opacity="0.85">Your Fish Starts Here</text>

                {/* Labasa label */}
                <text x="274" y="120" fontSize="7.5" fill="#90a4ae" fontFamily="monospace" textAnchor="middle">LABASA</text>

                {/* Nadi label */}
                <text x="195" y="234" fontSize="7.5" fill="#90a4ae" fontFamily="monospace" textAnchor="middle">NADI</text>

                {/* Canberra label */}
                <text x="566" y="292" fontSize="7.5" fill="#90a4ae" fontFamily="monospace" textAnchor="middle">CANBERRA</text>

                {/* Wagga label */}
                <text x="536" y="283" fontSize="7.5" fill="#ffab40" fontFamily="monospace" textAnchor="end">WAGGA</text>

                {/* FJ391 label on path */}
                <rect x="348" y="248" width="55" height="14" rx="3" fill="#0d1520" stroke="#1e2a3a" strokeWidth="0.6" />
                <text x="375" y="259" fontSize="7" fill="#4fc3f7" fontFamily="monospace" textAnchor="middle" opacity="0.9">FJ391</text>

                {/* Distance marker */}
                <text x="400" y="290" fontSize="8" fill="#90a4ae" fontFamily="monospace" textAnchor="middle" opacity="0.5">≈ 3,500 km</text>
              </g>
            )}

            {/* ── Corner HUD overlays ── */}
            {/* Top-left scan lines */}
            <rect x="10" y="10" width="60" height="2" fill="#4fc3f7" opacity="0.15" />
            <rect x="10" y="15" width="40" height="1" fill="#4fc3f7" opacity="0.08" />
            <text x="12" y="30" fontSize="7" fill="#4fc3f7" fontFamily="monospace" opacity="0.4">LIVE TRACK</text>
            <text x="12" y="40" fontSize="6" fill="#90a4ae" fontFamily="monospace" opacity="0.3">LAT -16.85° LON 178.55°</text>

            {/* Bottom-right co-ords */}
            <text x="788" y="410" fontSize="6" fill="#90a4ae" fontFamily="monospace" textAnchor="end" opacity="0.25">FIJIFISH SUPPLY CHAIN v1.0</text>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 left-4 flex items-center gap-4 text-xs font-mono text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-ocean-teal inline-block rounded" />
              Air freight
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sunset-gold inline-block rounded" />
              Road delivery
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
