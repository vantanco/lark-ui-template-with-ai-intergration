import React from 'react';
import { Trash2, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Project, SortField, SortOrder } from '../types';
import { STATUS_COLORS } from '../constants';

interface ProjectListProps {
  projects: Project[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onDelete: (id: string, e: React.MouseEvent) => void; 
  onProjectClick: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, 
  sortField, 
  sortOrder, 
  onSort, 
  onDelete,
  onProjectClick,
  onUpdateProject
}) => {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return sortOrder === 'asc' ? <span className="text-indigo-600 ml-1">↑</span> : <span className="text-indigo-600 ml-1">↓</span>;
  };

  const cyclePriority = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const priorities: Project['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
    const currentIndex = priorities.indexOf(project.priority);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];
    onUpdateProject({ ...project, priority: nextPriority });
  };

  const getDueDateStyle = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dateStr);
    due.setHours(0,0,0,0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600 font-bold'; 
    if (diffDays <= 2) return 'text-orange-600 font-medium';
    return 'text-slate-600';
  };

  return (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-left text-sm border-separate border-spacing-y-2">
        <thead className="text-slate-400">
          <tr>
            <th className="px-6 py-2 font-medium w-16 text-center text-xs uppercase tracking-wider">#</th>
            {['Name', 'Status', 'Priority', 'Owner', 'Due Date'].map((header) => {
              const field = header.toLowerCase().replace(' ', '') as SortField;
              return (
                <th 
                  key={header} 
                  className="px-6 py-2 font-medium cursor-pointer hover:text-indigo-600 transition select-none text-xs uppercase tracking-wider"
                  onClick={() => onSort(field)}
                >
                  <div className="flex items-center">
                    {header} {getSortIcon(field)}
                  </div>
                </th>
              );
            })}
            <th className="px-6 py-2 font-medium text-right text-xs uppercase tracking-wider">Budget</th>
            <th className="px-6 py-2 font-medium text-right w-20"></th>
          </tr>
        </thead>
        <tbody>
          {projects.length > 0 ? (
            projects.map((project) => (
              <tr 
                key={project.id} 
                className="bg-white hover:bg-white/80 hover:shadow-md hover:scale-[1.005] transition-all duration-200 cursor-pointer group rounded-xl shadow-sm"
                onClick={() => onProjectClick(project)}
              >
                <td className="px-6 py-4 text-center text-slate-300 font-mono text-xs rounded-l-xl">
                  {project.id}
                </td>
                <td className="px-6 py-4 font-bold text-slate-800 max-w-xs">
                  <div className="truncate">{project.name}</div>
                  {project.subtasks && project.subtasks.length > 0 && (
                     <div className="h-1 w-16 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{width: `${(project.subtasks.filter(s=>s.isCompleted).length / project.subtasks.length) * 100}%`}}
                        />
                     </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <button 
                      onClick={(e) => cyclePriority(e, project)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors ${
                        project.priority === 'Critical' ? 'text-red-600 font-bold' : 
                        project.priority === 'High' ? 'text-orange-600 font-semibold' :
                        project.priority === 'Medium' ? 'text-blue-600' : 'text-slate-500'
                      }`}
                   >
                      {project.priority === 'Critical' && <AlertCircle className="w-3.5 h-3.5" />}
                      <span className="text-xs">{project.priority}</span>
                   </button>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                         {project.owner.charAt(0)}
                      </div>
                      <span className="text-slate-600 font-medium text-xs">{project.owner}</span>
                   </div>
                </td>
                <td className={`px-6 py-4 text-sm ${getDueDateStyle(project.dueDate)}`}>
                  {new Date(project.dueDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 font-mono text-slate-600 text-right">
                  ${project.budget.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right rounded-r-xl">
                  <button 
                    onClick={(e) => onDelete(project.id, e)}
                    className="text-slate-300 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="px-6 py-24 text-center text-slate-500 flex flex-col items-center justify-center bg-white/50 rounded-xl border border-dashed border-slate-200 mt-4">
                 <div className="bg-white p-4 rounded-full mb-3 shadow-sm">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                 </div>
                 <p className="text-lg font-medium text-slate-600">No projects found</p>
                 <p className="text-sm text-slate-400">Try adjusting your filters or search.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectList;