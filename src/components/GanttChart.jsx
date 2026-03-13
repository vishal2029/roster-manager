import React from 'react';
import { format, differenceInDays, addDays, startOfDay, min, max } from 'date-fns';
import { getTaskColorCode } from '../utils/data';

const GanttChart = ({ task }) => {
  if (!task || !task.parts || task.parts.length === 0) return (
    <div className="gantt-container" style={{backgroundColor: 'var(--bg-color)', border: 'none'}}>
      <p style={{color: 'var(--text-secondary)'}}>No parts scheduled for this dissertation yet.</p>
    </div>
  );

  const now = startOfDay(new Date());
  
  // Find min and max date among parts and main deadline
  const dates = [new Date(task.deadline), ...task.parts.map(p => new Date(p.deadline))];
  const minDate = min(dates);
  const maxDate = max(dates);
  
  // start 3 days before min date (or today if earlier), end 3 days after max date for padding
  const chartStart = addDays(min([now, minDate]), -3);
  const chartEnd = addDays(max([now, maxDate]), 3);
  
  const timelineDays = differenceInDays(chartEnd, chartStart);
  const days = Array.from({ length: timelineDays + 1 }).map((_, i) => addDays(chartStart, i));

  // Sort parts by deadline
  const sortedParts = [...task.parts].sort((a,b) => new Date(a.deadline) - new Date(b.deadline));

  return (
    <div className="gantt-container">
      <div className="gantt-wrapper">
        <div className="gantt-timeline-header">
          {days.filter((_, i) => i % Math.max(1, Math.floor(timelineDays / 10)) === 0).map((day) => (
            <div key={day} className="gantt-day-marker" style={{left: `${(differenceInDays(day, chartStart) / timelineDays) * 100}%`, position: 'absolute'}}>
              {format(day, 'MMM d')}
            </div>
          ))}
        </div>
        
        <div className="gantt-rows-container" style={{marginTop: '2rem'}}>
          {/* Output Parts in order */}
          {sortedParts.map((p, index) => {
            const displayTitle = task.ticketId && task.type === 'Dissertation' 
              ? `${task.ticketId}: Dissertation - ${p.title}` 
              : p.title;
              
            return (
              <GanttRow 
                 key={p.id} 
                 item={{...p, title: displayTitle}} 
                 index={index} 
                 allItems={sortedParts}
                 type="Part" 
                 chartStart={chartStart} 
                 timelineDays={timelineDays} 
              />
            );
          })}
          {/* Main Task Final row */}
          <GanttRow 
             item={{
               ...task, 
               title: `Final: ${task.ticketId ? task.ticketId + ': ' : ''}${task.title}`
             }} 
             index={sortedParts.length}
             allItems={[...sortedParts, task]}
             type="Dissertation" 
             chartStart={chartStart} 
             timelineDays={timelineDays} 
          />
        </div>
      </div>
    </div>
  );
};

const GanttRow = ({ item, index, allItems, type, chartStart, timelineDays }) => {
  const deadline = new Date(item.deadline);
  let prevDeadline;
  
  if (index === 0) {
     prevDeadline = min([startOfDay(new Date()), deadline]);
  } else {
     prevDeadline = new Date(allItems[index - 1].deadline);
  }
  
  if (prevDeadline > deadline) prevDeadline = addDays(deadline, -1); // fallback if sequence is weird
  
  const startOffset = Math.max(0, differenceInDays(prevDeadline, chartStart));
  const endOffset = differenceInDays(deadline, chartStart);
  const duration = Math.max(1, endOffset - startOffset);

  const leftPercent = Math.max(0, Math.min(100, (startOffset / timelineDays) * 100));
  const widthPercent = Math.max(1, Math.min(100 - leftPercent, (duration / timelineDays) * 100));

  const colorCode = getTaskColorCode(item, type, new Date());

  return (
    <div className="gantt-row">
      <div className="gantt-row-label" title={item.title}>
        {item.title}
      </div>
      <div className="gantt-timeline-area">
        <div 
          className={`gantt-bar task-${colorCode}`} 
          style={{
            left: `${leftPercent}%`, 
            width: `${widthPercent}%`,
            backgroundColor: `var(--${colorCode}-tag-border)`, 
            borderColor: `var(--${colorCode}-tag-text)`
          }}
        >
          <span className="gantt-bar-content">{format(deadline, 'MMM d')}</span>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
