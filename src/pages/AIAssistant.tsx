import type { ReactElement } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

export function AIAssistant(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
        <MessageSquare size={32} className="text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">AI Assistant</h2>
      <p className="text-lg text-slate-300 mb-1">Every decision has a reason.</p>
      <p className="text-sm text-slate-500 mb-8">Soon you can just ask.</p>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-2 text-amber-500 mb-3">
          <Sparkles size={16} />
          <span className="text-sm font-semibold uppercase tracking-wider">Coming Soon</span>
        </div>
        <ul className="text-sm text-slate-500 space-y-2 text-left">
          <li>&ldquo;What needs my attention right now?&rdquo;</li>
          <li>&ldquo;Why is African Potato Balm flagged?&rdquo;</li>
          <li>&ldquo;Compare Benju&rsquo;s last two proposals&rdquo;</li>
          <li>&ldquo;What am I not seeing?&rdquo;</li>
        </ul>
      </div>
    </div>
  );
}
