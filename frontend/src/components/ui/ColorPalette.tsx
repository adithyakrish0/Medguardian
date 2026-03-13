"use client";

import React from 'react';

const COLORS = {
    Primary: [
        { name: 'primary-50', hex: '#EFF6FF' },
        { name: 'primary-100', hex: '#DBEAFE' },
        { name: 'primary-500', hex: '#3B82F6' },
        { name: 'primary-600', hex: '#2563EB' },
        { name: 'primary-700', hex: '#1D4ED8' },
    ],
    Semantic: [
        { name: 'success', hex: '#10B981', desc: 'Positive health/adherence' },
        { name: 'warning', hex: '#F59E0B', desc: 'Alerts/Moderate risk' },
        { name: 'critical', hex: '#EF4444', desc: 'Severe alerts/Critical risk' },
        { name: 'info', hex: '#3B82F6', desc: 'General information' },
    ],
    Neutral: [
        { name: 'gray-50', hex: '#F9FAFB', desc: 'Page Background' },
        { name: 'gray-200', hex: '#E5E7EB', desc: 'Input/Card Borders' },
        { name: 'gray-700', hex: '#374151', desc: 'Body Text' },
        { name: 'gray-900', hex: '#111827', desc: 'Heading Text' },
    ]
};

export default function ColorPalette() {
    return (
        <div className="p-8 bg-gray-50 dark:bg-zinc-900 rounded-[32px] border border-gray-200 dark:border-gray-700 space-y-12">
            <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">Medical Trust Palette</h2>
                <p className="text-gray-500 italic font-medium">Standardized tokens for MedGuardian UI</p>
            </div>

            {Object.entries(COLORS).map(([category, shades]) => (
                <section key={category}>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 pb-2">
                        {category}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {shades.map((color) => (
                            <div key={color.name} className="space-y-3 group">
                                <div
                                    className="h-24 w-full rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 transition-transform group-hover:scale-105"
                                    style={{ backgroundColor: color.hex }}
                                />
                                <div>
                                    <p className="font-black text-gray-900 dark:text-gray-100 text-sm">{color.name}</p>
                                    <p className="text-xs text-gray-500 font-mono uppercase">{color.hex}</p>
                                    {'desc' in color && (
                                        <p className="text-[10px] text-primary-600 font-bold mt-1 uppercase leading-tight italic">
                                            {color.desc}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
