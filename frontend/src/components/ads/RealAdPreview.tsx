"use client";
import { useState } from "react";
import { Globe, Camera, Search, MoreHorizontal, MessageCircle, Share2, Heart, ExternalLink, Zap, Users, Plus } from "lucide-react";

interface AdPreviewProps {
  platform: string;
  headline: string;
  body: string;
  hook?: string;
  cta?: string;
  image?: string;
}

export default function AdPreview({ platform, headline, body, hook, cta, image }: AdPreviewProps) {
  const [activePlatform, setActivePlatform] = useState(platform.toLowerCase());

  const platforms = [
    { id: 'meta', label: 'Facebook', icon: Globe },
    { id: 'instagram', label: 'Instagram', icon: Camera },
    { id: 'google', label: 'Google', icon: Search },
    { id: 'linkedin', label: 'LinkedIn', icon: Users },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-[40px] border border-zinc-100 overflow-hidden shadow-2xl">
      {/* Platform Switcher */}
      <div className="flex p-2 bg-zinc-50 border-b border-zinc-100">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePlatform(p.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activePlatform === p.id ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-black'
            }`}
          >
            <p.icon className="w-4 h-4" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-8 bg-zinc-50/30 flex items-center justify-center overflow-y-auto">
        
        {/* FACEBOOK PREVIEW */}
        {activePlatform === 'meta' && (
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
             <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-black">AI</div>
                  <div>
                    <p className="text-xs font-bold">Your Brand</p>
                    <p className="text-[10px] text-zinc-400 font-bold">Sponsored</p>
                  </div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-zinc-400" />
             </div>
             <div className="px-3 pb-3">
               <p className="text-sm text-zinc-900 leading-snug whitespace-pre-line">{body}</p>
             </div>
             <div className="aspect-square bg-zinc-100 flex items-center justify-center text-zinc-300 relative">
               {image ? <img src={image} className="w-full h-full object-cover" /> : <div className="text-center p-8"><Zap className="w-12 h-12 mx-auto mb-4 opacity-10" /><p className="text-xs font-black opacity-20 uppercase tracking-widest">AI Generated Visual</p></div>}
             </div>
             <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
               <div className="flex-1 min-w-0 pr-4">
                 <p className="text-[10px] text-zinc-400 uppercase font-black truncate">{platform.toUpperCase()}</p>
                 <p className="text-sm font-bold text-zinc-900 truncate">{headline}</p>
               </div>
               <button className="px-4 py-2 bg-zinc-200 text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-zinc-300 transition-all">{cta || 'Learn More'}</button>
             </div>
          </div>
        )}

        {/* INSTAGRAM PREVIEW */}
        {activePlatform === 'instagram' && (
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[500px]">
             <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[1.5px]">
                    <div className="w-full h-full rounded-full bg-white p-[1.5px]">
                      <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-black">AI</div>
                    </div>
                  </div>
                  <div className="leading-none">
                    <p className="text-xs font-bold">your_brand</p>
                    <p className="text-[10px] text-zinc-400 font-bold mt-0.5">Sponsored</p>
                  </div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-zinc-400" />
             </div>
             <div className="flex-1 bg-zinc-100 relative">
               {image ? <img src={image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Zap className="w-12 h-12 opacity-10" /></div>}
               <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-between">
                 <button className="text-white text-xs font-black uppercase tracking-widest bg-blue-500 w-full py-2.5 rounded-md hover:bg-blue-600 transition-all">{cta || 'Learn More'}</button>
               </div>
             </div>
             <div className="p-4 space-y-2">
               <div className="flex items-center gap-4 mb-1">
                 <Heart className="w-5 h-5" />
                 <MessageCircle className="w-5 h-5" />
                 <Share2 className="w-5 h-5" />
               </div>
               <p className="text-xs font-bold">1,248 likes</p>
               <p className="text-xs leading-relaxed"><span className="font-bold mr-2">your_brand</span>{body}</p>
             </div>
          </div>
        )}

        {/* GOOGLE PREVIEW */}
        {activePlatform === 'google' && (
          <div className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center text-[8px] font-black">G</div>
              <p className="text-xs text-zinc-400 font-bold">https://yourbrand.com</p>
            </div>
            <h3 className="text-xl font-medium text-blue-700 hover:underline cursor-pointer leading-tight mb-2">{headline}</h3>
            <p className="text-sm text-zinc-600 leading-relaxed line-clamp-3">
              <span className="font-black text-black text-xs mr-2 border border-zinc-200 px-1 rounded">Ad</span>
              {body}
            </p>
            <div className="mt-4 flex gap-4">
              <div className="text-blue-700 text-xs font-bold border-r border-zinc-200 pr-4 cursor-pointer hover:underline">Features</div>
              <div className="text-blue-700 text-xs font-bold border-r border-zinc-200 pr-4 cursor-pointer hover:underline">Pricing</div>
              <div className="text-blue-700 text-xs font-bold cursor-pointer hover:underline">Get Started</div>
            </div>
          </div>
        )}

        {/* LINKEDIN PREVIEW */}
        {activePlatform === 'linkedin' && (
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden">
             <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-sm bg-zinc-100 flex items-center justify-center text-xs font-black">AI</div>
                  <div className="leading-tight">
                    <p className="text-sm font-bold text-zinc-900">Your Brand</p>
                    <p className="text-[10px] text-zinc-400 font-bold">12,480 followers</p>
                    <p className="text-[10px] text-zinc-400 font-bold">Promoted</p>
                  </div>
                </div>
                <Plus className="w-5 h-5 text-blue-600" />
             </div>
             <div className="px-4 pb-4">
               <p className="text-sm text-zinc-900 leading-normal whitespace-pre-line">{body}</p>
             </div>
             <div className="aspect-[1.91/1] bg-zinc-100 relative">
               {image ? <img src={image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Zap className="w-8 h-8 opacity-10" /></div>}
               <div className="absolute bottom-0 left-0 right-0 p-3 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between">
                 <div className="flex-1 pr-4">
                   <p className="text-xs font-bold text-zinc-900 truncate">{headline}</p>
                   <p className="text-[10px] text-zinc-400 truncate">yourbrand.com</p>
                 </div>
                 <button className="px-4 py-1.5 border border-blue-600 text-blue-600 text-xs font-bold rounded-full hover:bg-blue-50 transition-all">{cta || 'Learn More'}</button>
               </div>
             </div>
          </div>
        )}

      </div>

      {/* Suggestion Agent Overlay */}
      <div className="p-6 bg-black text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-6 rounded-lg bg-[#7c3aed] flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white" /></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">Optimizer Agent Suggestion</span>
        </div>
        <p className="text-xs font-bold leading-relaxed text-zinc-400">
          &quot;This headline is strong for {activePlatform}, but adding a numeric value (e.g. 30% Growth) could increase CTR by up to 2.4× based on current channel data.&quot;
        </p>
      </div>
    </div>
  );
}
