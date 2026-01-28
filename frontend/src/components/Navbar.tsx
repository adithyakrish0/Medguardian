import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-white font-bold">M</span>
                        </div>
                        <span className="text-xl font-bold text-foreground">MedGuardian</span>
                    </div>

                    <div className="hidden sm:flex space-x-8">
                        <Link href="/" className="nav-link">Home</Link>
                        <Link href="/dashboard" className="nav-link">Dashboard</Link>
                        <Link href="/medications" className="nav-link">Medications</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="px-5 py-2 rounded-full font-medium text-foreground hover:bg-black/5 transition-all"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/signup"
                            className="px-5 py-2 rounded-full font-medium bg-secondary text-white shadow-lg hover:bg-primary transition-all"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
