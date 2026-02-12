'use client';

import { motion } from 'framer-motion';

export const DNALoader = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center h-24 w-24">
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-3 h-3 rounded-full bg-primary"
                            initial={{ opacity: 0.2, scale: 0.5 }}
                            animate={{
                                opacity: [0.2, 1, 0.2],
                                scale: [0.5, 1.2, 0.5],
                                y: [0, -20, 0],
                                x: Math.sin(i) * 20, // DNA Helix shape approximation
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                            }}
                            style={{
                                left: `calc(50% + ${Math.cos(i * (Math.PI / 4)) * 30}px)`,
                            }}
                        />
                    ))}
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={`strand-2-${i}`}
                            className="absolute w-3 h-3 rounded-full bg-secondary"
                            initial={{ opacity: 0.2, scale: 0.5 }}
                            animate={{
                                opacity: [0.2, 1, 0.2],
                                scale: [0.5, 1.2, 0.5],
                                y: [0, 20, 0],
                                x: Math.sin(i) * -20,
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                            }}
                            style={{
                                left: `calc(50% + ${Math.cos(i * (Math.PI / 4)) * 30}px)`,
                            }}
                        />
                    ))}
                </div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-muted-foreground font-medium animate-pulse"
                >
                    Analyzing parameters...
                </motion.p>
            </div>
        </div>
    );
};
