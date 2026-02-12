"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea } from 'recharts';

interface AdherenceChartProps {
    data: any[];
    variant?: 'full' | 'mini';
}

export default function AdherenceChart({ data, variant = 'full' }: AdherenceChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center opacity-20">
                <p className="text-[10px] font-black uppercase tracking-widest">No Intelligence Data Streamed</p>
            </div>
        );
    }


    const isMini = variant === 'mini';

    // Find the point where account was established
    const establishmentPoint = data.find(p => p.isEstablishment);
    const lockedPoints = data.filter(p => p.isLocked);

    return (
        <div className="h-full w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={isMini ? { top: 10, right: 10, left: 10, bottom: 5 } : { top: 40, right: 10, left: -20, bottom: 30 }}
                >
                    <defs>
                        <linearGradient id="colorAdherence" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2D60FF" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2D60FF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLocked" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                        <filter id="shadow" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                            <feOffset dx="0" dy="4" result="offsetblur" />
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.5" />
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {!isMini && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />}

                    {/* Locked Background Area */}
                    {(establishmentPoint || lockedPoints.length > 0) && (
                        <ReferenceArea
                            x1={data[0].date}
                            x2={establishmentPoint ? establishmentPoint.date : lockedPoints[lockedPoints.length - 1].date}
                            fill="#ffffff"
                            fillOpacity={0.08}
                            stroke="none"
                        />
                    )}

                    {!isMini && (
                        <>
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }}
                                dy={10}
                                interval={data.length > 7 ? (data.length > 15 ? 4 : 2) : 0}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }}
                                domain={[0, 100]}
                                ticks={[0, 50, 100]}
                            />
                        </>
                    )}

                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-slate-900/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">{data.date}</p>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${data.isLocked ? 'bg-white/20' : 'bg-primary'}`} />
                                            <p className="text-sm font-black text-white">
                                                {data.isLocked ? 'DATA LOCKED' : `ADHERENCE: ${data.adherence}%`}
                                            </p>
                                        </div>
                                        {data.isEstablishment && (
                                            <div className="mt-2 text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-primary animate-pulse rounded-full" />
                                                Account Created
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        }}
                        cursor={{ stroke: '#2D60FF20', strokeWidth: 2 }}
                    />

                    {establishmentPoint && (
                        <ReferenceLine
                            x={establishmentPoint.date}
                            stroke="#2D60FF"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                        />
                    )}

                    <Area
                        type="monotone"
                        dataKey="adherence"
                        stroke="#2D60FF"
                        strokeWidth={isMini ? 2 : 4}
                        fillOpacity={isMini ? 0.1 : 1}
                        fill="url(#colorAdherence)"
                        filter="url(#shadow)"
                        isAnimationActive={true}
                        animationDuration={1500}
                        dot={({ cx, cy, payload }) => {
                            if (isMini) {
                                return <circle cx={cx} cy={cy} r={2} fill="#2D60FF" stroke="none" className="opacity-40" />;
                            }
                            if (!isMini && payload.isEstablishment) {
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={6}
                                        fill="#2D60FF"
                                        stroke="white"
                                        strokeWidth={2}
                                        className="animate-pulse"
                                    />
                                );
                            }
                            return null;
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
