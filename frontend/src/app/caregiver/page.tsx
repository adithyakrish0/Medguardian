"use client";

import { motion } from 'framer-motion';
import {
    Users,
    Link2,
    Activity,
    ShieldCheck,
    MessageSquare,
    ChevronRight,
    Plus,
    Clock
} from 'lucide-react';

export default function CaregiverPage() {
    const seniors = [
        {
            name: "John Doe (Senior)",
            status: "Stable",
            lastChecked: "10 mins ago",
            adherence: "98%",
            id: "#SR-9921",
            bg: "bg-blue-500/10",
            icon: "JD"
        },
        {
            name: "Jane Smith (Senior)",
            status: "Attention Required",
            lastChecked: "2h ago",
            adherence: "82%",
            id: "#SR-0128",
            bg: "bg-purple-500/10",
            icon: "JS"
        },
    ];

    return (
        <div className="space-y-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-primary font-black text-[10px] uppercase tracking-[0.2em]">
                        <Users className="w-3 h-3" />
                        Executive Networking
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight">Caregiver Portal</h1>
                    <p className="opacity-60 mt-3 max-w-lg">
                        Interface with linked accounts and monitor patient adherence telemetry in real-time.
                    </p>
                </div>
                <button className="group px-8 py-4 bg-primary text-white rounded-[24px] font-black shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3">
                    <Link2 className="w-5 h-5" />
                    Connect New Senior
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-2 gap-8">
                {seniors.map((senior, index) => (
                    <motion.div
                        key={senior.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="medical-card p-10 group relative transition-all hover:border-primary/20 bg-card/40 backdrop-blur-md"
                    >
                        <div className="flex justify-between items-start mb-10">
                            <div className="flex items-center gap-5">
                                <div className={`w-16 h-16 rounded-[22px] ${senior.bg} flex items-center justify-center font-black text-foreground text-xl border border-white/10 shadow-inner`}>
                                    {senior.icon}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-foreground tracking-tight">{senior.name}</h3>
                                    <p className="text-[10px] opacity-40 font-black uppercase tracking-widest mt-1">Registry ID: {senior.id}</p>
                                </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${senior.status === 'Stable'
                                    ? 'bg-accent/10 text-accent border-accent/20'
                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                {senior.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-10">
                            <div className="bg-background/40 border border-card-border p-6 rounded-[28px] group-hover:border-primary/10 transition-colors">
                                <p className="text-[10px] opacity-30 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3 text-accent" />
                                    Adherence
                                </p>
                                <p className="text-3xl font-black text-foreground">{senior.adherence}</p>
                            </div>
                            <div className="bg-background/40 border border-card-border p-6 rounded-[28px] group-hover:border-primary/10 transition-colors">
                                <p className="text-[10px] opacity-30 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-primary" />
                                    Last Check
                                </p>
                                <p className="text-lg font-black text-foreground mt-1">{senior.lastChecked}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="py-4.5 bg-secondary/10 text-foreground border border-card-border rounded-[22px] font-black shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                                <Activity className="w-4 h-4" />
                                Reports
                            </button>
                            <button className="py-4.5 bg-background border border-card-border text-foreground/40 rounded-[22px] font-black hover:text-foreground hover:bg-card transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                                <MessageSquare className="w-4 h-4" />
                                Contact
                            </button>
                        </div>
                    </motion.div>
                ))}

                {/* Add Connection Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="medical-card border-dashed border-[3px] border-card-border/50 flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:rotate-90 transition-transform duration-500">
                        <Plus className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">Initialize Connection</p>
                    <p className="text-[10px] mt-3 font-black uppercase tracking-widest opacity-30">Requires active invitation cryptographic token</p>
                </motion.div>
            </div>
        </div>
    );
}
