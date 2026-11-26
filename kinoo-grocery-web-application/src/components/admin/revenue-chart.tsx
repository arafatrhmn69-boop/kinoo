"use client";

import { useState } from "react";
import type { AdminDashboardDto } from "@/lib/admin-types";
import { formatTaka } from "@/lib/kinoo";

type Props = {
  series: AdminDashboardDto["revenueSeries"];
};

export function RevenueChart({ series }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const width = 680;
  const height = 210;
  const padX = 24;
  const padTop = 24;
  const padBottom = 18;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;

  const maxRev = Math.max(...series.map((d) => d.revenue), 1000);

  const coords = series.map((point, index) => {
    const x =
      series.length === 1
        ? width / 2
        : padX + (index / (series.length - 1)) * plotW;
    const y = padTop + plotH - (point.revenue / maxRev) * plotH;
    return { x, y, ...point };
  });

  // Smooth cubic bezier curve
  const linePath = coords.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[idx - 1]!;
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1]!.x} ${padTop + plotH} L ${coords[0]!.x} ${padTop + plotH} Z`
      : "";

  const activePoint = hovered !== null ? coords[hovered] : null;

  return (
    <div className="adm-chart-wrap">
      <svg
        className="adm-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="7-day revenue trend"
      >
        <defs>
          <linearGradient id="kinooRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 0.33, 0.66, 1].map((ratio) => {
          const y = padTop + plotH * ratio;
          return (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="4 4"
            />
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#kinooRevGrad)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {coords.map((pt, idx) => {
          const isActive = hovered === idx;
          return (
            <g
              key={pt.date}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={pt.x - plotW / 14}
                y={0}
                width={plotW / 7}
                height={height}
                fill="transparent"
              />
              {isActive && (
                <line
                  x1={pt.x}
                  x2={pt.x}
                  y1={padTop}
                  y2={padTop + plotH}
                  stroke="#16a34a"
                  strokeOpacity="0.4"
                  strokeDasharray="3 3"
                />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 6.5 : 4.5}
                fill={isActive ? "#16a34a" : "#ffffff"}
                stroke="#16a34a"
                strokeWidth="2.5"
              />
            </g>
          );
        })}

        {activePoint && (
          <g
            transform={`translate(${Math.min(
              Math.max(activePoint.x - 66, 8),
              width - 140,
            )}, ${Math.max(activePoint.y - 48, 2)})`}
          >
            <rect
              width="132"
              height="38"
              rx="9"
              fill="#072818"
              stroke="rgba(74,222,128,0.4)"
            />
            <text
              x="66"
              y="16"
              textAnchor="middle"
              fill="#a7f3d0"
              fontSize="10"
              fontWeight="700"
            >
              {activePoint.date} · {activePoint.orders} ord
            </text>
            <text
              x="66"
              y="30"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="12"
              fontWeight="800"
            >
              {formatTaka(activePoint.revenue)}
            </text>
          </g>
        )}
      </svg>

      <div className="adm-chart-labels">
        {series.map((d) => (
          <div key={d.date}>
            <small>{d.label}</small>
            <span>{formatTaka(d.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
