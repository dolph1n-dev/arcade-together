export default function Footer() {
  return (
    <footer className="w-full bg-[#0d0e17] border-t border-[#3a4a46]/30 py-4 px-6 relative z-20 mt-auto">
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="font-['Space_Grotesk'] text-sm font-bold text-[#00f5d4]">
            Arcade Together
          </span>
          <span className="text-[#83948f] text-xs">•</span>
          <p className="text-xs text-[#83948f] font-['Hanken_Grotesk']">
            © 2025 Arcade Together. Real-Time Two-Player Mini Arcade Network.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-[#83948f]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-pulse" />
            ONLINE DUAL ARENA
          </span>
        </div>
      </div>
    </footer>
  )
}
