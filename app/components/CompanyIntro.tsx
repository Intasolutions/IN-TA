'use client';

import React from 'react';

export default function FeaturesAndStats() {
  return (
    <section
      className="py-24 px-6 md:px-12 lg:px-20 bg-[#fbf9f5]"
      aria-label="Core Services and Agency Statistics"
    >
      <div className="max-w-7xl mx-auto">

        {/* Top Section: Intro & Button */}
        <header className="max-w-3xl mb-20">
          <h2 className="text-xl md:text-2xl text-slate-700 leading-relaxed font-light mb-8" data-reveal="cascade">
            Our expertise lies in architecting reliable web ecosystems and custom enterprise
            solutions designed to evolve in lockstep with your business ambitions.
          </h2>
          <button
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#0b2a5f] text-white font-medium hover:bg-blue-800 transition-all duration-300 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5"
            aria-label="Learn more about our custom enterprise solutions"
            data-reveal="cascade"
          >
            For More
          </button>
        </header>

        {/* Middle Section: Feature Cards */}
        <div className="cards-container grid md:grid-cols-3 gap-6 lg:gap-8 mb-24">

          {/* Card 1 */}
          <article className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all duration-300 group" data-reveal="cascade">
            <div className="w-12 h-12 rounded-xl bg-[#0b2a5f] text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Strategic Design</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Modular frameworks ensuring visual consistency across your digital ecosystem.
            </p>
          </article>

          {/* Card 2 */}
          <article className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all duration-300 group" data-reveal="cascade">
            <div className="w-12 h-12 rounded-xl bg-[#0b2a5f] text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Enterprise Arch.</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Engineered for high-load performance with automated CI/CD workflows.
            </p>
          </article>

          {/* Card 3 */}
          <article className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all duration-300 group" data-reveal="cascade">
            <div className="w-12 h-12 rounded-xl bg-[#0b2a5f] text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Data Intelligence</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Integrated analytics providing actionable insights for strategic decisions.
            </p>
          </article>

        </div>

        {/* Bottom Section: Stats */}
        <div className="stats-container pt-12 border-t border-slate-200/60">
          <div className="flex flex-col md:flex-row justify-center items-center gap-16 md:gap-32">

            <div className="text-center" data-reveal="cascade">
              <div className="text-5xl md:text-6xl font-black text-slate-900 mb-2">20+</div>
              <div className="text-sm font-bold tracking-widest text-slate-500 uppercase">
                Projects Delivered
              </div>
            </div>

            {/* Divider line for desktop */}
            <div className="hidden md:block w-px h-16 bg-slate-300"></div>

            <div className="text-center" data-reveal="cascade">
              <div className="text-5xl md:text-6xl font-black text-slate-900 mb-2">100%</div>
              <div className="text-sm font-bold tracking-widest text-slate-500 uppercase">
                Client Satisfaction
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}