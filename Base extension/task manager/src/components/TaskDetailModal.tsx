import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, Send, CheckSquare, Square, Plus, Trash2, Edit2, Save } from 'lucide-react';
import { Project, Comment, SubTask } from '../types';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import ReactMarkdown from 'react-markdown';

interface TaskDetailModalProps {
  project: Project | null;
  onClose: () => void;
  onUpdateProject: (updatedProject: Project) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ project, onClose, onUpdateProject }) => {
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  // Description Edit State
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  // Reset local state when project changes
  useEffect(() => {
    if (project) {
      setNewComment('');
      setNewSubtaskTitle('');
      setIsEditingDesc(false);
      setDescValue(project.description);
    }
  }, [project]);

  if (!project) return null;

  // --- Comment Logic ---
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Me',
      text: newComment,
      timestamp: new Date().toISOString()
    };
    
    const updatedProject = { 
      ...project, 
      comments: [...(project.comments || []), comment] 
    };
    
    onUpdateProject(updatedProject);
    setNewComment('');
  };

  // --- Subtask Logic ---
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const subtask: SubTask = {
      id: Date.now().toString(),
      title: newSubtaskTitle,
      isCompleted: false
    };

    const updatedProject = {
      ...project,
      subtasks: [...(project.subtasks || []), subtask]
    };

    onUpdateProject(updatedProject);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = (project.subtasks || []).map(st => 
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    
    onUpdateProject({ ...project, subtasks: updatedSubtasks });
  };

  const deleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = (project.subtasks || []).filter(st => st.id !== subtaskId);
    onUpdateProject({ ...project, subtasks: updatedSubtasks });
  };

  // --- Description Logic ---
  const saveDescription = () => {
    onUpdateProject({ ...project, description: descValue });
    setIsEditingDesc(false);
  };

  // Stats for Progress Bar
  const totalSubtasks = project.subtasks?.length || 0;
  const completedSubtasks = project.subtasks?.filter(s => s.isCompleted).length || 0;
  const progressPercent = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* LEFT COLUMN: Main Details */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-white">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
            <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${STATUS_COLORS[project.status]}`}>
                    {project.status}
                </span>
                <span className={`text-xs font-semibold ${PRIORITY_COLORS[project.priority]}`}>
                    {project.priority} Priority
                </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 leading-tight">{project.name}</h2>
            </div>
            {/* Mobile close button (visible only on small screens) */}
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
            </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 space-y-8">
                
                {/* Metadata Row */}
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 min-w-[140px]">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                            <User className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold">Assignee</div>
                            <div className="text-sm font-semibold text-slate-700">{project.owner}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 min-w-[140px]">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold">Due Date</div>
                            <div className="text-sm font-semibold text-slate-700">{project.dueDate}</div>
                        </div>
                    </div>
                     <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 min-w-[140px]">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                            <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold">Budget</div>
                            <div className="text-sm font-semibold text-slate-700">${project.budget.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Description Section */}
                <div className="group relative">
                    <div className="flex items-center justify-between mb-2">
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Description</h3>
                         {!isEditingDesc && (
                             <button 
                                onClick={() => setIsEditingDesc(true)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                <Edit2 className="w-3 h-3" /> Edit
                             </button>
                         )}
                    </div>
                    
                    {isEditingDesc ? (
                        <div className="animate-in fade-in duration-200">
                            <textarea
                                value={descValue}
                                onChange={(e) => setDescValue(e.target.value)}
                                className="w-full h-40 p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none text-sm leading-relaxed text-slate-700 bg-white shadow-inner"
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                                <button 
                                    onClick={() => { setDescValue(project.description); setIsEditingDesc(false); }}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={saveDescription}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition flex items-center gap-1"
                                >
                                    <Save className="w-3 h-3" /> Save Changes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div 
                            className="prose prose-sm prose-slate max-w-none text-slate-600 bg-slate-50/50 p-4 rounded-lg border border-transparent hover:border-slate-200 transition cursor-text min-h-[80px]"
                            onClick={() => setIsEditingDesc(true)}
                            title="Click to edit"
                        >
                            <ReactMarkdown>{project.description || "*No description provided.*"}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Subtasks Section */}
                <div>
                     <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                           Subtasks
                           {totalSubtasks > 0 && (
                               <span className="text-xs font-normal text-slate-500 lowercase bg-slate-100 px-2 py-0.5 rounded-full">
                                   {completedSubtasks}/{totalSubtasks} done
                               </span>
                           )}
                        </h3>
                     </div>

                     {/* Progress Bar */}
                     {totalSubtasks > 0 && (
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                            <div 
                                className="h-full bg-indigo-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                     )}

                     <div className="space-y-2 mb-4">
                        {(project.subtasks || []).map(subtask => (
                            <div key={subtask.id} className="flex items-center gap-3 group bg-white p-2 rounded-lg border border-transparent hover:border-slate-100 hover:shadow-sm transition">
                                <button 
                                    onClick={() => toggleSubtask(subtask.id)}
                                    className={`flex-shrink-0 transition-colors ${subtask.isCompleted ? 'text-indigo-500' : 'text-slate-300 hover:text-indigo-400'}`}
                                >
                                    {subtask.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                                <span className={`flex-1 text-sm ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                    {subtask.title}
                                </span>
                                <button 
                                    onClick={() => deleteSubtask(subtask.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                     </div>

                     <form onSubmit={handleAddSubtask} className="flex gap-2">
                        <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Add a new subtask..."
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition border-dashed"
                        />
                        <button 
                             type="submit"
                             disabled={!newSubtaskTitle.trim()}
                             className="px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 transition"
                        >
                             <Plus className="w-4 h-4" />
                        </button>
                     </form>
                </div>

            </div>
        </div>

        {/* RIGHT COLUMN: Activity & Chat */}
        <div className="w-full md:w-80 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-[50vh] md:h-auto">
             <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white md:bg-transparent">
                <h3 className="font-bold text-slate-700 text-sm">Activity</h3>
                <button onClick={onClose} className="hidden md:block text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {/* Start of List */}
                 <div className="text-xs text-center text-slate-400 my-4">
                    <span>Task created on {new Date().toLocaleDateString()}</span>
                 </div>

                 {project.comments && project.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                         <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0 mt-0.5">
                            {comment.author.charAt(0)}
                         </div>
                         <div>
                             <div className="flex items-baseline gap-2 mb-1">
                                 <span className="text-xs font-bold text-slate-700">{comment.author}</span>
                                 <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                             <div className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                 {comment.text}
                             </div>
                         </div>
                    </div>
                 ))}
             </div>

             <div className="p-3 border-t border-slate-200 bg-white">
                <form onSubmit={handleSubmitComment} className="relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                    <button 
                        type="submit"
                        disabled={!newComment.trim()}
                        className="absolute right-1 top-1 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-50 transition"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
             </div>
        </div>

      </div>
    </div>
  );
};

export default TaskDetailModal;