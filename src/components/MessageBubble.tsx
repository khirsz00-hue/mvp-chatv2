'use client';
export function Bubble({ role, children }:{ role:'user'|'assistant', children: React.ReactNode }){
  return (
    <div className={`w-full flex ${role==='user' ? 'justify-end' : 'justify-start'}`}>
      <div className={role==='user' ? 'bubble-user' : 'bubble-assistant'}>{children}</div>
    </div>
  );
}
