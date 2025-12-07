
import React, { useMemo, useState, useRef } from 'react';
import { Project } from '../types';
import { 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign,
  Layout,
  PieChart,
  Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ProjectStatsProps {
  projects: Project[];
  aiAnalysis: string | null;
  isAnalyzeLoading: boolean;
  onRunAnalysis: () => void;
  onClearAnalysis: () => void;
}

type ZoomLevel = 'week' | 'month' | 'quarter' | 'year';

const ZOOM_CONFIGS = {
  week: { pxPerDay: 40, label: 'Week View' },
  month: { pxPerDay: 10, label: 'Month View' },
  quarter: { pxPerDay: 3, label: 'Quarter View' },
  year: { pxPerDay: 1, label: 'Year View' },
};

const ProjectStats: React.FC<ProjectStatsProps> = ({ 
  projects, 
  aiAnalysis, 
  isAnalyzeLoading, 
  onRunAnalysis, 
  onClearAnalysis 
}) => {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'budget' | 'timeline'>('timeline');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');

  // Sync scrolling refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // --- SCROLL SYNC LOGIC ---
  const handleScroll = (source: 'top' | 'bottom') => {
    if (isScrolling.current) return;
    
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) return;

    isScrolling.current = true;
    if (source === 'top') {
      bottom.scrollLeft = top.scrollLeft;
    } else {
      top.scrollLeft = bottom.scrollLeft;
    }

    // Debounce reset
    setTimeout(() => {
      isScrolling.current = false;
    }, 50);
  };

  // --- METRICS CALCULATION ---
  const totalBudget = useMemo(() => projects.reduce((acc, curr) => acc + curr.budget, 0), [projects]);
  const activeCount = useMemo(() => projects.filter(p => p.status === 'In Progress').length, [projects]);
  const criticalCount = useMemo(() => projects.filter(p => p.priority === 'Critical' && p.status !== 'Completed').length, [projects]);
  const completedCount = useMemo(() => projects.filter(p => p.status === 'Completed').length, [projects]);
  const completionRate = projects.length > 0 ? Math.round((completedCount / projects.length) * 100) : 0;

  // --- RISK RADAR ---
  const riskItems = useMemo(() => {
    return projects.filter(p => {
       const isBlocked = p.status === 'Blocked';
       const due = new Date(p.dueDate);
       const today = new Date();
       const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
       const isUrgent = diffDays < 15 && p.status !== 'Completed'; // Slightly wider window for risk
       return isBlocked || (p.priority === 'Critical' && isUrgent);
    }).slice(0, 4); 
  }, [projects]);

  // --- TREEMAP DATA ---
  const sortedByBudget = useMemo(() => {
    return [...projects]
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 8); 
  }, [projects]);

  // --- GANTT CHART DATA & LOGIC ---
  const ganttData = useMemo(() => {
    if (projects.length === 0) return { projects: [], primaryHeaders: [], secondaryHeaders: [], totalWidth: 0, todayOffset: 0 };

    const pxPerDay = ZOOM_CONFIGS[zoomLevel].pxPerDay;

    // 1. Determine Chart Range
    const timestamps = projects.flatMap(p => [
      new Date(p.startDate || p.dueDate).getTime(),
      new Date(p.dueDate).getTime()
    ]);
    
    // Default to Dec 2025 range if no data timestamps found
    const now = new Date();
    const minTime = timestamps.length ? Math.min(...timestamps) : now.getTime();
    const maxTime = timestamps.length ? Math.max(...timestamps) : now.getTime();
    
    const startDate = new Date(minTime);
    // Add significant buffer for visual comfort
    startDate.setDate(startDate.getDate() - (zoomLevel === 'year' ? 90 : 15)); 
    
    const endDate = new Date(maxTime);
    endDate.setDate(endDate.getDate() + (zoomLevel === 'year' ? 180 : 30));

    // Normalize start date to beginning of boundary
    if (zoomLevel === 'year') {
        startDate.setMonth(0, 1);
        endDate.setMonth(11, 31);
    } else if (zoomLevel === 'month' || zoomLevel === 'quarter') {
        startDate.setDate(1);
    } else {
        // Week view: Start on Sunday
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
    }

    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalWidth = totalDays * pxPerDay;

    // 2. Generate Headers
    const primaryHeaders: { label: string, width: number, left: number }[] = [];
    const secondaryHeaders: { label: string, width: number, left: number }[] = [];
    
    const MAX_LOOPS = 2000; // Safety brake

    // --- SECONDARY HEADERS LOOP (Bottom Row) ---
    let current = new Date(startDate);
    let loopCount = 0;
    
    while (current < endDate) {
        loopCount++;
        if (loopCount > MAX_LOOPS) break;

        const startLoopTime = current.getTime();
        const year = current.getFullYear();
        const month = current.getMonth();
        const date = current.getDate();
        
        let secNext: Date;
        let secLabel = '';
        
        if (zoomLevel === 'week') {
            // Day cells
            secNext = new Date(year, month, date + 1);
            secLabel = `${date}`;
        } else if (zoomLevel === 'month') {
            // Month cells
            secNext = new Date(year, month + 1, 1);
            secLabel = current.toLocaleDateString(undefined, { month: 'short' });
        } else if (zoomLevel === 'quarter') {
            // Quarter cells
            const currentQuarter = Math.floor(month / 3);
            secNext = new Date(year, (currentQuarter + 1) * 3, 1);
            secLabel = `Q${currentQuarter + 1}`;
        } else {
            // Year cells
            secNext = new Date(year + 1, 0, 1);
            secLabel = `${year}`;
        }

        // Force time progression to avoid infinite loop
        if (secNext.getTime() <= startLoopTime) {
             secNext = new Date(startLoopTime + (24 * 60 * 60 * 1000));
        }

        const effectiveEnd = secNext > endDate ? endDate : secNext;
        const diffDays = (effectiveEnd.getTime() - startLoopTime) / (1000 * 60 * 60 * 24);
        
        if (diffDays > 0) {
            secondaryHeaders.push({
                label: secLabel,
                width: diffDays * pxPerDay,
                left: ((startLoopTime - startDate.getTime()) / (1000 * 60 * 60 * 24)) * pxPerDay
            });
        }
        
        current = effectiveEnd;
    }

    // --- PRIMARY HEADERS LOOP (Top Row) ---
    current = new Date(startDate);
    loopCount = 0;
    
    while (current < endDate) {
        loopCount++;
        if (loopCount > MAX_LOOPS) break;

        const startLoopTime = current.getTime();
        const year = current.getFullYear();
        const month = current.getMonth();

        let priNext: Date;
        let priLabel = '';

        if (zoomLevel === 'week') {
            // Month labels
            priNext = new Date(year, month + 1, 1);
            priLabel = current.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        } else if (zoomLevel === 'month' || zoomLevel === 'quarter') {
             // Year labels
             priNext = new Date(year + 1, 0, 1);
             priLabel = `${year}`;
        } else {
             // Decade labels
             const decade = Math.floor(year/10)*10;
             priNext = new Date(decade + 10, 0, 1);
             priLabel = `${decade}s`;
        }

        if (priNext.getTime() <= startLoopTime) {
             priNext = new Date(startLoopTime + (24 * 60 * 60 * 1000));
        }

        const effectiveEnd = priNext > endDate ? endDate : priNext;
        const diffDays = (effectiveEnd.getTime() - startLoopTime) / (1000 * 60 * 60 * 24);
        
        if (diffDays > 0) {
            primaryHeaders.push({
                label: priLabel,
                width: diffDays * pxPerDay,
                left: ((startLoopTime - startDate.getTime()) / (1000 * 60 * 60 * 24)) * pxPerDay
            });
        }
        current = effectiveEnd;
    }

    // 3. Calculate Today Line
    const today = new Date();
    // Assuming today is somewhere relevant, or we use a simulated today if defined
    // For this context we use real system time.
    const todayOffset = ((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * pxPerDay;

    // 4. Process Projects
    const processedProjects = projects.map(p => {
      // Handle potential bad dates
      const startT = p.startDate ? new Date(p.startDate).getTime() : new Date(p.dueDate).getTime();
      const endT = new Date(p.dueDate).getTime();
      
      const safeStart = isNaN(startT) ? startDate.getTime() : startT;
      const safeEnd = isNaN(endT) ? safeStart : endT;
      
      const left = ((safeStart - startDate.getTime()) / (1000 * 60 * 60 * 24)) * pxPerDay;
      const durationMs = safeEnd - safeStart;
      const width = (durationMs / (1000 * 60 * 60 * 24)) * pxPerDay;
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      
      return {
        ...p,
        chartLeft: Math.max(0, left),
        chartWidth: Math.max(zoomLevel === 'year' ? 2 : 10, width),
        duration: Math.max(1, durationDays)
      };
    }).sort((a,b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : new Date(a.dueDate).getTime();
        const dateB = b.startDate ? new Date(b.startDate).getTime() : new Date(b.dueDate).getTime();
        return dateA - dateB;
    });

    return { projects: processedProjects, primaryHeaders, secondaryHeaders, totalWidth, todayOffset };
  }, [projects, zoomLevel]);


  return (
    <div className="animate-in fade-in duration-500 pb-12 max-w-7xl mx-auto">
      
      {/* --- HEADER --- */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
           Strategic snapshot of your agency's performance.
        </p>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <MetricCard 
            label="Total Budget" 
            value={`$${(totalBudget / 1000).toFixed(1)}k`} 
            icon={DollarSign} 
            color="indigo"
         />
         <MetricCard 
            label="Active Projects" 
            value={activeCount} 
            icon={TrendingUp} 
            color="blue"
         />
         <MetricCard 
            label="Critical Risks" 
            value={criticalCount} 
            icon={AlertTriangle} 
            color={criticalCount > 0 ? "red" : "slate"}
            highlight={criticalCount > 0}
         />
         <MetricCard 
            label="Completion" 
            value={`${completionRate}%`} 
            icon={CheckCircle2} 
            color="emerald"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* --- LEFT: INTELLIGENCE --- */}
         <div className="lg:col-span-1 space-y-6">
            
            {/* Risk List */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                     <Zap className="w-4 h-4 text-orange-500" /> Radar
                  </h3>
               </div>
               <div className="space-y-3">
                  {riskItems.length > 0 ? (
                     riskItems.map(item => (
                        <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 cursor-pointer group">
                           <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${item.status === 'Blocked' ? 'bg-red-500' : 'bg-orange-500'}`} />
                           <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                                 {item.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] uppercase font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                    {item.status}
                                 </span>
                                 <span className="text-[10px] text-red-500 font-medium">
                                    Due {new Date(item.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                 </span>
                              </div>
                           </div>
                        </div>
                     ))
                  ) : (
                     <div className="text-center py-8 text-slate-400 text-xs">
                        No critical items detected. All clear.
                     </div>
                  )}
               </div>
            </div>

            {/* AI Insight */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col h-auto min-h-[300px]">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                     <div className="p-1.5 bg-indigo-50 rounded-lg">
                        <BrainCircuit className="w-4 h-4 text-indigo-600" />
                     </div>
                     <span className="text-sm font-bold text-slate-800">Smart Brief</span>
                  </div>
                  {aiAnalysis && (
                     <button onClick={onClearAnalysis} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                  )}
               </div>

               <div className="flex-1 bg-slate-50/50 rounded-xl p-4 border border-slate-100/50 overflow-y-auto max-h-[400px]">
                  {isAnalyzeLoading ? (
                     <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs">Analyzing data...</span>
                     </div>
                  ) : aiAnalysis ? (
                     <div className="prose prose-sm prose-slate max-w-none text-xs leading-relaxed">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                     </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                        <p className="text-xs text-slate-500 max-w-[200px]">
                           Generate an executive summary of risks and budget allocation.
                        </p>
                        <button 
                           onClick={onRunAnalysis}
                           className="mt-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition"
                        >
                           Generate Report
                        </button>
                     </div>
                  )}
               </div>
            </div>

         </div>

         {/* --- RIGHT: TABS --- */}
         <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden">
               
               {/* Chart Tabs & Controls */}
               <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                  <div className="flex gap-1 p-1 bg-slate-100/80 rounded-lg">
                     <button 
                        onClick={() => setChartView('timeline')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                           chartView === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                     >
                        <Layout className="w-3.5 h-3.5" /> Gantt Chart
                     </button>
                     <button 
                        onClick={() => setChartView('budget')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                           chartView === 'budget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                     >
                        <PieChart className="w-3.5 h-3.5" /> Money Map
                     </button>
                  </div>

                  {/* Zoom Controls (Only for Timeline) */}
                  {chartView === 'timeline' && (
                     <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 mr-2 font-medium hidden sm:inline">Zoom:</span>
                        <div className="flex bg-slate-50 rounded-lg border border-slate-100 p-0.5">
                           {(['week', 'month', 'quarter', 'year'] as ZoomLevel[]).map((level) => (
                              <button
                                 key={level}
                                 onClick={() => setZoomLevel(level)}
                                 className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                                    zoomLevel === level ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                 }`}
                              >
                                 {level.charAt(0)}
                              </button>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               {/* Chart Content Area */}
               <div className="flex-1 min-h-[400px] relative">
                  
                  {/* VIEW 1: GANTT CHART (REAL) */}
                  {chartView === 'timeline' && (
                     <div className="absolute inset-0 flex flex-col">
                        
                        {/* Synced Scrollbar (Top) */}
                        <div 
                           className="h-4 bg-slate-50/50 border-b border-slate-100 flex flex-shrink-0 ml-48 overflow-x-auto custom-scrollbar"
                           ref={topScrollRef}
                           onScroll={() => handleScroll('top')}
                        >
                           <div style={{ width: ganttData.totalWidth, height: '1px' }}></div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-hidden relative flex">
                           
                           {/* Left Column (Sticky Project Names) */}
                           <div className="w-48 flex-shrink-0 bg-white border-r border-slate-100 sticky left-0 z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] pt-12">
                              {ganttData.projects.map((p) => (
                                 <div key={p.id} className="h-10 px-4 flex items-center border-b border-slate-50 group hover:bg-slate-50/50 transition-colors cursor-pointer">
                                    <div className="text-xs font-medium text-slate-700 truncate" title={p.name}>
                                       {p.name}
                                    </div>
                                 </div>
                              ))}
                           </div>

                           {/* Timeline Grid Container */}
                           <div 
                              className="relative flex-1 overflow-x-auto custom-scrollbar bg-slate-50/30"
                              ref={bottomScrollRef}
                              onScroll={() => handleScroll('bottom')}
                           >
                              <div className="relative" style={{ width: ganttData.totalWidth }}>
                                 
                                 {/* Headers Container */}
                                 <div className="h-12 border-b border-slate-200 absolute top-0 left-0 right-0 bg-white z-10 sticky">
                                    {/* Primary Headers (Top) */}
                                    <div className="h-6 flex relative border-b border-slate-100">
                                        {ganttData.primaryHeaders.map((h, idx) => (
                                            <div 
                                                key={`pri-${idx}`}
                                                className="absolute top-0 h-full border-r border-slate-100 px-2 flex items-center text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50 truncate"
                                                style={{ left: h.left, width: h.width }}
                                            >
                                                {h.label}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Secondary Headers (Bottom) */}
                                    <div className="h-6 flex relative">
                                        {ganttData.secondaryHeaders.map((h, idx) => (
                                            <div 
                                                key={`sec-${idx}`}
                                                className="absolute top-0 h-full border-r border-slate-100 px-2 flex items-center text-[9px] font-bold text-slate-600 uppercase truncate"
                                                style={{ left: h.left, width: h.width }}
                                            >
                                                {h.label}
                                            </div>
                                        ))}
                                    </div>
                                 </div>

                                 {/* Today Marker */}
                                 {ganttData.todayOffset > 0 && ganttData.todayOffset < ganttData.totalWidth && (
                                    <div 
                                       className="absolute top-12 bottom-0 w-px bg-red-400 z-10 opacity-70 flex flex-col items-center pointer-events-none"
                                       style={{ left: ganttData.todayOffset }}
                                    >
                                       <div className="w-1.5 h-1.5 bg-red-400 rounded-full -mt-0.5 shadow-sm"></div>
                                       <span className="text-[9px] text-red-500 font-bold mt-1 bg-white/80 px-1 rounded writing-vertical-lr py-1">TODAY</span>
                                    </div>
                                 )}

                                 {/* Vertical Grid Lines */}
                                 <div className="absolute inset-0 pt-12 grid pointer-events-none" style={{
                                     gridTemplateColumns: `repeat(auto-fill, ${zoomLevel === 'week' ? 40 : 140}px)`
                                 }}>
                                    {Array.from({ length: Math.ceil(ganttData.totalWidth / (zoomLevel === 'week' ? 40 : 140)) }).map((_, i) => (
                                       <div key={i} className="border-r border-slate-50 h-full"></div>
                                    ))}
                                 </div>

                                 {/* Bars Container */}
                                 <div className="pt-12">
                                    {ganttData.projects.map((p) => (
                                       <div key={p.id} className="h-10 border-b border-slate-50 relative flex items-center hover:bg-slate-50/30 transition-colors">
                                          <div 
                                             className={`absolute h-5 rounded shadow-sm text-[9px] text-white flex items-center px-2 whitespace-nowrap overflow-hidden transition-all hover:brightness-110 group cursor-pointer ${
                                                p.status === 'Blocked' ? 'bg-rose-500' :
                                                p.status === 'Completed' ? 'bg-emerald-500' :
                                                p.status === 'In Progress' ? 'bg-indigo-500' : 'bg-slate-400'
                                             }`}
                                             style={{ left: p.chartLeft, width: p.chartWidth }}
                                          >
                                             {/* Label inside bar if wide enough */}
                                             {p.chartWidth > 50 && zoomLevel !== 'year' && (
                                                <span className="opacity-90 font-medium truncate">{p.name}</span>
                                             )}

                                             {/* Tooltip */}
                                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                                                {new Date(p.startDate || p.dueDate).toLocaleDateString()} - {new Date(p.dueDate).toLocaleDateString()} ({p.duration}d)
                                             </div>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* VIEW 2: TREEMAP (MONEY) */}
                  {chartView === 'budget' && (
                     <div className="absolute inset-0 p-6 overflow-y-auto">
                        <div className="flex flex-wrap content-start gap-2 h-full">
                           {sortedByBudget.map((p, idx) => {
                              const total = sortedByBudget.reduce((sum, item) => sum + item.budget, 0);
                              const percent = (p.budget / total) * 100;
                              return (
                                 <div 
                                    key={p.id}
                                    className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:z-10 hover:scale-[1.02] border border-white ${
                                       p.status === 'Blocked' ? 'bg-red-50 text-red-800' :
                                       p.status === 'In Progress' ? 'bg-indigo-50 text-indigo-900' :
                                       'bg-slate-50 text-slate-600'
                                    }`}
                                    style={{ 
                                       flexBasis: `${Math.max(percent, 15)}%`, 
                                       flexGrow: 1, 
                                       minHeight: percent > 25 ? '180px' : '100px' 
                                    }}
                                    onMouseEnter={() => setHoveredProject(p.id)}
                                    onMouseLeave={() => setHoveredProject(null)}
                                 >
                                    <div className="absolute inset-0 p-3 flex flex-col justify-between">
                                       <div className="flex justify-between items-start">
                                          <span className="text-[10px] uppercase font-bold opacity-60 truncate max-w-[80px]">{p.status}</span>
                                          <span className="text-xs font-bold">${(p.budget/1000).toFixed(0)}k</span>
                                       </div>
                                       <div className="font-bold text-sm leading-tight line-clamp-2">
                                          {p.name}
                                       </div>
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                     </div>
                  )}

               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---
const MetricCard = ({ label, value, icon: Icon, color, highlight }: any) => (
   <div className={`p-4 rounded-xl border transition-all ${
      highlight 
         ? 'bg-red-50 border-red-100 shadow-sm' 
         : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
   }`}>
      <div className="flex items-start justify-between mb-2">
         <div className={`p-2 rounded-lg ${
            highlight ? 'bg-red-100 text-red-600' : `bg-${color}-50 text-${color}-600`
         }`}>
            <Icon className="w-4 h-4" />
         </div>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-red-700' : 'text-slate-800'}`}>
         {value}
      </div>
      <div className="text-xs text-slate-400 font-medium mt-1">
         {label}
      </div>
   </div>
);

export default ProjectStats;
