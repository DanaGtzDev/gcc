import { useEffect, useState } from 'react';
import './App.css'
import { Settings, Activity, AlertTriangle, Layout, Loader2, HardDrive } from 'lucide-react';

const UnitCard = ({ id, days }) => {
  const isCritical = days < 3;
  const isWarning = days >= 3 && days < 8;
  
  const statusColor = isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600";
  const bgColor = isCritical ? "bg-red-50" : isWarning ? "bg-amber-50" : "bg-emerald-50";
  const borderColor = isCritical ? "border-red-100" : "border-slate-100";

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border ${borderColor} hover:shadow-md transition-all`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgColor} ${statusColor}`}>
            <HardDrive size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Unit</p>
            <h3 className="text-lg font-bold text-slate-800 leading-none">{id}</h3>
          </div>
        </div>
        <div className={`h-2 w-2 rounded-full animate-pulse ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`} />
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-black tracking-tight ${statusColor}`}>
            {days.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-500">days</span>
        </div>
        <p className="text-xs font-medium text-slate-400">Estimated until next maintenance</p>
      </div>
    </div>
  );
};

const App = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const units_response = await fetch("http://localhost:8000/units");
        const unit_ids = await units_response.json();

        const results = await Promise.all(unit_ids.map(async (u) => {
          try {
            const pred_res = await fetch(`http://localhost:8000/predict/${u.unit_id}`);
            const pred_data = await pred_res.json();
            return { id: u.unit_id, days: pred_data.predicted_days_to_next_order };
          } catch (e) { return null; }
        }));

        // Sort by urgency (lowest days first)
        const sortedUnits = results
          .filter(u => u !== null)

        setUnits(sortedUnits);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-lg text-white">
            <Activity size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">GCC Diagnostics</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase">System Status</p>
            <p className="text-xs font-bold text-emerald-600">Operational</p>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-slate-400" size={18} />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Live Fleet Prediction
            </h2>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-tighter">
              <Loader2 className="animate-spin" size={16} />
              Syncing Data...
            </div>
          )}
        </div>

        {!loading && units.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
            <p className="text-slate-400 font-medium">No active units found on this platform.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {units.map(unit => (
              <UnitCard key={unit.id} {...unit} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;