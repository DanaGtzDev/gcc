import { useEffect, useState, useMemo } from 'react';
import './App.css'
import { Settings, Activity, AlertTriangle, Loader2, HardDrive, MapPin, Package, Globe, Factory, Filter, X, ChevronDown, ChevronLeft } from 'lucide-react';

const MetaTag = ({ icon: Icon, label, value }) => ( // eslint-disable-line no-unused-vars
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

const UnitCard = ({ id, days, main_plant, modelo, origen, planta, onClick }) => {
  const isCritical = days < 3;
  const isWarning = days >= 3 && days < 8;

  const statusColor = isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600";
  const bgColor = isCritical ? "bg-red-50" : isWarning ? "bg-amber-50" : "bg-emerald-50";
  const borderColor = isCritical ? "border-red-200" : isWarning ? "border-amber-100" : "border-slate-100";
  const pulseColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500';
  const badgeBg = isCritical ? "bg-red-100 text-red-700" : isWarning ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  const badgeLabel = isCritical ? "Critical" : isWarning ? "Warning" : "Nominal";

  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border ${borderColor} hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col cursor-pointer`}
      onClick={onClick}
    >
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

const FilterDropdown = ({ label, icon: Icon, options, value, onChange }) => { // eslint-disable-line no-unused-vars
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

const UnitDetailView = ({ unitId, onBack }) => {
  const [history, setHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [mtbfData, setMtbfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch history
        const historyRes = await fetch(`http://localhost:8000/history/${unitId}`);
        if (!historyRes.ok) throw new Error(`History failed: ${historyRes.status}`);
        const historyData = await historyRes.json();
        
        // Fetch prediction
        const predRes = await fetch(`http://localhost:8000/predict/${unitId}`);
        if (!predRes.ok) throw new Error(`Prediction failed: ${predRes.status}`);
        const predData = await predRes.json();
        
        // Fetch MTBF data (optional, don't fail if endpoint not available)
        let mtbfData = null;
        try {
          const mtbfRes = await fetch(`http://localhost:8000/mtbf/${unitId}`);
          if (mtbfRes.ok) {
            mtbfData = await mtbfRes.json();
          }
        } catch (mtbfErr) {
          console.warn('MTBF endpoint not available:', mtbfErr);
        }
        
        setHistory(historyData);
        setPrediction(predData);
        setMtbfData(mtbfData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [unitId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-slate-400" size={32} />
          <p className="text-slate-500 font-medium">Loading unit data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-400" size={32} />
          <p className="text-red-600 font-medium">Error loading unit data</p>
          <p className="text-slate-500 text-sm mt-2">{error}</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // Process history for chart
  const orders = history.map((order, index) => ({
    ...order,
    index, // order sequence number
    date: new Date(order.created_on),
  }));
  
  const lastOrder = orders[orders.length - 1];
  const predictedDate = new Date(lastOrder.date);
  predictedDate.setDate(predictedDate.getDate() + prediction.predicted_days_to_next_order);
  
  // Prepare data for timeline chart
  const allDates = [...orders.map(o => o.date), predictedDate];
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const dateRange = Math.max(1, maxDate.getTime() - minDate.getTime());
  
  // Calculate dynamic width based on data
  const daysRange = dateRange / (1000 * 60 * 60 * 24); // Convert ms to days
  const minWidth = 800;
  const maxWidth = 4000;
  const widthBasedOnOrders = Math.max(minWidth, orders.length * 40);
  const widthBasedOnTime = Math.max(minWidth, daysRange * 3); // 3px per day
  const width = Math.min(maxWidth, Math.max(widthBasedOnOrders, widthBasedOnTime));
  
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  
  const xScale = (date) => padding.left + ((date.getTime() - minDate.getTime()) / dateRange) * (width - padding.left - padding.right);
  const yPos = height / 2;
  
  // Determine which orders should show labels to avoid overcrowding
  const shouldShowOrderLabel = (index) => {
    const total = orders.length;
    if (total <= 20) return true; // Show all for few orders
    if (index === 0 || index === total - 1) return true; // First and last
    if (index % Math.ceil(total / 20) === 0) return true; // ~20 labels total
    return false;
  };
  
  // Dynamic point radius based on order count (smaller for many orders)
  const pointRadius = Math.max(2, 6 - Math.floor(orders.length / 50));
  
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="bg-slate-900 p-2 rounded-lg text-white">
            <HardDrive size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Unit {unitId}</h1>
            <p className="text-sm text-slate-500">Order History & Prediction</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Predicted Next Order</p>
          <p className="text-lg font-bold text-emerald-600">
            {prediction.predicted_days_to_next_order.toFixed(1)} days
          </p>
          <p className="text-xs text-slate-500">
            ({predictedDate.toLocaleDateString()})
          </p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Order Timeline</h2>
          <div className="overflow-x-auto">
            <svg width={width} height={height} className="mx-auto">
              {/* Timeline line */}
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke="#94a3b8"
                strokeWidth="2"
              />
              
              {/* Order points */}
              {orders.map((order, idx) => {
                const x = xScale(order.date);
                return (
                  <g key={idx}>
                    <title>
                      Order {order.order} - {order.date.toLocaleDateString()}
                      {order.description && `: ${order.description}`}
                    </title>
                    <circle
                      cx={x}
                      cy={yPos}
                      r={pointRadius}
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth="2"
                    />
                    {shouldShowOrderLabel(idx) && (
                      <text
                        x={x}
                        y={yPos - 15}
                        textAnchor="middle"
                        className="text-xs font-semibold fill-slate-700"
                      >
                        {order.order}
                      </text>
                    )}
                    {shouldShowOrderLabel(idx) && (
                      <text
                        x={x}
                        y={yPos + 30}
                        textAnchor="middle"
                        className="text-xs fill-slate-500"
                      >
                        {order.date.toLocaleDateString()}
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* Predicted point */}
              {prediction && (
                <g>
                  <title>
                    Predicted Next Order: {predictedDate.toLocaleDateString()} 
                    ({prediction.predicted_days_to_next_order.toFixed(1)} days from last order)
                  </title>
                  <circle
                    cx={xScale(predictedDate)}
                    cy={yPos}
                    r="8"
                    fill="#10b981"
                    stroke="white"
                    strokeWidth="3"
                  />
                  <text
                    x={xScale(predictedDate)}
                    y={yPos - 20}
                    textAnchor="middle"
                    className="text-sm font-bold fill-emerald-700"
                  >
                    Predicted
                  </text>
                  <text
                    x={xScale(predictedDate)}
                    y={yPos + 40}
                    textAnchor="middle"
                    className="text-xs fill-slate-500"
                  >
                    {predictedDate.toLocaleDateString()}
                  </text>
                </g>
               )}
               
               {/* Timeline ticks */}
               {[...Array(6)].map((_, i) => {
                 const date = new Date(minDate.getTime() + (dateRange * i) / 5);
                 const x = padding.left + ((date.getTime() - minDate.getTime()) / dateRange) * (width - padding.left - padding.right);
                 return (
                   <g key={i}>
                     <line
                       x1={x}
                       y1={yPos - 5}
                       x2={x}
                       y2={yPos + 5}
                       stroke="#64748b"
                       strokeWidth="1"
                     />
                     <text
                       x={x}
                       y={yPos + 40}
                       textAnchor="middle"
                       className="text-xs fill-slate-600"
                     >
                       {date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                     </text>
                   </g>
                 );
               })}
               
               {/* Axis labels */}
              <text
                x={width / 2}
                y={height - 10}
                textAnchor="middle"
                className="text-sm font-semibold fill-slate-700"
              >
                Timeline
              </text>
              <text
                x={padding.left - 40}
                y={yPos}
                textAnchor="middle"
                className="text-sm font-semibold fill-slate-700"
                transform={`rotate(-90, ${padding.left - 40}, ${yPos})`}
              >
                Orders
              </text>
            </svg>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Prediction Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Predicted days to next order:</span>
                <span className="text-lg font-bold text-emerald-600">
                  {prediction.predicted_days_to_next_order.toFixed(1)} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">80% confidence interval:</span>
                <span className="text-sm font-semibold text-slate-700">
                  {prediction.interval_80_low.toFixed(0)} – {prediction.interval_80_high.toFixed(0)} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Expected date:</span>
                <span className="text-sm font-semibold text-slate-700">
                  {predictedDate.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Order Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total orders:</span>
                <span className="text-lg font-bold text-slate-800">{orders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">First order:</span>
                <span className="text-sm font-semibold text-slate-700">
                  {orders[0]?.date.toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Last order:</span>
                <span className="text-sm font-semibold text-slate-700">
                  {lastOrder.date.toLocaleDateString()}
                </span>
              </div>
               <div className="flex justify-between items-center">
                <span className="text-slate-600">Days since last order:</span>
                <span className="text-sm font-semibold text-slate-700">
                  {Math.floor((new Date() - lastOrder.date) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* MTBF Chart */}
        {mtbfData && mtbfData.time_series && mtbfData.time_series.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">MTBF (Mean Time Between Failure) Trend</h2>
            <p className="text-sm text-slate-600 mb-6">
              Rolling MTBF (last 10 intervals) shows how the average time between orders changes over time.
              Overall MTBF: <span className="font-bold text-slate-800">{mtbfData.overall_mtbf.toFixed(1)} days</span>
            </p>
            
            <div className="overflow-x-auto">
              {(() => {
                const ts = mtbfData.time_series;
                if (ts.length === 0) return <div className="text-center py-8 text-slate-500">No MTBF data available</div>;
                
                // Parse dates and get mtbf values
                const points = ts.map(p => ({
                  date: new Date(p.order_date),
                  mtbf: p.rolling_mtbf_10,
                  daysSincePrevious: p.days_since_previous,
                  cumulativeMtbf: p.cumulative_mtbf
                }));
                
                const minDate = new Date(Math.min(...points.map(p => p.date.getTime())));
                const maxDate = new Date(Math.max(...points.map(p => p.date.getTime())));
                const minMtbf = Math.min(...points.map(p => p.mtbf));
                const maxMtbf = Math.max(...points.map(p => p.mtbf));
                
                // Add some padding to Y axis
                const yPadding = (maxMtbf - minMtbf) * 0.1;
                const yMin = Math.max(0, minMtbf - yPadding);
                const yMax = maxMtbf + yPadding;
                
                const dateRange = Math.max(1, maxDate.getTime() - minDate.getTime());
                const mtbfRange = Math.max(1, yMax - yMin);
                
                // Chart dimensions
                const chartWidth = Math.max(800, ts.length * 40);
                const chartHeight = 400;
                const padding = { top: 40, right: 40, bottom: 60, left: 80 };
                
                const xScale = (date) => padding.left + ((date.getTime() - minDate.getTime()) / dateRange) * (chartWidth - padding.left - padding.right);
                const yScale = (mtbf) => chartHeight - padding.bottom - ((mtbf - yMin) / mtbfRange) * (chartHeight - padding.top - padding.bottom);
                
                // Generate line path
                let linePath = '';
                points.forEach((p, i) => {
                  const x = xScale(p.date);
                  const y = yScale(p.mtbf);
                  if (i === 0) {
                    linePath += `M ${x} ${y} `;
                  } else {
                    linePath += `L ${x} ${y} `;
                  }
                });
                
                return (
                  <svg 
                    width={chartWidth}
                    height={chartHeight}
                    className="min-w-full"
                  >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(t => {
                      const y = yScale(yMin + t * mtbfRange);
                      return (
                        <g key={t}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={chartWidth - padding.right}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                          />
                          <text
                            x={padding.left - 10}
                            y={y}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="text-xs fill-slate-500"
                          >
                            {(yMin + t * mtbfRange).toFixed(0)}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* X axis grid lines (dates) */}
                    {[...Array(6)].map((_, i) => {
                      const date = new Date(minDate.getTime() + (dateRange * i) / 5);
                      const x = xScale(date);
                      return (
                        <g key={i}>
                          <line
                            x1={x}
                            y1={chartHeight - padding.bottom}
                            x2={x}
                            y2={padding.top}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                          />
                          <text
                            x={x}
                            y={chartHeight - padding.bottom + 20}
                            textAnchor="middle"
                            className="text-xs fill-slate-500"
                          >
                            {date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* MTBF line */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Data points */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={xScale(p.date)}
                          cy={yScale(p.mtbf)}
                          r="4"
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <title>
                          Date: {p.date.toLocaleDateString()}
                          {'\n'}Rolling MTBF: {p.mtbf.toFixed(1)} days
                          {'\n'}Interval: {p.daysSincePrevious.toFixed(1)} days
                          {'\n'}Cumulative MTBF: {p.cumulativeMtbf.toFixed(1)} days
                        </title>
                      </g>
                    ))}
                    
                    {/* Axis labels */}
                    <text
                      x={chartWidth / 2}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      className="text-sm font-semibold fill-slate-700"
                    >
                      Timeline
                    </text>
                    <text
                      x={padding.left - 50}
                      y={chartHeight / 2}
                      textAnchor="middle"
                      className="text-sm font-semibold fill-slate-700"
                      transform={`rotate(-90, ${padding.left - 50}, ${chartHeight / 2})`}
                    >
                      MTBF (days)
                    </text>
                    
                    {/* Legend */}
                    <g transform={`translate(${chartWidth - padding.right - 150}, ${padding.top})`}>
                      <rect width="150" height="60" fill="white" stroke="#e2e8f0" strokeWidth="1" rx="4" />
                      <text x="10" y="20" className="text-xs font-bold fill-slate-700">Rolling MTBF (10 intervals)</text>
                      <line x1="10" y1="30" x2="30" y2="30" stroke="#3b82f6" strokeWidth="3" />
                      <text x="40" y="35" className="text-xs fill-slate-600">MTBF trend</text>
                      <circle cx="20" cy="50" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                      <text x="40" y="55" className="text-xs fill-slate-600">Data points</text>
                    </g>
                  </svg>
                );
              })()}
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-slate-500">Overall MTBF</div>
                <div className="text-xl font-bold text-slate-800">{mtbfData.overall_mtbf.toFixed(1)} days</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-slate-500">Interval Count</div>
                <div className="text-xl font-bold text-slate-800">{mtbfData.interval_count}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-slate-500">Min Interval</div>
                <div className="text-xl font-bold text-slate-800">{mtbfData.min_interval.toFixed(1)} days</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-slate-500">Max Interval</div>
                <div className="text-xl font-bold text-slate-800">{mtbfData.max_interval.toFixed(1)} days</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 text-slate-500 font-bold uppercase tracking-wider">Order #</th>
                  <th className="text-left py-3 text-slate-500 font-bold uppercase tracking-wider">Description</th>
                  <th className="text-left py-3 text-slate-500 font-bold uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 text-slate-500 font-bold uppercase tracking-wider">Plant</th>
                  <th className="text-left py-3 text-slate-500 font-bold uppercase tracking-wider">Model</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(-10).reverse().map((order) => (
                  <tr key={order.order} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 font-mono font-bold text-slate-800">{order.order}</td>
                    <td className="py-3 text-slate-700">{order.description}</td>
                    <td className="py-3 text-slate-600">{new Date(order.created_on).toLocaleDateString()}</td>
                    <td className="py-3 text-slate-600">{order.plant}</td>
                    <td className="py-3 text-slate-600">{order.modelo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [fleetMtbf, setFleetMtbf] = useState(null);
  const [loadingFleetMtbf, setLoadingFleetMtbf] = useState(false);

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
          } catch { return null; }
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

  // Fetch fleet MTBF when filters change
  useEffect(() => {
    const fetchFleetMtbf = async () => {
      try {
        setLoadingFleetMtbf(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (filterPlant) params.append('plant', filterPlant);
        if (filterModel) params.append('model', filterModel);
        if (filterOrigin) params.append('origin', filterOrigin);
        
        const queryString = params.toString();
        const url = `http://localhost:8000/fleet/mtbf${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Fleet MTBF fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        setFleetMtbf(data);
      } catch (error) {
        console.error('Error fetching fleet MTBF:', error);
        setFleetMtbf(null);
      } finally {
        setLoadingFleetMtbf(false);
      }
    };
    
    fetchFleetMtbf();
  }, [filterPlant, filterModel, filterOrigin]);

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

  if (selectedUnitId) {
    return <UnitDetailView unitId={selectedUnitId} onBack={() => setSelectedUnitId(null)} />;
  }

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

        {/* Fleet MTBF Card */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Activity size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Fleet MTBF</h2>
            </div>
            <div className="text-sm text-slate-500">
              {loadingFleetMtbf ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={14} />
                  <span>Updating...</span>
                </div>
              ) : (
                <span>
                  {filterPlant || filterModel || filterOrigin ? 'Filtered fleet' : 'Overall fleet'}
                </span>
              )}
            </div>
          </div>
          
          {loadingFleetMtbf ? (
            <div className="h-24 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : fleetMtbf ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="text-sm text-blue-600 font-bold uppercase tracking-wider mb-1">Fleet MTBF</div>
                <div className="text-3xl font-bold text-slate-800">{fleetMtbf.fleet_mtbf.toFixed(1)}</div>
                <div className="text-sm text-slate-500 mt-1">days</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="text-sm text-slate-600 font-bold uppercase tracking-wider mb-1">Units</div>
                <div className="text-3xl font-bold text-slate-800">{fleetMtbf.fleet_unit_count}</div>
                <div className="text-sm text-slate-500 mt-1">active units</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="text-sm text-slate-600 font-bold uppercase tracking-wider mb-1">Intervals</div>
                <div className="text-3xl font-bold text-slate-800">{fleetMtbf.fleet_interval_count}</div>
                <div className="text-sm text-slate-500 mt-1">total intervals</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="text-sm text-slate-600 font-bold uppercase tracking-wider mb-1">Range</div>
                <div className="text-xl font-bold text-slate-800">
                  {fleetMtbf.fleet_min_interval.toFixed(0)}–{fleetMtbf.fleet_max_interval.toFixed(0)}
                </div>
                <div className="text-sm text-slate-500 mt-1">days min–max</div>
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-slate-400">
              <AlertTriangle size={20} className="mr-2" />
              Fleet MTBF data unavailable
            </div>
          )}
          
          {(filterPlant || filterModel || filterOrigin) && fleetMtbf && (
            <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-500">
              Filters applied: 
              {filterPlant && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-md">Plant: {filterPlant}</span>}
              {filterModel && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-md">Model: {filterModel}</span>}
              {filterOrigin && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-md">Origin: {filterOrigin}</span>}
            </div>
          )}
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
              <UnitCard 
                key={unit.id} 
                {...unit} 
                onClick={() => setSelectedUnitId(unit.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;