import { useEffect, useState, useMemo } from 'react';
import './App.css'
import { Settings, Activity, AlertTriangle, Loader2, HardDrive, MapPin, Package, Globe, Factory, Filter, X, ChevronDown } from 'lucide-react';

const MetaTag = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2 min-w-0">
    <div className="shrink-0 text-slate-400">
      <Icon size={12} />
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-slate-700 truncate leading-none">{value ?? '—'}</p>
    </div>
  </div>
);

const UnitCard = ({ id, days, main_plant, modelo, origen, planta }) => {
  const isCritical = days < 3;
  const isWarning = days >= 3 && days < 8;

  const statusColor = isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600";
  const bgColor = isCritical ? "bg-red-50" : isWarning ? "bg-amber-50" : "bg-emerald-50";
  const borderColor = isCritical ? "border-red-200" : isWarning ? "border-amber-100" : "border-slate-100";
  const pulseColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500';
  const badgeBg = isCritical ? "bg-red-100 text-red-700" : isWarning ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  const badgeLabel = isCritical ? "Critical" : isWarning ? "Warning" : "Nominal";

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${borderColor} hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col`}>
      <div className={`h-1 w-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'}`} />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${bgColor} ${statusColor}`}>
              <HardDrive size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">System Unit</p>
              <h3 className="text-base font-black text-slate-800 leading-tight">{id}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeBg}`}>
              {badgeLabel}
            </span>
            <div className={`h-2 w-2 rounded-full animate-pulse ${pulseColor}`} />
          </div>
        </div>

        <div className={`rounded-xl px-4 py-3 ${bgColor} flex items-baseline gap-1.5`}>
          <span className={`text-4xl font-black tracking-tight tabular-nums ${statusColor}`}>
            {days.toFixed(1)}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-600">days</p>
            <p className="text-[9px] font-medium text-slate-400 leading-none">until next maintenance</p>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <MetaTag icon={Factory} label="Main Plant" value={main_plant} />
          <MetaTag icon={Package} label="Model" value={modelo} />
          <MetaTag icon={Globe} label="Origin" value={origen} />
          <MetaTag icon={MapPin} label="Plant" value={planta} />
        </div>
      </div>
    </div>
  );
};

const FilterDropdown = ({ label, icon: Icon, options, value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
          value
            ? 'bg-slate-900 border-slate-900 text-white'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
        }`}
      >
        <Icon size={13} />
        <span>{value || label}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-50 uppercase tracking-wider border-b border-slate-100"
            >
              All {label}s
            </button>
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 ${
                  value === opt ? 'text-slate-900 font-bold bg-slate-50' : 'text-slate-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const App = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterPlant, setFilterPlant] = useState(null);
  const [filterModel, setFilterModel] = useState(null);
  const [filterOrigin, setFilterOrigin] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const units_response = await fetch("http://localhost:8000/units");
        const unit_ids = await units_response.json();

        const results = await Promise.all(unit_ids.map(async (u) => {
          try {
            const full_unit_info = await fetch(`http://localhost:8000/units/${u.unit_id}`);
            const full_unit_info_json = await full_unit_info.json();
            const pred_res = await fetch(`http://localhost:8000/predict/${u.unit_id}`);
            const pred_data = await pred_res.json();
            return {
              id: u.unit_id,
              main_plant: full_unit_info_json.main_plant,
              modelo: full_unit_info_json.modelo,
              origen: full_unit_info_json.origen,
              planta: full_unit_info_json.plant,
              days: pred_data.predicted_days_to_next_order
            };
          } catch (e) { return null; }
        }));

        setUnits(results.filter(u => u !== null));
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const plantOptions = useMemo(() => [...new Set(units.map(u => u.planta).filter(Boolean))].sort(), [units]);
  const modelOptions = useMemo(() => [...new Set(units.map(u => u.modelo).filter(Boolean))].sort(), [units]);
  const originOptions = useMemo(() => [...new Set(units.map(u => u.origen).filter(Boolean))].sort(), [units]);

  const filteredUnits = useMemo(() => units.filter(u => {
    if (filterPlant && u.planta !== filterPlant) return false;
    if (filterModel && u.modelo !== filterModel) return false;
    if (filterOrigin && u.origen !== filterOrigin) return false;
    return true;
  }), [units, filterPlant, filterModel, filterOrigin]);

  const activeFilterCount = [filterPlant, filterModel, filterOrigin].filter(Boolean).length;
  const clearAll = () => { setFilterPlant(null); setFilterModel(null); setFilterOrigin(null); };

  const criticalCount = units.filter(u => u.days < 3).length;
  const warningCount = units.filter(u => u.days >= 3 && u.days < 8).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-lg text-white">
            <Activity size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">GCC Diagnostics</h1>
        </div>
        <div className="flex items-center gap-6">
          {!loading && units.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {criticalCount > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 uppercase tracking-wider">
                  {criticalCount} Critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider">
                  {warningCount} Warning
                </span>
              )}
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                {units.length} Total
              </span>
            </div>
          )}
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
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-slate-400" size={18} />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Live Fleet Prediction
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Filter by</span>
            </div>

            <FilterDropdown
              label="Plant"
              icon={MapPin}
              options={plantOptions}
              value={filterPlant}
              onChange={setFilterPlant}
            />
            <FilterDropdown
              label="Model"
              icon={Package}
              options={modelOptions}
              value={filterModel}
              onChange={setFilterModel}
            />
            <FilterDropdown
              label="Origin"
              icon={Globe}
              options={originOptions}
              value={filterOrigin}
              onChange={setFilterOrigin}
            />

            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-all"
              >
                <X size={12} />
                Clear ({activeFilterCount})
              </button>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-tighter ml-2">
                <Loader2 className="animate-spin" size={16} />
                Syncing...
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6 h-5">
          {activeFilterCount > 0 && !loading && (
            <p className="text-xs font-semibold text-slate-400">
              Showing <span className="text-slate-700 font-bold">{filteredUnits.length}</span> of {units.length} units
            </p>
          )}
        </div>

        {!loading && filteredUnits.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
            <p className="text-slate-400 font-medium">
              {units.length === 0 ? 'No active units found on this platform.' : 'No units match the current filters.'}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUnits.map(unit => (
              <UnitCard key={unit.id} {...unit} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;