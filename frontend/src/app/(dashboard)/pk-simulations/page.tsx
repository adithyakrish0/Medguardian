'use client';

import { useState, useEffect } from 'react';
import { 
    Activity, 
    Brain, 
    Clock, 
    Zap, 
    TrendingUp, 
    FlaskConical, 
    ChevronRight,
    Search,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ReferenceArea, 
    ReferenceLine, 
    ResponsiveContainer 
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Medication {
    id: number;
    name: string;
    dosage: string;
}

interface PKData {
    medication: string;
    dose_mg: number;
    timepoints: number[];
    concentrations: number[];
    cmax: number;
    tmax: number;
    half_life: number;
    bioavailability: number;
    vd: number;
    therapeutic_range: {
        min: number;
        max: number;
        unit: string;
    };
}

export default function PKSimulationsPage() {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
    const [doseOverride, setDoseOverride] = useState<string>('');
    const [loadingMeds, setLoadingMeds] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [pkData, setPkData] = useState<PKData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMedications();
    }, []);

    const fetchMedications = async () => {
        setLoadingMeds(true);
        try {
            const res = await apiFetch('/pk/medications');
            if (res.success) {
                setMedications(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch meds:', err);
        } finally {
            setLoadingMeds(false);
        }
    };

    const runSimulation = async () => {
        if (!selectedMed) return;
        setSimulating(true);
        setError(null);
        try {
            const res = await apiFetch('/pk/simulate', {
                method: 'POST',
                body: JSON.stringify({
                    medication: selectedMed.name,
                    dose_mg: doseOverride || selectedMed.dosage
                })
            });
            if (res.success) {
                setPkData(res.data);
            } else {
                setError(res.message || 'Simulation failed');
            }
        } catch (err: any) {
            setError(err.message || 'Simulation failed');
        } finally {
            setSimulating(false);
        }
    };

    const chartData = pkData?.timepoints.map((t, i) => ({
        time: t,
        concentration: pkData.concentrations[i]
    }));

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-16 lg:pt-0">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <FlaskConical className="w-5 h-5 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                        PK_SIMULATIONS <span className="text-blue-400 not-italic">v1.0</span>
                    </h1>
                </div>
                <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase flex items-center gap-2">
                    <Activity className="w-3 h-3 text-teal-400" />
                    Advanced Pharmacokinetic Modeling Engine
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                {/* Sidebar */}
                <aside className="space-y-6">
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Search className="w-3 h-3" /> Select Medication
                        </h2>
                        
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {loadingMeds ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-3">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500/30 animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-4 h-4 rounded-md bg-blue-500/20 animate-pulse" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black animate-pulse">Loading medications...</p>
                                </div>
                            ) : medications.length === 0 ? (
                                <div className="text-center py-8 space-y-2">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">No active medications found</p>
                                    <p className="text-[9px] text-slate-600 uppercase tracking-tighter leading-tight px-4 font-bold">Ensure your seniors have active medications in their profile.</p>
                                </div>
                            ) : (
                                medications.map(med => (
                                    <button
                                        key={med.id}
                                        onClick={() => {
                                            setSelectedMed(med);
                                            setDoseOverride('');
                                        }}
                                        className={`w-full p-4 rounded-xl border text-left transition-all group ${
                                            selectedMed?.id === med.id 
                                            ? 'bg-blue-600/10 border-blue-500/50' 
                                            : 'bg-white/5 border-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <p className={`text-sm font-black tracking-tight ${selectedMed?.id === med.id ? 'text-blue-400' : 'text-white'}`}>
                                            {med.name}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{med.dosage}</p>
                                    </button>
                                ))
                            )}
                        </div>

                        {selectedMed && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 pt-8 border-t border-white/5 space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dose Override (mg)</label>
                                    <input 
                                        type="text" 
                                        placeholder={selectedMed.dosage}
                                        value={doseOverride}
                                        onChange={(e) => setDoseOverride(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                                    />
                                </div>

                                <button
                                    onClick={runSimulation}
                                    disabled={simulating}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-blue-500/20"
                                >
                                    {simulating ? <Activity className="w-4 h-4 animate-spin" /> : <Zap className="w-3 h-3" />}
                                    {simulating ? 'Processing...' : 'Run Simulation'}
                                </button>
                            </motion.div>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="space-y-8">
                    <AnimatePresence mode="wait">
                        {!pkData ? (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-[600px] flex flex-col items-center justify-center bg-slate-900/30 border border-dashed border-white/10 rounded-2xl p-12 text-center"
                            >
                                <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center mb-6 border border-white/5">
                                    <Activity className="w-6 h-6 text-slate-700" />
                                </div>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Ready for Simulation</h3>
                                <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest max-w-[180px]">Select a medication from the registry to generate PK curves.</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8"
                            >
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Peak Concentration', value: `${pkData.cmax}`, unit: 'ng/mL', icon: TrendingUp, color: 'text-blue-400' },
                                        { label: 'Time to Peak', value: `${pkData.tmax}`, unit: 'h', icon: Clock, color: 'text-amber-400' },
                                        { label: 'Half-Life', value: `${pkData.half_life}`, unit: 'h', icon: Activity, color: 'text-pink-400' },
                                        { label: 'Bioavailability', value: `${pkData.bioavailability}`, unit: '%', icon: Zap, color: 'text-teal-400' }
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
                                                {stat.label}
                                                <stat.icon className={`w-3 h-3 ${stat.color}`} />
                                            </p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-black text-white leading-none">{stat.value}</span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-none">{stat.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Chart Area */}
                                <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
                                    
                                    <div className="flex items-center justify-between mb-8 relative z-10">
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                                Concentration Profile 
                                                <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md">NG/ML</span>
                                            </h3>
                                            <p className="text-[9px] font-black text-slate-500 mt-1 uppercase tracking-widest">24-Hour Simulation Cycle</p>
                                        </div>
                                    </div>

                                    <div className="h-[400px] w-full relative z-10">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                                <defs>
                                                    <linearGradient id="curveColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                <XAxis 
                                                    dataKey="time" 
                                                    stroke="#475569" 
                                                    fontSize={9} 
                                                    fontWeight="black" 
                                                    axisLine={false}
                                                    tickLine={false}
                                                    label={{ value: 'Hours Post Dose', position: 'bottom', offset: 0, fill: '#475569', fontSize: 9, fontWeight: 'black' }}
                                                />
                                                <YAxis 
                                                    stroke="#475569" 
                                                    fontSize={9} 
                                                    fontWeight="black" 
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px', fontWeight: 'black' }}
                                                    itemStyle={{ color: '#3b82f6' }}
                                                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                                />
                                                
                                                {/* Therapeutic Range Shaded Area */}
                                                <ReferenceArea 
                                                    y1={pkData.therapeutic_range.min} 
                                                    y2={pkData.therapeutic_range.max} 
                                                    fill="#22c55e" 
                                                    fillOpacity={0.03} 
                                                />
                                                
                                                <ReferenceLine y={pkData.therapeutic_range.min} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.2} label={{ position: 'right', value: 'Min Therapeutic', fill: '#22c55e', fontSize: 8, fontWeight: 'black' }} />
                                                <ReferenceLine y={pkData.therapeutic_range.max} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.2} label={{ position: 'right', value: 'Max Therapeutic', fill: '#22c55e', fontSize: 8, fontWeight: 'black' }} />
                                                
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="concentration" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth={3}
                                                    dot={false}
                                                    activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                                                    animationDuration={2000}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Interpretation Card */}
                                <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                                    <div className="flex items-start gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                                            <Brain className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <div className="space-y-4 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest italic">AI_INTERPRETATION</h3>
                                                {pkData.cmax >= pkData.therapeutic_range.min && pkData.cmax <= pkData.therapeutic_range.max ? (
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                        <CheckCircle2 className="w-3 h-3" /> Within Therapeutic Zone
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                        <AlertCircle className="w-3 h-3" /> Review Required
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Elimination Dynamics</p>
                                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                                        Peak concentration of <span className="text-white font-bold">{pkData.cmax} {pkData.therapeutic_range.unit}</span> reached at <span className="text-white font-bold">{pkData.tmax} hours</span>. 
                                                        A half-life of <span className="text-white font-bold">{pkData.half_life} hours</span> suggests the drug will be substantially cleared by <span className="text-white font-bold">{Math.round(pkData.half_life * 5)} hours</span>.
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Steady State Impact</p>
                                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                                        The volume of distribution (<span className="text-white font-bold">{pkData.vd} L</span>) indicates the drug's affinity for tissue vs. plasma. 
                                                        Model suggests <span className="text-white font-bold">{pkData.bioavailability}%</span> absorption across the metabolic barrier.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}
