import React from 'react';

import Footer1 from '../components/Footersecond';
import Header1 from '../components/Header1';

export default function TermsPage() {
    return (
       
        <main className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">    
         <Header1/>        
            <div className="container mx-auto max-w-4xl">
                <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>

                <div className="space-y-8 text-slate-700 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Introduction</h2>
                        <p>
                            Welcome to IN-TA Solutions. By accessing our website and services, you agree to be bound by these
                            Terms of Service. Please read them carefully.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Use of Services</h2>
                        <p>
                            You agree to use our services only for lawful purposes and in accordance with these Terms.
                            You are responsible for maintaining the confidentiality of your account information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Intellectual Property</h2>
                        <p>
                            All content, features, and functionality of our services, including but not limited to text,
                            graphics, logos, and software, are the exclusive property of IN-TA Solutions and are protected
                            by copyright and other intellectual property laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Limitation of Liability</h2>
                        <p>
                            IN-TA Solutions shall not be liable for any indirect, incidental, special, consequential, or
                            punitive damages resulting from your use of or inability to use the service.
                        </p>
                    </section>

                    <div className="mt-12 text-sm text-slate-500">
                        Last updated: {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
            <Footer1/>
        </main>
    );
}
