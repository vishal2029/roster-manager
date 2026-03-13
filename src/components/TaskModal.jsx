import React, { useState } from 'react';
import { X, Clock, Target, FileText, Bot, User, Plus, Trash2, CheckCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { getTaskColorCode } from '../utils/data';

const TaskModal = ({ task, mode, onClose, onSave, onDelete }) => {
  if (!task) return null;

  const [formData, setFormData] = useState({
    ...task,
    parts: task.parts || [],
    isCompleted: task.isCompleted || false,
    submissionDate: task.submissionDate || new Date().toISOString()
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = type === 'checkbox' ? checked : value;
    if (name === 'deadline' || name === 'submissionDate') {
      processedValue = new Date(value).toISOString();
    }
    if (name === 'wordCountTarget') {
      processedValue = parseInt(value) || 0;
    }
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: processedValue 
    }));
  };

  const handlePartChange = (index, field, value) => {
    const newParts = [...formData.parts];
    newParts[index][field] = value;
    setFormData(prev => ({ ...prev, parts: newParts }));
  };

  const addPart = () => {
    setFormData(prev => ({
      ...prev,
      parts: [...prev.parts, { id: Date.now().toString(), title: '', deadline: new Date().toISOString(), isCompleted: false, wordCountTarget: 0 }]
    }));
  };

  const removePart = (index) => {
    const newParts = formData.parts.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, parts: newParts }));
  };

  const colorCode = getTaskColorCode(formData, formData.type, new Date());
  
  const isView = mode === 'view';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group" style={{flex: 1, marginRight: '1rem'}}>
            {isView ? (
              <h2 style={{textDecoration: formData.isCompleted ? 'line-through' : 'none', opacity: formData.isCompleted ? 0.7 : 1}}>
                {formData.ticketId ? `${formData.ticketId}: ` : ''}{formData.title}
                {formData.type === 'Assignment' && (
                  <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 'normal'}}>
                    ({formData.taskFormat || 'Doc'})
                  </span>
                )}
              </h2>
            ) : (
              <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                <input 
                  type="text" 
                  name="ticketId"
                  value={formData.ticketId || ''} 
                  onChange={handleChange}
                  className="form-input" 
                  style={{fontSize: '1.25rem', fontWeight: 'bold', width: '30%'}}
                  placeholder="Ticket ID"
                />
                <input 
                  type="text" 
                  name="title"
                  value={formData.title} 
                  onChange={handleChange}
                  className="form-input" 
                  style={{fontSize: '1.25rem', fontWeight: 'bold', flex: 1}}
                  placeholder="Task Title"
                />
              </div>
            )}
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              {isView ? (
                <>
                  <span className={`modal-badge task-${colorCode}`}>
                    {formData.type} • {format(new Date(formData.deadline), 'MMM d, yyyy h:mm a')}
                  </span>
                  {formData.isCompleted && (
                    <span className="modal-badge task-gray flex items-center gap-1" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <CheckCircle size={12}/> Completed
                    </span>
                  )}
                </>
              ) : (
                <>
                  <select name="type" value={formData.type} onChange={handleChange} className="form-input" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}}>
                    <option value="Assignment">Assignment</option>
                    <option value="Dissertation">Dissertation</option>
                  </select>
                  {formData.type === 'Assignment' && (
                    <select name="taskFormat" value={formData.taskFormat || 'Doc'} onChange={handleChange} className="form-input" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: '70px'}}>
                      <option value="Doc">Doc</option>
                      <option value="PPT">PPT</option>
                      <option value="Code">Code</option>
                    </select>
                  )}
                  <input type="datetime-local" name="deadline" value={format(new Date(formData.deadline), "yyyy-MM-dd'T'HH:mm")} onChange={handleChange} className="form-input" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}} />
                </>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          {!isView && (
             <div className="form-group" style={{background: 'var(--panel-hover)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
               <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)'}}>
                 <input type="checkbox" name="isCompleted" checked={formData.isCompleted} onChange={handleChange} style={{width: '18px', height: '18px'}} />
                 Mark as Completed
               </label>
               {formData.isCompleted && (
                  <div style={{marginTop: '0.75rem'}}>
                    <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem'}}>Actual Submission / Completion Time (Optional)</label>
                    <input type="datetime-local" name="submissionDate" value={format(new Date(formData.submissionDate), "yyyy-MM-dd'T'HH:mm")} onChange={handleChange} className="form-input" style={{width: '100%'}}/>
                  </div>
               )}
             </div>
          )}

          <div style={{display: 'flex', gap: '1rem'}}>
            <div className="form-group" style={{flex: 1}}>
              <label className="flex items-center gap-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Target size={16}/> Word Count Target</label>
              {isView ? (
                <div className="form-input">{formData.wordCountTarget} words</div>
              ) : (
                <input 
                  type="number" 
                  name="wordCountTarget" 
                  value={formData.wordCountTarget} 
                  onChange={handleChange}
                  className="form-input"
                />
              )}
            </div>
  
            <div className="form-group" style={{flex: 1}}>
              <label className="flex items-center gap-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Bot size={16}/> AI Tool</label>
              {isView ? (
                <div className="form-input">{formData.aiTool}</div>
              ) : (
                <select 
                  name="aiTool" 
                  value={formData.aiTool} 
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="ChatGPT">ChatGPT</option>
                  <option value="Claude">Claude</option>
                  <option value="Gemini">Gemini</option>
                  <option value="None">None</option>
                </select>
              )}
            </div>
          </div>

          <div style={{display: 'flex', gap: '1rem'}}>
            <div className="form-group" style={{flex: 1}}>
              <label className="flex items-center gap-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><User size={16}/> Linked Account</label>
              {isView ? (
                <div className="form-input">{formData.linkedAccount}</div>
              ) : (
                <select 
                  name="linkedAccount" 
                  value={formData.linkedAccount} 
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="@speakvishal4">@speakvishal4</option>
                  <option value="@vishalgupta.contentwriting">@vishalgupta.contentwriting</option>
                  <option value="@poemsofvishal">@poemsofvishal</option>
                </select>
              )}
            </div>

            {isView && formData.isCompleted && (
              <div className="form-group" style={{flex: 1}}>
                <label className="flex items-center gap-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><CheckCircle size={16}/> Submitted On</label>
                <div className="form-input">{format(new Date(formData.submissionDate), 'MMM d, h:mm a')}</div>
              </div>
            )}
          </div>

          <div className="form-group" style={{marginBottom: '1rem'}}>
            <label className="flex items-center gap-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><ExternalLink size={16}/> Task Link</label>
            {isView ? (
              <div className="form-input">
                {formData.taskLink ? (
                  <a href={formData.taskLink.startsWith('http') ? formData.taskLink : `https://${formData.taskLink}`} target="_blank" rel="noopener noreferrer" style={{color: 'var(--primary-color)', textDecoration: 'underline'}}>
                    {formData.taskLink}
                  </a>
                ) : (
                  <span style={{color: 'var(--text-secondary)'}}>No link provided.</span>
                )}
              </div>
            ) : (
              <input 
                type="text" 
                name="taskLink" 
                value={formData.taskLink || ''} 
                onChange={handleChange}
                className="form-input"
                placeholder="https://... (Optional)"
              />
            )}
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><FileText size={16}/> Notes</label>
            {isView ? (
              <div className="form-input" style={{whiteSpace: 'pre-wrap', minHeight: '80px'}}>{formData.notes || 'No notes added.'}</div>
            ) : (
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange}
                className="form-input"
                placeholder="Add your notes here..."
                rows="3"
              />
            )}
          </div>

          {/* Dissertation Parts */}
          {formData.type === 'Dissertation' && (
            <div className="form-group" style={{marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label className="flex items-center gap-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>Dissertation Parts (Chapters)</label>
                {!isView && (
                  <button type="button" className="btn btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}} onClick={addPart}>
                    <Plus size={14} /> Add Part
                  </button>
                )}
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem'}}>
                {formData.parts.map((part, i) => (
                  <div key={part.id} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                    {isView ? (
                       <div style={{flex: 1, padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                         <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                           <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                              {part.isCompleted && <CheckCircle size={14} color="var(--green-tag-text)" />}
                              <strong style={{textDecoration: part.isCompleted ? 'line-through' : 'none', opacity: part.isCompleted ? 0.7 : 1}}>{part.title}</strong>
                           </div>
                           <span style={{color: 'var(--text-secondary)'}}>{format(new Date(part.deadline), 'MMM d, yyyy')}</span>
                         </div>
                         {part.wordCountTarget > 0 && (
                           <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: part.isCompleted ? '22px' : '0'}}>
                             Word Target: {part.wordCountTarget} ({part.taskFormat || 'Doc'})
                           </div>
                         )}
                       </div>
                    ) : (
                       <div style={{display: 'flex', gap: '0.5rem', flex: 1, flexDirection: 'column', background: 'var(--panel-hover)', padding: '0.5rem', borderRadius: '6px'}}>
                         <div style={{display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center'}}>
                           <input 
                             type="checkbox" 
                             checked={part.isCompleted || false} 
                             title="Mark Part Completed"
                             onChange={e => handlePartChange(i, 'isCompleted', e.target.checked)} 
                             style={{width: '16px', height: '16px', cursor: 'pointer'}} 
                           />
                           <input type="text" className="form-input" style={{flex: 2, padding: '0.5rem'}} placeholder="Part Title" value={part.title} onChange={e => handlePartChange(i, 'title', e.target.value)} />
                           <input type="datetime-local" className="form-input" style={{flex: 1, padding: '0.5rem'}} value={format(new Date(part.deadline), "yyyy-MM-dd'T'HH:mm")} onChange={e => handlePartChange(i, 'deadline', new Date(e.target.value).toISOString())} />
                           <button type="button" className="icon-btn" style={{padding: '0.5rem'}} onClick={() => removePart(i)} title="Remove Part"><Trash2 size={16} color="var(--red-tag-text)" /></button>
                         </div>
                         <div style={{display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center', paddingLeft: '24px'}}>
                           <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Format:</label>
                           <select className="form-input" style={{width: '70px', padding: '0.25rem', fontSize: '0.85rem'}} value={part.taskFormat || 'Doc'} onChange={e => handlePartChange(i, 'taskFormat', e.target.value)}>
                             <option value="Doc">Doc</option>
                             <option value="PPT">PPT</option>
                             <option value="Code">Code</option>
                           </select>
                           <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem'}}>Word Target:</label>
                           <input type="number" className="form-input" style={{width: '90px', padding: '0.25rem 0.5rem', fontSize: '0.85rem'}} value={part.wordCountTarget || 0} onChange={e => handlePartChange(i, 'wordCountTarget', parseInt(e.target.value) || 0)} />
                         </div>
                       </div>
                     )}
                  </div>
                ))}
                {formData.parts.length === 0 && <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>No parts added.</span>}
              </div>
            </div>
          )}

        </div>

        <div className="modal-footer" style={{justifyContent: 'space-between'}}>
          {isView ? (
             <div style={{display: 'flex', width: '100%', justifyContent: 'flex-end'}}>
               <button className="btn btn-primary" onClick={onClose}>Close</button>
             </div>
          ) : (
             <div style={{display: 'flex', width: '100%', justifyContent: 'space-between'}}>
               {formData.id && onDelete ? (
                 <button className="btn btn-secondary" style={{color: 'var(--red-tag-text)', borderColor: 'var(--border-color)'}} onClick={() => onDelete(formData.id)}>
                   <Trash2 size={16} style={{display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} /> Delete Task
                 </button>
               ) : <div></div>}
               <div style={{display: 'flex', gap: '1rem'}}>
                 <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                 <button className="btn btn-primary" onClick={() => onSave(formData)}>Save Changes</button>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
