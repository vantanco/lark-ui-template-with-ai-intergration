import React, { useState } from 'react';
import { Project } from '../types';
import { STATUS_COLORS } from '../constants';
import { Calendar, MessageSquare, CheckSquare, Plus, X, Ghost, CheckCircle2 } from 'lucide-react';

interface ProjectBoardProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onProjectMove: (projectId: string, newStatus: Project['status']) => void;
  onQuickAdd: (status: Project['status'], name: string) => void;
  onUpdateProject: (project: Project) => void;
}

const COLUMNS: Project['status'][] = ['Pending', 'In Progress', 'Blocked', 'Completed'];

const PRIORITY_BORDER: Record<string, string> = {
  'Low': 'border-l-slate-300',
  'Medium': 'border-l-blue-400',
  'High': 'border-l-orange-500',
  'Critical': 'border-l-red-600'
};

const ProjectBoard: React.FC<ProjectBoardProps> = ({ 
  projects, 
  onProjectClick, 
  onProjectMove,
  onQuickAdd,
  onUpdateProject 
}) => {
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [addingToStatus, setAddingToStatus] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  
  // Celebration State
  const [celebratingColumn, setCelebratingColumn] = useState<string | null>(null);

  const getProjectsByStatus = (status: string) => {
    return projects.filter(p => p.status === status);
  };

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProjectId(projectId);
    e.dataTransfer.setData('projectId', projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: Project['status']) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    
    if (projectId) {
      onProjectMove(projectId, status);
      
      // Trigger Celebration if moving to Completed
      if (status === 'Completed') {
        setCelebratingColumn('Completed');
        setTimeout(() => setCelebratingColumn(null), 1000); // Reset after animation
      }
    }
    setDraggedProjectId(null);
  };

  const handleQuickAddSubmit = (status: Project['status']) => {
    if (newTaskName.trim()) {
      onQuickAdd(status, newTaskName);
      setNewTaskName('');
      setAddingToStatus(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, status: Project['status']) => {
    if (e.key === 'Enter') {
      handleQuickAddSubmit(status);
    } else if (e.key === 'Escape') {
      setAddingToStatus(null);
    }
  };

  // Helper for inline priority toggle
  const cyclePriority = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      const priorities: Project['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
      const currentIndex = priorities.indexOf(project.priority);
      const nextPriority = priorities[(currentIndex + 1) % priorities.length];
      onUpdateProject({ ...project, priority: nextPriority });
  };

  // Helper for Due Date Urgency Visuals
  const getDueDateStyle = (dateStr: string) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const due = new Date(dateStr);
      due.setHours(0,0,0,0);
      
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'text-red-600 bg-red-50 font-bold'; // Overdue
      if (diffDays <= 2) return 'text-orange-600 bg-orange-50 font-medium'; // Urgent
      return 'text-slate-500'; // Safe
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 h-full min-h-[500px] items-start px-2">
      {COLUMNS.map(status => {
        const columnProjects = getProjectsByStatus(status);
        const isCelebrating = celebratingColumn === status;

        return (
          <div 
            key={status} 
            className={`flex-shrink-0 w-80 flex flex-col h-full max-h-full transition-all duration-300 rounded-2xl ${isCelebrating ? 'celebrate-column' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                 <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${
                    status === 'Completed' ? 'bg-emerald-500' : 
                    status === 'Blocked' ? 'bg-rose-500' :
                    status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-400'
                 }`} />
                 {status}
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-white/60 px-2 py-0.5 rounded-full border border-white/50 backdrop-blur-sm">
                {columnProjects.length}
              </span>
            </div>

            {/* Scrollable Column Body */}
            <div className={`flex-1 overflow-y-auto px-1 pb-1 space-y-3 min-h-[150px] rounded-2xl ${draggedProjectId ? 'bg-slate-100/50 border-2 border-dashed border-slate-200' : ''}`}>
              
              {columnProjects.length === 0 && !addingToStatus && (
                 <div className="flex flex-col items-center justify-center h-32 text-slate-300 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                    <Ghost className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs">No tasks yet</p>
                 </div>
              )}

              {columnProjects.map(project => {
                 const totalSub = project.subtasks?.length || 0;
                 const doneSub = project.subtasks?.filter(s => s.isCompleted).length || 0;
                 const progress = totalSub > 0 ? (doneSub / totalSub) * 100 : 0;

                 return (
                    <div 
                      key={project.id} 
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onClick={() => onProjectClick(project)}
                      className={`glass-panel p-4 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-grab active:cursor-grabbing group border-l-[3px] ${PRIORITY_BORDER[project.priority] || 'border-l-slate-200'} ${draggedProjectId === project.id ? 'opacity-40 rotate-2 scale-95' : 'opacity-100'}`}
                    >
                      {/* Top Row: ID & Priority Button */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 select-none">#{project.id}</span>
                        <button 
                           onClick={(e) => cyclePriority(e, project)}
                           className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors hover:bg-slate-100 ${
                              project.priority === 'Critical' ? 'text-red-600 bg-red-50' : 
                              project.priority === 'High' ? 'text-orange-600 bg-orange-50' :
                              project.priority === 'Medium' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100'
                           }`}
                           title="Click to change priority"
                        >
                           {project.priority}
                        </button>
                      </div>
                      
                      {/* Title */}
                      <h4 className="text-sm font-bold text-slate-800 mb-3 leading-snug">
                        {project.name}
                      </h4>
                      
                      {/* Subtasks Visual */}
                      {totalSub > 0 && (
                        <div className="mb-3">
                           <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Subtasks</span>
                              <span>{Math.round(progress)}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${progress}%` }}
                              ></div>
                           </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50/50">
                         {/* Owner */}
                         <div className="flex items-center gap-1.5" title={`Owner: ${project.owner}`}>
                           <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                             {project.owner.charAt(0)}
                           </div>
                         </div>

                         {/* Meta Info */}
                         <div className="flex items-center gap-3 text-xs">
                            {(project.comments && project.comments.length > 0) && (
                               <span className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-500 transition-colors">
                                 <MessageSquare className="w-3 h-3" />
                                 <span className="font-medium">{project.comments.length}</span>
                               </span>
                            )}
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${getDueDateStyle(project.dueDate)}`}>
                              <Calendar className="w-3 h-3" />
                              {new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                         </div>
                      </div>
                    </div>
                 );
              })}

              {/* Quick Add */}
              {addingToStatus === status ? (
                <div className="bg-white p-3 rounded-xl shadow-lg border border-indigo-200 animate-in fade-in zoom-in-95 duration-200">
                   <textarea 
                      autoFocus
                      className="w-full text-sm resize-none focus:outline-none text-slate-700 placeholder-slate-300 mb-2 bg-transparent"
                      placeholder="What needs to be done?"
                      rows={2}
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, status)}
                   />
                   <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setAddingToStatus(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                         <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleQuickAddSubmit(status)}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
                     >
                         Add
                      </button>
                   </div>
                </div>
              ) : (
                <button 
                  onClick={() => setAddingToStatus(status)}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:bg-white/50 rounded-xl transition-all border border-dashed border-slate-200 hover:border-indigo-300 text-sm font-medium"
                >
                   <Plus className="w-4 h-4" /> New Task
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectBoard;