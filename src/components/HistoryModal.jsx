import React from 'react';
import { X, RefreshCcw, Trash2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const HistoryModal = ({ tasks, onClose, onRestore, onPermanentDelete, onClearHistory }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{maxWidth: '600px'}}>
        <header className="modal-header">
          <div className="modal-title-group">
            <h2 className="flex items-center gap-2">
              <Clock size={20} color="var(--primary-color)" /> Deleted History
            </h2>
            <p className="modal-subtitle">Restore accidentally deleted tasks or clear history</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body" style={{maxHeight: '60vh', overflowY: 'auto'}}>
          {tasks.length === 0 ? (
            <div className="empty-history">
              <AlertCircle size={40} color="var(--text-secondary)" />
              <p>No deleted tasks in history.</p>
            </div>
          ) : (
            <div className="history-list">
              {tasks.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)).map(task => (
                <div key={task.id} className="history-item">
                  <div className="history-item-info">
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <span className={`type-dot type-${task.type.toLowerCase()}`}></span>
                      <strong>{task.title}</strong>
                      <span className="history-ticket">{task.ticketId}</span>
                    </div>
                    <div className="history-meta">
                      Deleted: {task.deletedAt ? format(new Date(task.deletedAt), 'MMM d, h:mm a') : 'Unknown'}
                    </div>
                  </div>
                  <div className="history-item-actions">
                    <button 
                      className="icon-btn restore-btn" 
                      onClick={() => onRestore(task.id)}
                      title="Restore Task"
                    >
                      <RefreshCcw size={18} />
                    </button>
                    <button 
                      className="icon-btn delete-perm-btn" 
                      onClick={() => onPermanentDelete(task.id)}
                      title="Delete Permanently"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="modal-footer" style={{justifyContent: 'space-between'}}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {tasks.length > 0 && (
            <button className="btn btn-danger" onClick={() => onClearHistory(tasks)}>
              Clear All History
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default HistoryModal;
