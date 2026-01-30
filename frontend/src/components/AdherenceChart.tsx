"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface AdherenceChartProps {
    data: any[];
}

export default function AdherenceChart({ data }: AdherenceChartProps) {
    if (!data || data.length === 0) return null;

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorAdherence" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2D60FF" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2D60FF" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }}
                        domain={[0, 100]}
                        ticks={[0, 50, 100]}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1E293B',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '12px',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: '#2D60FF', fontWeight: 'bold' }}
                        cursor={{ stroke: '#2D60FF20', strokeWidth: 2 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="adherence"
                        stroke="#2D60FF"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorAdherence)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
