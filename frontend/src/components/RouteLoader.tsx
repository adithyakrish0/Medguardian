"use client";

import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

const MESSAGES = [
    "Syncing medications...",
    "Loading your dashboard...",
    "Fetching health records...",
    "Securing connection...",
    "Initializing Guardian AI..."
];

export default function RouteLoader() {
    return (
        <div className="fixed inset-0 bg-[#070d1a] flex items-center justify-center z-[9999]">
            <div className="flex flex-col items-center gap-6">

                {/* Animated ring around the logo */}
                <div className="relative">
                    {/* Outer spinning ring */}
                    <div className="w-20 h-20 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500/30 animate-spin" />

                    {/* Inner pulsing logo */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
                            <Shield className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>

                    {/* Second slower ring */}
                    <div className="absolute inset-[-8px] rounded-full border border-blue-500/10 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                </div>

                {/* Animated text */}
                <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-slate-300 animate-pulse">
                        Loading your dashboard...
                    </p>
                    <div className="flex items-center justify-center gap-1">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className="w-1 h-1 rounded-full bg-blue-500"
                                style={{
                                    animation: 'bounce 1.4s infinite ease-in-out',
                                    animationDelay: `${i * 0.16}s`
                                }}
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
