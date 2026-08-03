import React from 'react';
import { Province } from '../types';
import { MapPin, Building2, TrendingUp } from 'lucide-react';

interface SouthAfricaMapProps {
  selectedProvince?: Province | 'all';
  onSelectProvince: (prov: Province | 'all') => void;
  estateCounts: Record<string, number>;
}

const PROVINCE_DATA: { id: Province; name: string; tag: string; mainCity: string; x: string; y: string }[] = [
  { id: 'Gauteng', name: 'Gauteng', tag: 'GP', mainCity: 'Johannesburg / Pretoria', x: '62%', y: '35%' },
  { id: 'Western Cape', name: 'Western Cape', tag: 'WC', mainCity: 'Cape Town', x: '25%', y: '80%' },
  { id: 'KwaZulu-Natal', name: 'KwaZulu-Natal', tag: 'KZN', mainCity: 'Durban', x: '78%', y: '58%' },
  { id: 'Eastern Cape', name: 'Eastern Cape', tag: 'EC', mainCity: 'Gqeberha / Makhanda', x: '52%', y: '78%' },
  { id: 'Free State', name: 'Free State', tag: 'FS', mainCity: 'Bloemfontein', x: '50%', y: '50%' },
  { id: 'Mpumalanga', name: 'Mpumalanga', tag: 'MP', mainCity: 'Mbombela', x: '75%', y: '32%' },
  { id: 'Limpopo', name: 'Limpopo', tag: 'LP', mainCity: 'Polokwane', x: '68%', y: '18%' },
  { id: 'North West', name: 'North West', tag: 'NW', mainCity: 'Mahikeng', x: '45%', y: '32%' },
  { id: 'Northern Cape', name: 'Northern Cape', tag: 'NC', mainCity: 'Kimberley', x: '35%', y: '52%' },
];

export const SouthAfricaMap: React.FC<SouthAfricaMapProps> = ({
  selectedProvince = 'all',
  onSelectProvince,
  estateCounts
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            Provincial Estate Distribution (South Africa)
          </h3>
          <p className="text-xs text-slate-400">
            Click a province to filter live gazette notice matches
          </p>
        </div>
        
        {selectedProvince !== 'all' && (
          <button
            onClick={() => onSelectProvince('all')}
            className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Reset Filter (Show All SA)
          </button>
        )}
      </div>

      {/* Map Cards / Grid Representation for high contrast and responsive perfection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
        {PROVINCE_DATA.map((prov) => {
          const count = estateCounts[prov.id] || 0;
          const isSelected = selectedProvince === prov.id;
          return (
            <button
              key={prov.id}
              onClick={() => onSelectProvince(isSelected ? 'all' : prov.id)}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-500 text-white ring-2 ring-amber-500/40 shadow-lg'
                  : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{prov.tag}</span>
                  {count > 0 && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
                <div className="font-semibold text-xs mt-1 truncate">{prov.name}</div>
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-2">
                {prov.mainCity}
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
};
