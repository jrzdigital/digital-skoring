/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { MatchState } from "../types";
import {
  BarChart3,
  TrendingUp,
  Award,
  Zap,
  ShieldAlert,
  Info,
  Layers
} from "lucide-react";

interface ScoreVisualizationProps {
  state: MatchState | null;
}

export function ScoreVisualization({ state }: ScoreVisualizationProps) {
  const [chartType, setChartType] = useState<"side-by-side" | "cumulative" | "composition">("side-by-side");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const logs = useMemo(() => state?.logs || [], [state?.logs]);
  const roundCount = state?.roundCount || 3;

  // Process data for charts
  const chartData = useMemo(() => {
    const data = [];
    let cumulativeRed = 0;
    let cumulativeBlue = 0;

    for (let r = 1; r <= roundCount; r++) {
      // Filter out uncounted logs
      const roundLogs = logs.filter((l) => l.round === r && !l.uncounted);

      // Raw elements for composition
      let redPunches = 0;
      let redKicks = 0;
      let redDrops = 0;
      let redLocks = 0;
      let redPenalties = 0;

      let bluePunches = 0;
      let blueKicks = 0;
      let blueDrops = 0;
      let blueLocks = 0;
      let bluePenalties = 0;

      roundLogs.forEach((log) => {
        const pts = log.points;
        if (log.fighter === "RED") {
          if (log.type === "PUNCH") redPunches += pts;
          else if (log.type === "KICK") redKicks += pts;
          else if (log.type === "DROP") redDrops += pts;
          else if (log.type === "LOCK") redLocks += pts;
          else if (log.type === "PENALTY") redPenalties += pts; // often negative
        } else if (log.fighter === "BLUE") {
          if (log.type === "PUNCH") bluePunches += pts;
          else if (log.type === "KICK") blueKicks += pts;
          else if (log.type === "DROP") blueDrops += pts;
          else if (log.type === "LOCK") blueLocks += pts;
          else if (log.type === "PENALTY") bluePenalties += pts; // often negative
        }
      });

      const roundRedTotal = redPunches + redKicks + redDrops + redLocks + redPenalties;
      const roundBlueTotal = bluePunches + blueKicks + blueDrops + blueLocks + bluePenalties;

      cumulativeRed += roundRedTotal;
      cumulativeBlue += roundBlueTotal;

      data.push({
        name: `Ronde ${r}`,
        roundNum: r,

        // Gained in this round (net)
        Merah: roundRedTotal,
        Biru: roundBlueTotal,

        // Gained in this round (only positive points)
        redPositive: redPunches + redKicks + redDrops + redLocks,
        bluePositive: bluePunches + blueKicks + blueDrops + blueLocks,

        // Cumulative totals
        "Kumulatif Merah": cumulativeRed,
        "Kumulatif Biru": cumulativeBlue,

        // Composition details Red
        redPunches,
        redKicks,
        redDrops,
        redLocks,
        redPenalties,

        // Composition details Blue
        bluePunches,
        blueKicks,
        blueDrops,
        blueLocks,
        bluePenalties
      });
    }
    return data;
  }, [logs, roundCount]);

  // Round results summary analysis
  const roundSummary = useMemo(() => {
    let redRoundsWon = 0;
    let blueRoundsWon = 0;
    let draws = 0;
    let maxRoundPoints = 0;
    let maxRoundWinner = "";
    let maxRoundNum = 1;

    chartData.forEach((d) => {
      if (d.Merah > d.Biru) {
        redRoundsWon++;
      } else if (d.Biru > d.Merah) {
        blueRoundsWon++;
      } else {
        draws++;
      }

      const tot = Math.max(Math.abs(d.Merah), Math.abs(d.Biru));
      if (tot > maxRoundPoints) {
        maxRoundPoints = tot;
        maxRoundWinner = d.Merah > d.Biru ? "SUDUT MERAH" : d.Merah < d.Biru ? "SUDUT BIRU" : "Yg Lain";
        maxRoundNum = d.roundNum;
      }
    });

    return {
      redRoundsWon,
      blueRoundsWon,
      draws,
      maxRoundPoints,
      maxRoundWinner,
      maxRoundNum
    };
  }, [chartData]);

  const activeRedName = state?.fighterRedName || "Pesilat Merah";
  const activeBlueName = state?.fighterBlueName || "Pesilat Biru";

  // SVG coordinate calculation helpers
  const svgWidth = 600;
  const svgHeight = 160;
  const padLeft = 36;
  const padRight = 20;
  const padTop = 14;
  const padBottom = 24;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const domainBounds = useMemo(() => {
    let minVal = 0;
    let maxVal = 10;

    chartData.forEach((d) => {
      if (chartType === "side-by-side") {
        minVal = Math.min(minVal, d.Merah, d.Biru);
        maxVal = Math.max(maxVal, d.Merah, d.Biru);
      } else if (chartType === "cumulative") {
        minVal = Math.min(minVal, d["Kumulatif Merah"], d["Kumulatif Biru"]);
        maxVal = Math.max(maxVal, d["Kumulatif Merah"], d["Kumulatif Biru"]);
      } else {
        minVal = Math.min(minVal, d.redPenalties, d.bluePenalties);
        maxVal = Math.max(maxVal, d.redPositive, d.bluePositive);
      }
    });

    if (maxVal === minVal) {
      maxVal = minVal + 10;
    }
    const padMax = Math.ceil(maxVal * 1.15);
    const padMin = minVal < 0 ? Math.floor(minVal * 1.15) : 0;
    return { min: padMin, max: Math.max(padMax, 5) };
  }, [chartData, chartType]);

  const valToY = (v: number) => {
    const range = domainBounds.max - domainBounds.min || 1;
    return padTop + plotH - ((v - domainBounds.min) / range) * plotH;
  };

  const zeroY = valToY(0);

  const yTicks = useMemo(() => {
    const { min, max } = domainBounds;
    const step = Math.max(1, Math.ceil((max - min) / 4));
    const ticks: number[] = [];
    for (let v = min; v <= max; v += step) {
      ticks.push(v);
    }
    if (!ticks.includes(0) && min < 0 && max > 0) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return ticks;
  }, [domainBounds]);

  const hoveredItem = hoveredIdx !== null ? chartData[hoveredIdx] : null;

  return (
    <section
      className="bg-[#07112a]/90 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_20px_rgba(37,99,235,0.15)] relative flex flex-col gap-2 w-full"
      id="score-recharts-dashboard"
    >
      {/* Decorative top border glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/40 via-cyan-400 to-blue-500/40 rounded-t-2xl" />

      {/* Title & Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-950/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-950/60 border border-cyan-500/30">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-left">
            <h2 className="text-xs uppercase font-sans font-black tracking-widest text-white drop-shadow">
              Visualisasi Analisis Skor Laga
            </h2>
            <span className="text-[8px] font-bold text-cyan-300/60 uppercase block mt-0.5">
              Statistik perolehan nilai kedua pesilat per ronde resmi IPSI
            </span>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex rounded-xl bg-[#030716] p-1 border border-blue-900/50 font-sans" id="chart-style-toggle-group">
          <button
            type="button"
            onClick={() => setChartType("side-by-side")}
            className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border flex items-center gap-1 ${
              chartType === "side-by-side"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-cyan-300/50 border-transparent hover:text-cyan-200"
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Per Ronde
          </button>
          <button
            type="button"
            onClick={() => setChartType("cumulative")}
            className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border flex items-center gap-1 ${
              chartType === "cumulative"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-cyan-300/50 border-transparent hover:text-cyan-200"
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Akumulatif
          </button>
          <button
            type="button"
            onClick={() => setChartType("composition")}
            className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border flex items-center gap-1 ${
              chartType === "composition"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-cyan-300/50 border-transparent hover:text-cyan-200"
            }`}
          >
            <Layers className="w-3 h-3" />
            Tipe Aksi
          </button>
        </div>
      </div>

      {/* Main Chart Container */}
      <div
        className="w-full h-48 sm:h-52 bg-[#020512] rounded-xl border border-blue-950/80 p-2 flex flex-col justify-between relative overflow-hidden"
        id="recharts-stage-container"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {logs.length <= 1 ? (
          <div className="text-center my-auto py-6 flex flex-col items-center gap-1.5 select-none z-10">
            <Info className="w-6 h-6 text-cyan-400/40 animate-pulse" />
            <p className="text-[11px] uppercase font-black text-slate-400 italic font-sans">
              Belum ada aksi poin dalam laga...
            </p>
            <p className="text-[8.5px] text-cyan-300/30 uppercase max-w-xs font-bold">
              Data grafik otomatis diperbarui setelah wasit/juri memvalidasi nilai tanding.
            </p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pt-0.5 text-[9.5px] font-sans font-bold select-none shrink-0">
              {chartType === "composition" ? (
                <>
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 rounded-xs bg-[#dc2626] inline-block" />
                    Merah (Pukulan/Tendangan/Jatuhan)
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="w-2 h-2 rounded-xs bg-[#06b6d4] inline-block" />
                    Biru (Pukulan/Tendangan/Jatuhan)
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block" />
                    {chartType === "cumulative" ? `Kumulatif ${activeRedName}` : activeRedName}
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-[#06b6d4] inline-block" />
                    {chartType === "cumulative" ? `Kumulatif ${activeBlueName}` : activeBlueName}
                  </span>
                </>
              )}
            </div>

            {/* Responsive SVG Chart */}
            <div className="relative flex-1 w-full min-h-0">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible select-none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines & Y-Axis Labels */}
                {yTicks.map((tick) => {
                  const y = valToY(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke={tick === 0 ? "#1e3a8a" : "#13255c"}
                        strokeWidth={tick === 0 ? 1.2 : 1}
                        strokeDasharray={tick === 0 ? undefined : "3 3"}
                        opacity={tick === 0 ? 0.8 : 0.35}
                      />
                      <text
                        x={padLeft - 6}
                        y={y + 3}
                        textAnchor="end"
                        fill="#38bdf8"
                        fontSize="9.5"
                        fontFamily="Inter, sans-serif"
                        fontWeight="bold"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Baseline */}
                <line
                  x1={padLeft}
                  y1={padTop + plotH}
                  x2={svgWidth - padRight}
                  y2={padTop + plotH}
                  stroke="#38bdf8"
                  strokeWidth={1}
                  opacity={0.5}
                />

                {/* Y-Axis Line */}
                <line
                  x1={padLeft}
                  y1={padTop}
                  x2={padLeft}
                  y2={padTop + plotH}
                  stroke="#38bdf8"
                  strokeWidth={1}
                  opacity={0.5}
                />

                {/* Chart Content by Type */}
                {chartType === "side-by-side" &&
                  chartData.map((d, idx) => {
                    const colW = plotW / chartData.length;
                    const centerX = padLeft + colW * idx + colW / 2;
                    const barW = Math.min(28, colW * 0.28);
                    const gap = 4;

                    const redY = d.Merah >= 0 ? valToY(d.Merah) : zeroY;
                    const redH = Math.max(2, Math.abs(valToY(d.Merah) - zeroY));

                    const blueY = d.Biru >= 0 ? valToY(d.Biru) : zeroY;
                    const blueH = Math.max(2, Math.abs(valToY(d.Biru) - zeroY));

                    return (
                      <g
                        key={d.name}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        className="cursor-pointer"
                      >
                        {/* Hover column highlight */}
                        <rect
                          x={padLeft + colW * idx + 4}
                          y={padTop}
                          width={colW - 8}
                          height={plotH}
                          fill={hoveredIdx === idx ? "rgba(6, 182, 212, 0.07)" : "transparent"}
                          rx={4}
                        />
                        {/* Red Bar */}
                        <rect
                          x={centerX - barW - gap / 2}
                          y={redY}
                          width={barW}
                          height={redH}
                          fill="#ef4444"
                          rx={3}
                        />
                        {/* Blue Bar */}
                        <rect
                          x={centerX + gap / 2}
                          y={blueY}
                          width={barW}
                          height={blueH}
                          fill="#06b6d4"
                          rx={3}
                        />
                        {/* X-Axis Label */}
                        <text
                          x={centerX}
                          y={svgHeight - 6}
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="9.5"
                          fontFamily="Inter, sans-serif"
                          fontWeight="bold"
                        >
                          {d.name}
                        </text>
                      </g>
                    );
                  })}

                {chartType === "cumulative" && (() => {
                  const colW = plotW / chartData.length;
                  const ptsRed = chartData.map((d, idx) => ({
                    x: padLeft + colW * idx + colW / 2,
                    y: valToY(d["Kumulatif Merah"]),
                    val: d["Kumulatif Merah"]
                  }));
                  const ptsBlue = chartData.map((d, idx) => ({
                    x: padLeft + colW * idx + colW / 2,
                    y: valToY(d["Kumulatif Biru"]),
                    val: d["Kumulatif Biru"]
                  }));

                  const lineRed = ptsRed.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                  const areaRed =
                    ptsRed.length > 0
                      ? `${lineRed} L ${ptsRed[ptsRed.length - 1].x} ${zeroY} L ${ptsRed[0].x} ${zeroY} Z`
                      : "";

                  const lineBlue = ptsBlue.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                  const areaBlue =
                    ptsBlue.length > 0
                      ? `${lineBlue} L ${ptsBlue[ptsBlue.length - 1].x} ${zeroY} L ${ptsBlue[0].x} ${zeroY} Z`
                      : "";

                  return (
                    <g>
                      {areaRed && <path d={areaRed} fill="url(#gradientRed)" />}
                      {areaBlue && <path d={areaBlue} fill="url(#gradientBlue)" />}
                      {lineRed && (
                        <path
                          d={lineRed}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {lineBlue && (
                        <path
                          d={lineBlue}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {chartData.map((d, idx) => {
                        const cx = padLeft + colW * idx + colW / 2;
                        return (
                          <g
                            key={d.name}
                            onMouseEnter={() => setHoveredIdx(idx)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={padLeft + colW * idx + 4}
                              y={padTop}
                              width={colW - 8}
                              height={plotH}
                              fill={hoveredIdx === idx ? "rgba(6, 182, 212, 0.07)" : "transparent"}
                              rx={4}
                            />
                            <circle
                              cx={ptsRed[idx].x}
                              cy={ptsRed[idx].y}
                              r={hoveredIdx === idx ? 4.5 : 3}
                              fill="#ef4444"
                              stroke="#020512"
                              strokeWidth={1.5}
                            />
                            <circle
                              cx={ptsBlue[idx].x}
                              cy={ptsBlue[idx].y}
                              r={hoveredIdx === idx ? 4.5 : 3}
                              fill="#06b6d4"
                              stroke="#020512"
                              strokeWidth={1.5}
                            />
                            <text
                              x={cx}
                              y={svgHeight - 6}
                              textAnchor="middle"
                              fill="#38bdf8"
                              fontSize="9.5"
                              fontFamily="Inter, sans-serif"
                              fontWeight="bold"
                            >
                              {d.name}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}

                {chartType === "composition" &&
                  chartData.map((d, idx) => {
                    const colW = plotW / chartData.length;
                    const centerX = padLeft + colW * idx + colW / 2;
                    const barW = Math.min(22, colW * 0.25);
                    const gap = 4;

                    const redSegments = [
                      { val: d.redPunches, color: "#b91c1c" },
                      { val: d.redKicks, color: "#dc2626" },
                      { val: d.redDrops, color: "#f43f5e" },
                      { val: d.redLocks, color: "#fb7185" }
                    ];
                    const blueSegments = [
                      { val: d.bluePunches, color: "#0284c7" },
                      { val: d.blueKicks, color: "#06b6d4" },
                      { val: d.blueDrops, color: "#38bdf8" },
                      { val: d.blueLocks, color: "#7dd3fc" }
                    ];

                    let redAcc = 0;
                    let blueAcc = 0;

                    return (
                      <g
                        key={d.name}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={padLeft + colW * idx + 4}
                          y={padTop}
                          width={colW - 8}
                          height={plotH}
                          fill={hoveredIdx === idx ? "rgba(6, 182, 212, 0.07)" : "transparent"}
                          rx={4}
                        />
                        {/* Red positive stacked segments */}
                        {redSegments.map((seg, sIdx) => {
                          if (seg.val <= 0) return null;
                          const yTop = valToY(redAcc + seg.val);
                          const yBot = valToY(redAcc);
                          redAcc += seg.val;
                          return (
                            <rect
                              key={`r-${sIdx}`}
                              x={centerX - barW - gap / 2}
                              y={yTop}
                              width={barW}
                              height={Math.max(1.5, yBot - yTop)}
                              fill={seg.color}
                            />
                          );
                        })}
                        {/* Red penalty segment */}
                        {d.redPenalties < 0 && (
                          <rect
                            x={centerX - barW - gap / 2}
                            y={zeroY}
                            width={barW}
                            height={Math.max(2, valToY(d.redPenalties) - zeroY)}
                            fill="#fda4af"
                          />
                        )}

                        {/* Blue positive stacked segments */}
                        {blueSegments.map((seg, sIdx) => {
                          if (seg.val <= 0) return null;
                          const yTop = valToY(blueAcc + seg.val);
                          const yBot = valToY(blueAcc);
                          blueAcc += seg.val;
                          return (
                            <rect
                              key={`b-${sIdx}`}
                              x={centerX + gap / 2}
                              y={yTop}
                              width={barW}
                              height={Math.max(1.5, yBot - yTop)}
                              fill={seg.color}
                            />
                          );
                        })}
                        {/* Blue penalty segment */}
                        {d.bluePenalties < 0 && (
                          <rect
                            x={centerX + gap / 2}
                            y={zeroY}
                            width={barW}
                            height={Math.max(2, valToY(d.bluePenalties) - zeroY)}
                            fill="#bae6fd"
                          />
                        )}

                        <text
                          x={centerX}
                          y={svgHeight - 6}
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="9.5"
                          fontFamily="Inter, sans-serif"
                          fontWeight="bold"
                        >
                          {d.name}
                        </text>
                      </g>
                    );
                  })}
              </svg>

              {/* Floating Tooltip on Hover */}
              {hoveredItem && (
                <div className="absolute top-1 right-2 z-20 bg-[#050d24]/95 border border-cyan-500/40 p-2.5 rounded-xl shadow-2xl text-[10px] font-sans pointer-events-none min-w-[165px]">
                  <p className="font-black text-white border-b border-blue-950/80 pb-1 mb-1.5 tracking-wide uppercase">
                    {hoveredItem.name}
                  </p>
                  {chartType === "side-by-side" && (
                    <>
                      <div className="flex justify-between items-center gap-4 py-0.5 font-bold uppercase">
                        <span className="text-slate-300 font-medium">{activeRedName}:</span>
                        <span className="font-mono font-black text-red-400">
                          {hoveredItem.Merah > 0 ? `+${hoveredItem.Merah}` : hoveredItem.Merah} Poin
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-4 py-0.5 font-bold uppercase">
                        <span className="text-slate-300 font-medium">{activeBlueName}:</span>
                        <span className="font-mono font-black text-cyan-400">
                          {hoveredItem.Biru > 0 ? `+${hoveredItem.Biru}` : hoveredItem.Biru} Poin
                        </span>
                      </div>
                    </>
                  )}
                  {chartType === "cumulative" && (
                    <>
                      <div className="flex justify-between items-center gap-4 py-0.5 font-bold uppercase">
                        <span className="text-slate-300 font-medium">Kumulatif Merah:</span>
                        <span className="font-mono font-black text-red-400">
                          {hoveredItem["Kumulatif Merah"] > 0 ? `+${hoveredItem["Kumulatif Merah"]}` : hoveredItem["Kumulatif Merah"]} Poin
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-4 py-0.5 font-bold uppercase">
                        <span className="text-slate-300 font-medium">Kumulatif Biru:</span>
                        <span className="font-mono font-black text-cyan-400">
                          {hoveredItem["Kumulatif Biru"] > 0 ? `+${hoveredItem["Kumulatif Biru"]}` : hoveredItem["Kumulatif Biru"]} Poin
                        </span>
                      </div>
                    </>
                  )}
                  {chartType === "composition" && (
                    <div className="space-y-0.5 text-[9px]">
                      <div className="flex justify-between gap-3 text-red-400 font-bold">
                        <span>M (Pkl/Tnd/Jth/Pnl):</span>
                        <span className="font-mono">
                          +{hoveredItem.redPunches}/+{hoveredItem.redKicks}/+{hoveredItem.redDrops + hoveredItem.redLocks}/{hoveredItem.redPenalties}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 text-cyan-400 font-bold">
                        <span>B (Pkl/Tnd/Jth/Pnl):</span>
                        <span className="font-mono">
                          +{hoveredItem.bluePunches}/+{hoveredItem.blueKicks}/+{hoveredItem.blueDrops + hoveredItem.blueLocks}/{hoveredItem.bluePenalties}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Analytics Insights Dashboard Card - Bento Style Row */}
      {logs.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" id="charts-analysis-insight-row">
          {/* Round Leader Stats CARD */}
          <div className="bg-[#030716] border border-blue-900/60 p-2.5 rounded-xl text-left flex flex-col gap-0.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Award className="w-3.5 h-3.5 text-[#facc15]" />
              <span className="text-[8.5px] font-sans font-black uppercase tracking-wider">
                Penguasaan Ronde
              </span>
            </div>
            <div className="text-[11.5px] font-sans font-black text-white uppercase mt-0.5 truncate">
              {roundSummary.redRoundsWon > roundSummary.blueRoundsWon
                ? `MERAH DOMINAN (${roundSummary.redRoundsWon}/${roundCount})`
                : roundSummary.blueRoundsWon > roundSummary.redRoundsWon
                ? `BIRU DOMINAN (${roundSummary.blueRoundsWon}/${roundCount})`
                : `RONDE SEIMBANG (${roundSummary.draws} Seri)`}
            </div>
            <span className="text-[8px] text-cyan-300/60 uppercase font-sans font-bold truncate">
              Sapu ronde: Merah {roundSummary.redRoundsWon} • Biru {roundSummary.blueRoundsWon}
            </span>
          </div>

          {/* Golden Peak Points CARD */}
          <div className="bg-[#030716] border border-blue-900/60 p-2.5 rounded-xl text-left flex flex-col gap-0.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[8.5px] font-sans font-black uppercase tracking-wider">
                Ronde Teraktif
              </span>
            </div>
            <div className="text-[11.5px] font-sans font-black text-white uppercase mt-0.5 truncate">
              RONDE {roundSummary.maxRoundNum} ({roundSummary.maxRoundPoints} POIN)
            </div>
            <span className="text-[8px] text-cyan-300/60 uppercase font-sans font-bold truncate">
              Oleh {roundSummary.maxRoundWinner}
            </span>
          </div>

          {/* Rules Indicator Summary Card */}
          <div className="bg-[#030716] border border-blue-900/60 p-2.5 rounded-xl text-left flex flex-col gap-0.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="text-[8.5px] font-sans font-black uppercase tracking-wider">
                Dampak Pelanggaran
              </span>
            </div>
            <div className="text-[11.5px] font-sans font-black text-white uppercase mt-0.5 truncate">
              M:{logs.filter((l) => l.type === "PENALTY" && l.fighter === "RED").length}X • B:{logs.filter((l) => l.type === "PENALTY" && l.fighter === "BLUE").length}X
            </div>
            <span className="text-[8px] text-cyan-300/60 uppercase font-sans font-bold truncate">
              Total deduksi poin pelanggaran
            </span>
          </div>
        </div>
      )}

      {/* Micro Info Text */}
      <div className="flex items-center gap-1.5 bg-[#03081a] border border-blue-950 p-2 rounded-xl text-[8.5px] uppercase font-bold text-cyan-300/70 leading-tight select-none">
        <Info className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
        <span>
          Poin dihitung real-time berdasarkan log konsensus wasit juri 1, 2, 3 dan penalti dewan pertandingan sesuai ketetapan regulasi resmi Peraturan IPSI 2026 & PERSILAT.
        </span>
      </div>
    </section>
  );
}
