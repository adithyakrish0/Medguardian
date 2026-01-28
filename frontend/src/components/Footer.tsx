import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-medical-primary text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-medical-primary font-bold">
                                M
                            </div>
                            <span className="text-xl font-bold tracking-tight">MedGuardian</span>
                        </div>
                        <p className="text-gray-300 max-w-xs">
                            Empowering seniors to live independently with the help of advanced AI and compassionate technology.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Product</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="/safety" className="hover:text-white transition-colors">Safety</Link></li>
                            <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                            <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} MedGuardian AI. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
