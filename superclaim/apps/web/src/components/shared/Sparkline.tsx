'use client';

import { useEffect, useRef } from 'react';

interface SparklineProps {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
}

export function Sparkline({ data, color = '#00e5cc', width = 120, height = 36 }: SparklineProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataStr = JSON.stringify(data);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentData = JSON.parse(dataStr) as number[];

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const min = Math.min(...currentData);
        const max = Math.max(...currentData);
        const range = max - min || 1;
        const stepX = width / (currentData.length - 1);

        const points = currentData.map((val, i) => ({
            x: i * stepX,
            y: height - ((val - min) / range) * (height - 4) - 2,
        }));

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color + '25');
        gradient.addColorStop(1, color + '00');

        // Draw fill
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const xc = (points[i - 1].x + points[i].x) / 2;
            const yc = (points[i - 1].y + points[i].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const xc = (points[i - 1].x + points[i].x) / 2;
            const yc = (points[i - 1].y + points[i].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.stroke();

        // End dot
        const last = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.fill();
    }, [dataStr, color, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width, height }}
            className="opacity-80"
        />
    );
}
