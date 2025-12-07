import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Search, 
  Loader2,
  List,
  Kanban,
  Filter,
  Menu,
  Cloud,
  Target,
  Sparkles,
  RefreshCw,
  Bug
} from 'lucide-react';

import { Project, SortField, SortOrder, ViewMode } from './types';
import { parseCSV, generateCSV, downloadCSV } from './utils/csvHelper';
import { analyzeProjects } from './services/geminiService';
import { fetchProjects } from './services/projectService';
import { fetchCurrentRecordSample } from '../ui_larksdk_bridge/fetchCurrentRecordSample';
import { fetchProjectsFromBitable } from './services/bitableProjectService';
import ProjectStats from './components/ProjectStats';
import ProjectList from './components/ProjectList';
import ProjectBoard from './components/ProjectBoard';
import ProjectSlideOver from './components/ProjectSlideOver';
import Sidebar from './components/Sidebar';

// Updated key for Dec 2025 data context
const LOCAL_STORAGE_KEY = 'novaboard_data_vn_v2_2025_dec';
const CURRENT_USER = 'Nguyễn Thùy Linh'; 

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [activeTab, setActiveTab] = useState<'overview' | 'workspace'>('workspace');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [isMyFocus, setIsMyFocus] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [isDebugLoading, setIsDebugLoading] = useState(false);
  
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Load Data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsDataLoading(true);
      try {
        // Try Bitable first
        try {
          const bitableData = await fetchProjectsFromBitable();
          if (bitableData && bitableData.length > 0) {
            setProjects(bitableData);
            setIsDataLoading(false);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bitableData));
            return;
          }
        } catch (err) {
          console.warn('Bitable fetch failed, fallback to sample CSV', err);
        }
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            setIsDataLoading(false);
            return;
          }
        }
        // Fallback if local storage is empty or key changed
        const data = await fetchProjects();
        setProjects(data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error("Error loading projects:", error);
        setProjects([]);
      } finally {
        setIsDataLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
      setHasUnsavedChanges(true);
      const timer = setTimeout(() => {
         setHasUnsavedChanges(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [projects]);

  const handleResetData = async () => {
     if(window.confirm("Bạn có chắc chắn muốn khôi phục dữ liệu mẫu (Tháng 12/2025)? Mọi thay đổi hiện tại sẽ bị mất.")) {
        setIsDataLoading(true);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        const data = await fetchProjects();
        setProjects(data);
        setIsDataLoading(false);
        setAiAnalysis(null);
     }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setProjects(parsed);
      setAiAnalysis(null); 
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const csvContent = generateCSV(projects);
    downloadCSV(csvContent, `nova_export_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzeLoading(true);
    try {
      const result = await analyzeProjects(projects);
      setAiAnalysis(result);
    } catch (error) {
      console.error(error);
      setAiAnalysis("Đã xảy ra lỗi khi kết nối với Gemini. Vui lòng kiểm tra API Key.");
    } finally {
      setIsAnalyzeLoading(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (selectedProject?.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }
  };

  const handleProjectMove = (projectId: string, newStatus: Project['status']) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, status: newStatus } : p
    ));
  };

  const handleQuickAdd = (status: Project['status'], name: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: name,
      status: status,
      priority: 'Medium',
      owner: isMyFocus ? CURRENT_USER : 'Unassigned',
      budget: 0,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      description: '',
      comments: [],
      subtasks: []
    };
    setProjects(prev => [newProject, ...prev]);
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const matchesSearch = 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.status.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesOwner = true;
        if (isMyFocus) {
            matchesOwner = p.owner === CURRENT_USER;
        } else if (selectedOwner) {
            matchesOwner = p.owner === selectedOwner;
        }
        const matchesPriority = selectedPriority ? p.priority === selectedPriority : true;

        return matchesSearch && matchesOwner && matchesPriority;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'string' && typeof valB === 'string') {
           return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
           return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [projects, searchTerm, sortField, sortOrder, selectedOwner, selectedPriority, isMyFocus]);

  const handleDebugRecord = async () => {
    setIsDebugLoading(true);
    setDebugError(null);
    try {
      const res = await fetchCurrentRecordSample();
      setDebugData(res);
    } catch (err: any) {
      setDebugError(err?.message || String(err));
      setDebugData(null);
    } finally {
      setIsDebugLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dot-pattern text-slate-800 font-sans flex overflow-hidden">
      
      {/* Sidebar Component */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300 relative h-screen">
        
        {/* Top Header */}
        <header className="sticky top-0 z-20 px-6 h-18 flex items-center justify-between glass-panel border-b-0 border-b-slate-200/50 mt-4 mx-4 rounded-2xl mb-4 shadow-sm">
           <div className="flex items-center gap-4">
              <button className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                 <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
                {activeTab}
                <div className={`hidden sm:flex ml-4 items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full transition-all duration-500 border ${hasUnsavedChanges ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-white border-slate-100 text-slate-400'}`}>
                   {hasUnsavedChanges ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                      </>
                   ) : (
                      <>
                        <Cloud className="w-3 h-3" /> Synced
                      </>
                   )}
                </div>
              </h2>
           </div>

           <div className="flex items-center gap-3">
              <div className="hidden md:flex relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56 transition-all shadow-inner"
               />
              </div>

              <button 
                 onClick={() => setIsMyFocus(!isMyFocus)}
                 className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isMyFocus ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                 title="Only show my projects"
              >
                 <Target className="w-4 h-4" />
                 <span className="hidden sm:inline">My Focus</span>
              </button>

              <button
                onClick={handleDebugRecord}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                title="Xem dữ liệu record hiện tại"
              >
                {isDebugLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
                <span className="hidden sm:inline">Debug record</span>
              </button>
           </div>
        </header>

        {/* Workspace Toolbar */}
        {activeTab === 'workspace' && (
           <div className="px-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
                 <div className="flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <Filter className="w-3.5 h-3.5 text-slate-400 mr-2" />
                    <select 
                       className="text-sm text-slate-600 bg-transparent focus:outline-none cursor-pointer"
                       value={selectedPriority || ''}
                       onChange={(e) => setSelectedPriority(e.target.value || null)}
                    >
                       <option value="">All Priorities</option>
                       <option value="Critical">Critical</option>
                       <option value="High">High</option>
                       <option value="Medium">Medium</option>
                       <option value="Low">Low</option>
                    </select>
                 </div>

                 <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-2">
                    <label className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg cursor-pointer transition" title="Import CSV">
                       <Upload className="w-4 h-4" />
                       <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button onClick={handleExport} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition" title="Export CSV">
                       <Download className="w-4 h-4" />
                    </button>
                    <button onClick={handleResetData} className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition" title="Reset Data">
                       <RefreshCw className="w-4 h-4" />
                    </button>
                 </div>
              </div>

              <div className="bg-slate-200/50 p-1 rounded-xl flex items-center">
                 <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <List className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <Kanban className="w-4 h-4" />
                 </button>
              </div>
           </div>
        )}

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pb-20">
          {isDataLoading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                <p>Đang tải dữ liệu...</p>
             </div>
          ) : (
            <>
              {activeTab === 'overview' ? (
                 <ProjectStats 
                    projects={projects}
                    aiAnalysis={aiAnalysis}
                    isAnalyzeLoading={isAnalyzeLoading}
                    onRunAnalysis={handleRunAnalysis}
                    onClearAnalysis={() => setAiAnalysis(null)}
                 />
              ) : (
                 <div className="h-full">
                    {viewMode === 'list' ? (
                       <ProjectList 
                          projects={filteredProjects}
                          sortField={sortField}
                          sortOrder={sortOrder}
                          onSort={handleSort}
                          onDelete={handleDelete}
                          onProjectClick={setSelectedProject}
                          onUpdateProject={handleUpdateProject}
                       />
                    ) : (
                       <ProjectBoard 
                          projects={filteredProjects}
                          onProjectClick={setSelectedProject}
                          onProjectMove={handleProjectMove}
                          onQuickAdd={handleQuickAdd}
                          onUpdateProject={handleUpdateProject}
                       />
                    )}
                 </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Slide Over */}
      {selectedProject && (
         <ProjectSlideOver 
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onUpdateProject={handleUpdateProject}
         />
      )}

      {/* Debug panel */}
      {(debugData || debugError) && (
        <div className="fixed bottom-4 right-4 z-40 w-[420px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-sm custom-scrollbar overflow-y-auto max-h-[60vh]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Bug className="w-4 h-4 text-indigo-500" />
              Debug record
            </div>
            <button
              className="text-slate-400 hover:text-slate-700"
              onClick={() => {
                setDebugData(null);
                setDebugError(null);
              }}
            >
              Close
            </button>
          </div>
          {debugError && (
            <div className="text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 mb-2">
              {debugError}
            </div>
          )}
          {debugData && (
            <pre className="text-xs leading-5 text-slate-700 whitespace-pre-wrap break-all">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
         <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="absolute left-0 top-0 bottom-0 w-72 glass-sidebar shadow-2xl">
               <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} />
            </div>
         </div>
      )}
    </div>
  );
}

export default App;
