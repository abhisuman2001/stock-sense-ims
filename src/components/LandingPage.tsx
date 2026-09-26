import React, { useState } from 'react';
import { StockSenseLogo } from './StockSenseLogo';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ShieldCheck,
  HardHat,
  History,
  Building2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Menu,
  X,
  Lock,
  Layers,
  Zap,
  Check,
  Warehouse,
  BarChart3,
  Scan,
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onDemoLogin: (email: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onSignUp,
  onDemoLogin,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileNavOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1F1C18] font-sans selection:bg-[#F2C230] selection:text-[#1A1816] flex flex-col">
      {/* 1. PRE-AUTH NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-[#EAE6DF]/90 backdrop-blur-md border-b border-[#D8D2C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <StockSenseLogo variant="full" size="md" />
              <span className="hidden sm:inline text-[9px] font-mono tracking-widest px-1.5 py-0.5 bg-[#E2DDD3] text-[#38342D] border border-[#C8C2B5] uppercase font-bold">
                IMS
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8 text-xs font-mono font-medium text-[#5C5549]">
              <button
                onClick={() => scrollToSection('features')}
                className="hover:text-[#1F1C18] transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('preview')}
                className="hover:text-[#1F1C18] transition-colors cursor-pointer"
              >
                Terminal Preview
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-[#1F1C18] transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('demo-access')}
                className="hover:text-[#1F1C18] transition-colors cursor-pointer flex items-center gap-1 text-[#B47805] font-semibold"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Instant Demo</span>
              </button>
            </nav>

            {/* Pre-Auth Actions */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={onSignIn}
                className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#1F1C18] hover:text-[#B47805] border border-[#CEC7B8] bg-[#FDFCFA] hover:border-[#B47805] transition-colors cursor-pointer shadow-xs"
              >
                Sign In
              </button>
              <button
                onClick={onSignUp}
                className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] border border-[#D9AD25] transition-all cursor-pointer shadow-xs hover:shadow flex items-center gap-1.5"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-2 border border-[#CEC7B8] bg-[#FDFCFA] text-[#5C5549] hover:text-[#1F1C18] md:hidden cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-[#D8D2C5] bg-[#EAE6DF] px-4 py-4 space-y-3 font-mono text-xs shadow-lg animate-in slide-in-from-top-2">
            <button
              onClick={() => scrollToSection('features')}
              className="w-full text-left py-2 px-2 text-[#1F1C18] hover:bg-[#FDFCFA] border border-transparent hover:border-[#CEC7B8] transition-colors"
            >
              • Key Features
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="w-full text-left py-2 px-2 text-[#1F1C18] hover:bg-[#FDFCFA] border border-transparent hover:border-[#CEC7B8] transition-colors"
            >
              • Terminal Preview
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="w-full text-left py-2 px-2 text-[#1F1C18] hover:bg-[#FDFCFA] border border-transparent hover:border-[#CEC7B8] transition-colors"
            >
              • How It Works
            </button>
            <button
              onClick={() => scrollToSection('demo-access')}
              className="w-full text-left py-2 px-2 text-[#B47805] font-bold hover:bg-[#FDFCFA] border border-transparent hover:border-[#CEC7B8] transition-colors"
            >
              ⚡ Instant Demo Access
            </button>

            <div className="pt-2 border-t border-[#D8D2C5] flex flex-col gap-2">
              <button
                onClick={onSignIn}
                className="w-full py-2.5 text-center text-xs font-mono font-bold uppercase tracking-wider text-[#1F1C18] border border-[#CEC7B8] bg-[#FDFCFA]"
              >
                Sign In to Terminal
              </button>
              <button
                onClick={onSignUp}
                className="w-full py-2.5 text-center text-xs font-mono font-bold uppercase tracking-wider bg-[#F2C230] text-[#1A1816] font-bold border border-[#D9AD25]"
              >
                Create New Account
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#D8D2C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Small-caps Monospace Tagline Chip */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#E2DDD3] border border-[#C8C2B5] text-[#38342D] text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-pulse" />
              <span>INDUSTRIAL WAREHOUSE LOGISTICS</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#141312] leading-[1.1]">
              Real-time inventory, <br className="hidden sm:inline" />
              <span className="text-[#4F46E5]">zero guesswork.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-[#5C5549] max-w-2xl mx-auto font-sans leading-relaxed">
              Replace chaotic manual registers and fragile spreadsheets with a unified, ledger-backed warehouse operations system. Unified receipts, deliveries, internal transfers, and adjustments in one auditable platform.
            </p>

            {/* Primary & Secondary Call To Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={onSignUp}
                className="w-full sm:w-auto px-7 py-3 text-sm font-mono font-bold uppercase tracking-wider bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] border border-[#D9AD25] transition-all cursor-pointer shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onSignIn}
                className="w-full sm:w-auto px-7 py-3 text-sm font-mono font-bold uppercase tracking-wider text-[#1F1C18] hover:text-[#B47805] border border-[#CEC7B8] bg-[#FDFCFA] hover:border-[#B47805] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Lock className="w-4 h-4 text-[#8B8478]" />
                <span>Sign In to Terminal</span>
              </button>
            </div>

            {/* Small uppercase monospace trust / feature chips */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#5C5549]">
              <span className="px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#4A90D9]" />
                RBAC SECURED
              </span>
              <span className="px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#5FA85D]" />
                LEDGER-BACKED
              </span>
              <span className="px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5] font-semibold flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#E8A33D]" />
                MULTI-WAREHOUSE
              </span>
              <span className="px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5] font-semibold flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#818CF8]" />
                ATOMIC TRANSFERS
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRODUCT PREVIEW SECTION (BROWSER-CHROME CARD) */}
      <section id="preview" className="py-16 sm:py-20 bg-[#EAE6DF] border-b border-[#D8D2C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C5549] px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5] font-bold">
              PRODUCTION INTERFACE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141312] mt-2">
              Industrial Workstation Terminal
            </h2>
            <p className="text-xs sm:text-sm text-[#5C5549] font-mono mt-1">
              Purpose-built ergonomics for floor pickers and warehouse operations managers.
            </p>
          </div>

          {/* Browser-Chrome Frame */}
          <div className="max-w-5xl mx-auto bg-[#201E1A] border border-[#34312B] shadow-2xl rounded-none overflow-hidden text-[#F5F3EF]">
            {/* Chrome Bar */}
            <div className="bg-[#1A1816] border-b border-[#34312B] px-4 py-2.5 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#D9534F]/80" />
                <div className="w-3 h-3 rounded-full bg-[#E8A33D]/80" />
                <div className="w-3 h-3 rounded-full bg-[#5FA85D]/80" />
                <span className="ml-2 text-[10px] font-mono text-[#8B8478] hidden sm:inline">
                  StockSense IMS Terminal • Station WH-MAIN
                </span>
              </div>

              <div className="flex items-center gap-2 bg-[#201E1A] px-3 py-1 border border-[#34312B] text-[10px] font-mono text-[#8B8478] max-w-xs truncate">
                <Lock className="w-3 h-3 text-[#5FA85D]" />
                <span>stocksense.internal/terminal/operations</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[rgba(95,168,93,0.15)] text-[#5FA85D] border border-[rgba(95,168,93,0.4)] uppercase">
                  ONLINE
                </span>
              </div>
            </div>

            {/* Recreated Software UI Mockup */}
            <div className="p-4 sm:p-6 space-y-5 bg-[#201E1A]">
              {/* Terminal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#34312B] gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-[#F5F3EF]">
                      Floor Workstation Terminal
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-[rgba(74,144,217,0.15)] text-[#4A90D9] border border-[rgba(74,144,217,0.4)]">
                      FLOOR OPERATOR [WH]
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#8B8478] mt-0.5">
                    Live bay putaway queue at [WH] Main Central Facility
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-1 bg-[#1A1816] border border-[#34312B] text-[#F2C230] font-semibold">
                    SHIFT: MORNING-01
                  </span>
                  <span className="px-2 py-1 bg-[#F2C230] text-[#1A1816] font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-[#262420] border border-[#34312B] p-3">
                  <div className="text-[10px] font-mono text-[#8B8478] uppercase">Station SKUs</div>
                  <div className="text-xl font-mono font-bold text-[#F5F3EF] mt-1">24 Items</div>
                  <div className="text-[9px] text-[#8B8478] mt-0.5">Assigned bay items</div>
                </div>
                <div className="bg-[#262420] border border-[#E8A33D] p-3">
                  <div className="text-[10px] font-mono text-[#E8A33D] uppercase">Low Bay Stock</div>
                  <div className="text-xl font-mono font-bold text-[#E8A33D] mt-1">2 Alerts</div>
                  <div className="text-[9px] text-[#8B8478] mt-0.5">Under reorder limit</div>
                </div>
                <div className="bg-[#262420] border border-[#4A90D9] p-3">
                  <div className="text-[10px] font-mono text-[#4A90D9] uppercase">Inbound Putaway</div>
                  <div className="text-xl font-mono font-bold text-[#4A90D9] mt-1">4 Receipts</div>
                  <div className="text-[9px] text-[#8B8478] mt-0.5">Ready for bay check-in</div>
                </div>
                <div className="bg-[#262420] border border-[#34312B] p-3">
                  <div className="text-[10px] font-mono text-[#8B8478] uppercase">Outbound Pick</div>
                  <div className="text-xl font-mono font-bold text-[#F5F3EF] mt-1">3 Orders</div>
                  <div className="text-[9px] text-[#8B8478] mt-0.5">Packing queue</div>
                </div>
              </div>

              {/* Terminal Table Mockup */}
              <div className="bg-[#262420] border border-[#34312B] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#34312B] text-[#8B8478] font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">Operation Ref</th>
                      <th className="py-2.5 px-3">Vendor / Entity</th>
                      <th className="py-2.5 px-3">Origin / Dest</th>
                      <th className="py-2.5 px-3 text-right">Units</th>
                      <th className="py-2.5 px-3 text-center">Lifecycle Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#34312B] font-mono text-[11px]">
                    <tr>
                      <td className="py-2.5 px-3 text-[#F2C230] font-bold">WH/IN/0002</td>
                      <td className="py-2.5 px-3 text-[#F5F3EF]">Apex Industrial Supplies</td>
                      <td className="py-2.5 px-3 text-[#8B8478]">Vendor → WH/Stock/Bay-A</td>
                      <td className="py-2.5 px-3 text-right text-[#F5F3EF]">40 Units</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 bg-[rgba(74,144,217,0.15)] text-[#4A90D9] border border-[rgba(74,144,217,0.4)] text-[9px] font-bold">
                          READY
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-[#F2C230] font-bold">WH/OUT/0001</td>
                      <td className="py-2.5 px-3 text-[#F5F3EF]">Global Logistics Ltd</td>
                      <td className="py-2.5 px-3 text-[#8B8478]">WH/Stock/Bay-B → Customer</td>
                      <td className="py-2.5 px-3 text-right text-[#F5F3EF]">12 Units</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 bg-[rgba(232,163,61,0.15)] text-[#E8A33D] border border-[rgba(232,163,61,0.4)] text-[9px] font-bold">
                          WAITING
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-[#F2C230] font-bold">WH/INT/0001</td>
                      <td className="py-2.5 px-3 text-[#F5F3EF]">Internal Facility Rebalance</td>
                      <td className="py-2.5 px-3 text-[#8B8478]">WH/Stock/Zone-1 → Assembly</td>
                      <td className="py-2.5 px-3 text-right text-[#F5F3EF]">20 Units</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 bg-[#201E1A] text-[#8B8478] border border-[#34312B] text-[9px] font-bold">
                          DRAFT
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Callout in preview */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#8B8478] gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#5FA85D] animate-ping" />
                  <span>Real-time Smart Alerts scanner active</span>
                </div>
                <button
                  onClick={() => onDemoLogin('staff@stocksense.io')}
                  className="w-full sm:w-auto px-4 py-1.5 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Launch Live Operator Terminal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURE GRID (4 CARDS) */}
      <section id="features" className="py-16 sm:py-24 border-b border-[#D8D2C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C5549] px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5] font-bold">
              CORE CAPABILITIES
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141312] mt-2">
              Engineered for Audit-Grade Accuracy
            </h2>
            <p className="text-xs sm:text-sm text-[#5C5549] font-mono mt-1">
              Every unit tracked from vendor receiving dock to final dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Feature 1 */}
            <div className="p-5 bg-[#FDFCFA] border border-[#D8D2C5] shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#38342D] px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5]">
                  RECEIPTS & DELIVERY
                </span>
                <h3 className="text-base font-bold text-[#141312] mt-3">
                  Unified Lifecycle Workflow
                </h3>
                <p className="text-xs text-[#5C5549] mt-2 leading-relaxed font-sans">
                  Standardized state machine (Draft → Waiting → Ready → Done). When marked Done, stock quants increment and decrement atomically.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#EFECE6] text-[10px] font-mono text-[#8B8478] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#5FA85D]" />
                <span>Zero phantom inventory</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-5 bg-[#FDFCFA] border border-[#D8D2C5] shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#4A90D9] px-2 py-0.5 bg-[rgba(74,144,217,0.15)] border border-[rgba(74,144,217,0.4)]">
                  ROLE-BASED ACCESS
                </span>
                <h3 className="text-base font-bold text-[#141312] mt-3">
                  Manager vs. Floor Operator
                </h3>
                <p className="text-xs text-[#5C5549] mt-2 leading-relaxed font-sans">
                  Strict separation of duties. Floor Operators work distraction-free without financial costs, while Managers access global FIFO valuations and catalog authorizations.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#EFECE6] text-[10px] font-mono text-[#8B8478] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#5FA85D]" />
                <span>Confidential cost shielding</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-5 bg-[#FDFCFA] border border-[#D8D2C5] shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#B47805] px-2 py-0.5 bg-[rgba(242,194,48,0.15)] border border-[rgba(242,194,48,0.4)]">
                  MOVE HISTORY LEDGER
                </span>
                <h3 className="text-base font-bold text-[#141312] mt-3">
                  Immutable Physical Audit
                </h3>
                <p className="text-xs text-[#5C5549] mt-2 leading-relaxed font-sans">
                  Every relocation, putaway, picking run, and count adjustment is permanently logged with timestamps, source, destination, and operator identity.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#EFECE6] text-[10px] font-mono text-[#8B8478] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#5FA85D]" />
                <span>Auditable ledger trail</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-5 bg-[#FDFCFA] border border-[#D8D2C5] shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#38342D] px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5]">
                  MULTI-WAREHOUSE
                </span>
                <h3 className="text-base font-bold text-[#141312] mt-3">
                  Multi-Facility Hierarchy
                </h3>
                <p className="text-xs text-[#5C5549] mt-2 leading-relaxed font-sans">
                  Configure unlimited warehouses, internal storage zones, receiving bays, and scrap locations with formal transfer documentation and barcode verification.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#EFECE6] text-[10px] font-mono text-[#8B8478] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#5FA85D]" />
                <span>Inter-facility visibility</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "HOW IT WORKS" 3-STEP VISUAL SECTION */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-[#EAE6DF] border-b border-[#D8D2C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C5549] px-2 py-0.5 bg-[#E2DDD3] border border-[#C8C2B5] font-bold">
              WORKFLOW EXECUTION
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141312] mt-2">
              How StockSense Powers Operations
            </h2>
            <p className="text-xs sm:text-sm text-[#5C5549] font-mono mt-1">
              A 3-step closed-loop movement pipeline engineered for physical velocity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-[#FDFCFA] border border-[#D8D2C5] p-6 shadow-xs relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-[#E2DDD3] border border-[#C8C2B5] text-[#141312]">
                  <ArrowDownToLine className="w-6 h-6 text-[#4F46E5]" />
                </div>
                <span className="text-2xl font-mono font-bold text-[#CEC7B8]">01</span>
              </div>
              <h3 className="text-base font-bold text-[#141312]">Receive & Dock Putaway</h3>
              <p className="text-xs text-[#5C5549] mt-2 font-sans leading-relaxed">
                Log inbound shipments from external vendors. Generate putaway lines, match purchase reference codes, verify counts, and store in designated storage bays.
              </p>
              <div className="mt-4 pt-3 border-t border-[#EFECE6] text-[10px] font-mono text-[#4A90D9] uppercase font-bold">
                Status: Inbound (IN)
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#FDFCFA] border border-[#D8D2C5] p-6 shadow-xs relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-[#E2DDD3] border border-[#C8C2B5] text-[#141312]">
                  <Boxes className="w-6 h-6 text-[#E8A33D]" />
                </div>
                <span className="text-2xl font-mono font-bold text-[#CEC7B8]">02</span>
              </div>
              <h3 className="text-base font-bold text-[#141312]">Track & Transfer</h3>
              <p className="text-xs text-[#5C5549] mt-2 font-sans leading-relaxed">
                Instant visibility across all locations. Relocate products between bays, stages, and warehouses with internal transfer documents and optical barcode scanning.
              </p>
              <div className="mt-4 pt-3 border-t border-[#EFECE6] text-[10px] font-mono text-[#E8A33D] uppercase font-bold">
                Status: Internal (INT)
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#FDFCFA] border border-[#D8D2C5] p-6 shadow-xs relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-[#E2DDD3] border border-[#C8C2B5] text-[#141312]">
                  <ArrowUpFromLine className="w-6 h-6 text-[#5FA85D]" />
                </div>
                <span className="text-2xl font-mono font-bold text-[#CEC7B8]">03</span>
              </div>
              <h3 className="text-base font-bold text-[#141312]">Deliver & Adjust</h3>
              <p className="text-xs text-[#5C5549] mt-2 font-sans leading-relaxed">
                Pick, pack, and ship customer delivery orders. Reconcile discrepancy counts with audit adjustments and trigger automated Smart Alerts when stock breaches reorder thresholds.
              </p>
              <div className="mt-4 pt-3 border-t border-[#EFECE6] text-[10px] font-mono text-[#5FA85D] uppercase font-bold">
                Status: Delivery (OUT)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INSTANT DEMO ACCESS CALLOUT */}
      <section id="demo-access" className="py-16 sm:py-24 border-b border-[#D8D2C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-[#FDFCFA] border-2 border-[#D8D2C5] p-6 sm:p-10 shadow-sm">
            {/* Header Callout */}
            <div className="text-center max-w-xl mx-auto mb-8">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(242,194,48,0.2)] border border-[rgba(242,194,48,0.5)] text-[#B47805] text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>INSTANT DEMO ACCESS (SEEDED)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141312]">
                Explore Both Roles in Seconds
              </h2>
              <p className="text-xs sm:text-sm text-[#5C5549] font-sans mt-2">
                Evaluate StockSense immediately without filling forms. Experience the tailored workflows designed for managers and floor operators.
              </p>
            </div>

            {/* Role Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Manager Card */}
              <div className="p-5 border border-[#CEC7B8] bg-[#F4F1EA] flex flex-col justify-between hover:border-[#F2C230] transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-2 py-0.5 bg-[rgba(242,194,48,0.2)] text-[#B47805] border border-[rgba(242,194,48,0.5)]">
                      <ShieldCheck className="w-3 h-3" />
                      INVENTORY MANAGER
                    </span>
                    <span className="text-[10px] font-mono text-[#8B8478]">Full Admin Rights</span>
                  </div>

                  <h3 className="text-base font-bold text-[#141312] mt-3">Sarah Connor</h3>
                  <div className="text-xs font-mono text-[#5C5549]">demo@stocksense.io</div>

                  <ul className="mt-4 space-y-2 text-xs text-[#5C5549] font-sans">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#5FA85D] shrink-0" />
                      <span>Global FIFO inventory valuation ($385K+)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#5FA85D] shrink-0" />
                      <span>Create and edit master catalog items</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#5FA85D] shrink-0" />
                      <span>Full system settings and warehouse zone authoring</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#5FA85D] shrink-0" />
                      <span>Export CSVs and download official PDF audits</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-5 mt-4 border-t border-[#D8D2C5]">
                  <button
                    onClick={() => onDemoLogin('demo@stocksense.io')}
                    className="w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Launch Manager Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Floor Operator Card */}
              <div className="p-5 border border-[#CEC7B8] bg-[#F4F1EA] flex flex-col justify-between hover:border-[#4A90D9] transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-2 py-0.5 bg-[rgba(74,144,217,0.15)] text-[#4A90D9] border border-[rgba(74,144,217,0.4)]">
                      <HardHat className="w-3 h-3" />
                      FLOOR OPERATOR [WH]
                    </span>
                    <span className="text-[10px] font-mono text-[#8B8478]">Station Restricted</span>
                  </div>

                  <h3 className="text-base font-bold text-[#141312] mt-3">John Reese</h3>
                  <div className="text-xs font-mono text-[#5C5549]">staff@stocksense.io</div>

                  <ul className="mt-4 space-y-2 text-xs text-[#5C5549] font-sans">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#5FA85D] shrink-0" />
                      <span>Focused terminal queue for assigned station</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#5FA85D] shrink-0" />
                      <span>Optical barcode scanner for SKU lookup</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#5FA85D] shrink-0" />
                      <span>Log physical count adjustments and transfers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#5FA85D] shrink-0" />
                      <span>Strict masking of all financial valuations</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-5 mt-4 border-t border-[#D8D2C5]">
                  <button
                    onClick={() => onDemoLogin('staff@stocksense.io')}
                    className="w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider text-[#1F1C18] hover:text-[#4A90D9] border border-[#CEC7B8] bg-[#FDFCFA] hover:border-[#4A90D9] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Launch Operator Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-[#D8D2C5] bg-[#EAE6DF] py-6 text-xs font-mono text-[#5C5549] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StockSenseLogo variant="compact" size="sm" />
            <span className="text-[10px] px-1.5 py-0.2 bg-[#E2DDD3] text-[#38342D] border border-[#C8C2B5] uppercase font-bold">
              INDUSTRIAL WAREHOUSE LOGISTICS
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#B47805] font-semibold">
              All stock moves atomic & ledger-backed
            </span>
            <span className="hidden sm:inline text-[#CEC7B8]">|</span>
            <span className="text-[10px] text-[#8B8478]">v2.4.0-prod</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
