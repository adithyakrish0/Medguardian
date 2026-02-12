"use client";

import { motion } from 'framer-motion';
import { Pill, Users, Bell, FileText, CheckCircle, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}

function EmptyStateBase({ title, description, icon, action }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
            <p className="text-foreground/60 max-w-sm mb-6">{description}</p>
            {action && (
                action.href ? (
                    <Link href={action.href}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            {action.label}
                        </motion.button>
                    </Link>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={action.onClick}
                        className="px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        {action.label}
                    </motion.button>
                )
            )}
        </motion.div>
    );
}

// No medications added yet
export function NoMedicationsYet() {
    return (
        <EmptyStateBase
            icon={<Pill className="w-10 h-10 text-primary" />}
            title="No Medications Yet"
            description="Add your first medication to start tracking your health journey."
            action={{ label: "Add Medication", href: "/medications/add" }}
        />
    );
}

// All medications taken - celebration state
export function AllCaughtUp() {
    return (
        <EmptyStateBase
            icon={<CheckCircle className="w-10 h-10 text-green-500" />}
            title="All Caught Up! 🎉"
            description="You've taken all your scheduled medications. Great job staying on track!"
        />
    );
}

// No patients for caregiver
export function NoPatientsYet() {
    return (
        <EmptyStateBase
            icon={<Users className="w-10 h-10 text-primary" />}
            title="No Patients Yet"
            description="You haven't connected with any patients. Send an invite to start monitoring."
            action={{ label: "Invite Patient", href: "/caregiver/invite" }}
        />
    );
}

// No alerts
export function NoAlertsYet() {
    return (
        <EmptyStateBase
            icon={<Bell className="w-10 h-10 text-primary" />}
            title="No Alerts"
            description="Everything is running smoothly. You'll be notified if any issues arise."
        />
    );
}

// No activity logs
export function NoActivityYet() {
    return (
        <EmptyStateBase
            icon={<Activity className="w-10 h-10 text-primary" />}
            title="No Activity Yet"
            description="Activity will appear here once medications are logged."
        />
    );
}

// No reports
export function NoReportsYet() {
    return (
        <EmptyStateBase
            icon={<FileText className="w-10 h-10 text-primary" />}
            title="No Reports Available"
            description="Reports will be generated once you have enough medication data."
        />
    );
}

// No scheduled doses for today
export function NoDosesToday() {
    return (
        <EmptyStateBase
            icon={<Calendar className="w-10 h-10 text-primary" />}
            title="No Doses Today"
            description="You don't have any medications scheduled for today. Enjoy your day!"
        />
    );
}
