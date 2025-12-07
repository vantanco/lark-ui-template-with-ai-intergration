import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, Send, CheckSquare, Square, Plus, Trash2, Edit2, Save, Clock, GripVertical, ArrowRight } from 'lucide-react';
import { Project, Comment, SubTask } from '../types';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import ReactMarkdown from 'react-markdown';

interface ProjectSlideOverProps {
  project: Project | null;
  onClose: () => void;
  onUpdateProject: (updatedProject: Project) => void;
}

const ProjectSlideOver: React.FC<ProjectSlideOverProps> = ({ project, onClose, onUpdateProject }) => {
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  useEffect(() => {
    if (project) {
      setNewComment('');
      setNewSubtaskTitle('');
      setIsEditingDesc(false);
      setDescValue(project.description);
    }
  }, [project]);

  if (!project) return null;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Me',
      text: newComment,
      timestamp: new Date().toISOString()
    };
    
    onUpdateProject({ ...project, comments: [...(project.comments || []), comment] });
    setNewComment('');
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const subtask: SubTask = {
      id: Date.now().toString(),
      title: newSubtaskTitle,
      isCompleted: false
    };

    onUpdateProject({ ...project, subtasks: [...(project.subtasks || []), subtask] });
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

  const saveDescription = () => {
    onUpdateProject({ ...project, description: descValue });
    setIsEditingDesc(false);
  };

  const totalSubtasks = project.subtasks?.length || 0;
  const completedSubtasks = project.subtasks?.filter(s => s.isCompleted).length || 0;
  const progressPercent = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      ></div>

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
           <div className="flex items-center gap-2 text-xs text-slate-500 uppercase font-bold tracking-wider">
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[project.status].split(' ')[0]}`}></span>
              {project.id} / {project.status}
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition">
              <X className="w-5 h-5" />
           </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
           <div className="p-6">
              {/* Title & Meta */}
              <div className="mb-8">
                 <div className={`inline-block px-2.5 py-1 rounded text-xs font-bold mb-3 ${PRIORITY_COLORS[project.priority] === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {project.priority} Priority
                 </div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-6">{project.name}</h2>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <div className="text-xs text-slate-400 font-semibold mb-1 uppercase">Assignee</div>
                       <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                             {project.owner.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-700 truncate">{project.owner}</span>
                       </div>
                    </div>
                    {/* Date Range Card */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                       <div className="text-xs text-slate-400 font-semibold mb-1 uppercase">Timeline</div>
                       <div className="flex items-center gap-2 text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-sm font-medium">{project.dueDate}</span>
                       </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <div className="text-xs text-slate-400 font-semibold mb-1 uppercase">Budget</div>
                       <div className="flex items-center gap-2 text-slate-700">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">${project.budget.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Two Column Layout for Body */}
              <div className="flex flex-col gap-8">
                 
                 {/* Left/Top: Description & Subtasks */}
                 <div className="space-y-8">
                    {/* Description */}
                    <div className="group">
                       <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                             Brief & Specs
                          </h3>
                          {!isEditingDesc && (
                             <button onClick={() => setIsEditingDesc(true)} className="text-xs text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <Edit2 className="w-3 h-3" /> Edit
                             </button>
                          )}
                       </div>
                       
                       {isEditingDesc ? (
                          <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-sm animate-in fade-in">
                             <textarea
                                value={descValue}
                                onChange={(e) => setDescValue(e.target.value)}
                                className="w-full h-32 p-2 text-sm text-slate-700 focus:outline-none resize-y"
                             />
                             <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                                <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                                <button onClick={saveDescription} className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
                             </div>
                          </div>
                       ) : (
                          <div onClick={() => setIsEditingDesc(true)} className="prose prose-sm prose-slate max-w-none text-slate-600 hover:bg-slate-50 p-2 -ml-2 rounded cursor-text transition-colors">
                             <ReactMarkdown>{project.description || "*No description.*"}</ReactMarkdown>
                          </div>
                       )}
                    </div>

                    {/* Subtasks */}
                    <div>
                       <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-slate-900">Subtasks</h3>
                          <span className="text-xs font-medium text-slate-400">{completedSubtasks}/{totalSubtasks}</span>
                       </div>
                       
                       {totalSubtasks > 0 && (
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                          </div>
                       )}

                       <div className="space-y-2">
                          {(project.subtasks || []).map(subtask => (
                             <div key={subtask.id} className="flex items-start gap-3 group">
                                <button onClick={() => toggleSubtask(subtask.id)} className={`mt-0.5 flex-shrink-0 ${subtask.isCompleted ? 'text-green-500' : 'text-slate-300 hover:text-indigo-500'}`}>
                                   {subtask.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                                <span className={`text-sm flex-1 pt-0.5 ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{subtask.title}</span>
                                <button onClick={() => deleteSubtask(subtask.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          ))}
                       </div>

                       <form onSubmit={handleAddSubtask} className="mt-3 relative">
                          <Plus className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                             type="text"
                             value={newSubtaskTitle}
                             onChange={(e) => setNewSubtaskTitle(e.target.value)}
                             placeholder="Add subtask..."
                             className="w-full pl-9 pr-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg hover:border-slate-400 focus:border-indigo-500 focus:ring-0 transition bg-slate-50"
                          />
                       </form>
                    </div>
                 </div>

                 {/* Comments Stream */}
                 <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Team Updates</h3>
                    
                    <div className="space-y-6 mb-6">
                       {project.comments && project.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm border border-slate-200">
                                {comment.author.charAt(0)}
                             </div>
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                   <span className="text-sm font-bold text-slate-800">{comment.author}</span>
                                   <span className="text-xs text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}, {new Date(comment.timestamp).toLocaleDateString()}</span>
                                </div>
                                <div className="text-sm text-slate-600 leading-relaxed">
                                   {comment.text}
                                </div>
                             </div>
                          </div>
                       ))}
                       {(!project.comments || project.comments.length === 0) && (
                          <div className="text-center py-6 text-slate-400 text-sm italic bg-slate-50 rounded-lg">
                             No updates yet. Start the conversation.
                          </div>
                       )}
                    </div>

                    <form onSubmit={handleSubmitComment} className="flex gap-2 items-start">
                       <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                          Me
                       </div>
                       <div className="flex-1 relative">
                          <input
                             type="text"
                             value={newComment}
                             onChange={(e) => setNewComment(e.target.value)}
                             placeholder="Write an update..."
                             className="w-full pl-4 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
                          />
                          <button 
                             type="submit"
                             disabled={!newComment.trim()}
                             className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition"
                          >
                             <Send className="w-3 h-3" />
                          </button>
                       </div>
                    </form>
                 </div>

              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSlideOver;