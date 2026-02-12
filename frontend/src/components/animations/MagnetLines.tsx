"use client";

import { useRef, useState, useEffect } from "react";

interface MagnetLinesProps {
  rows?: number;
  columns?: number;
  containerClassName?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
}

export default function MagnetLines({
  rows = 9,
  columns = 9,
  containerClassName = "",
  lineColor = "#3b82f6",
  lineWidth = "2px",
  lineHeight = "20px",
  baseAngle = 0,
}: MagnetLinesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCursor({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative grid gap-4 overflow-hidden p-4 ${containerClassName}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: "100%",
        height: "100%",
      }}
    >
      {Array.from({ length: rows * columns }).map((_, i) => (
        <MagnetLine
          key={i}
          cursor={cursor}
          lineColor={lineColor}
          lineWidth={lineWidth}
          lineHeight={lineHeight}
          baseAngle={baseAngle}
        />
      ))}
    </div>
  );
}

function MagnetLine({
  cursor,
  lineColor,
  lineWidth,
  lineHeight,
  baseAngle,
}: {
  cursor: { x: number; y: number };
  lineColor: string;
  lineWidth: string;
  lineHeight: string;
  baseAngle: number;
}) {
  const lineRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState(baseAngle);

  useEffect(() => {
    if (lineRef.current) {
      const rect = lineRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate angle from line center to cursor
      const angle = Math.atan2(
        cursor.y - (centerY - lineRef.current.parentElement!.getBoundingClientRect().top),
        cursor.x - (centerX - lineRef.current.parentElement!.getBoundingClientRect().left)
      ) * (180 / Math.PI);

      setRotate(angle);
    }
  }, [cursor]);

  return (
    <div
      ref={lineRef}
      className="flex items-center justify-center transition-transform duration-150 ease-out"
      style={{
        width: "100%",
        height: "100%",
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          width: lineWidth,
          height: lineHeight,
          backgroundColor: lineColor,
          borderRadius: "10px",
          opacity: 0.3,
        }}
      />
    </div>
  );
}
