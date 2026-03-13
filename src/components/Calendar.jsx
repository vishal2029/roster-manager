import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { getTaskColorCode } from '../utils/data';
import { ChevronLeft, ChevronRight, Info, Edit2, ExternalLink } from 'lucide-react';

const Calendar = ({ currentMonth, onDateChange, tasks, onTaskClick, onInfoClick, onEditClick }) => {
  const nextMonth = () => onDateChange(addDays(currentMonth, 31)); // Simple next
  const prevMonth = () => onDateChange(addDays(currentMonth, -31)); // Simple prev

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
        <h2 className="section-title" style={{margin: 0}}>{format(currentMonth, 'MMMM yyyy')}</h2>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button className="btn btn-secondary" onClick={prevMonth} aria-label="Previous Month">
            <ChevronLeft size={18} />
          </button>
          <button className="btn btn-secondary" onClick={nextMonth} aria-label="Next Month">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth);
    for (let i = 0; i < 7; i++) {
        days.push(
            <div className="calendar-header-cell" key={i}>
                {format(addDays(startDate, i), 'EEEE')}
            </div>
        );
    }
    return <div className="calendar-header">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    // Flatten tasks and parts into a single array for calendar display
    const allItems = tasks.flatMap(t => {
      const items = [{...t}];
      if (t.parts && t.parts.length > 0) {
        t.parts.forEach(p => {
          items.push({
            ...p,
            parentTask: t,
            type: 'Part'
          });
        });
      }
      return items;
    });

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Find tasks/parts for this day
        const dayTasks = allItems.filter(item => {
            const deadlineDate = new Date(item.deadline);
            const subDate = item.submissionDate ? new Date(item.submissionDate) : null;
            // Use submissionDate if completed, otherwise use deadline
            const displayDate = (item.isCompleted && subDate) ? subDate : deadlineDate;
            return isSameDay(displayDate, cloneDay);
        });

        days.push(
          <div
            className={`calendar-day ${!isSameMonth(day, monthStart) ? 'empty' : ''}`}
            key={day}
          >
            <div className="calendar-day-header">
              <span className={`day-number ${isSameDay(day, new Date()) ? 'today' : ''}`}>{formattedDate}</span>
            </div>
            {dayTasks.map(item => {
                const isPart = item.type === 'Part';
                let colorClass = `task-${getTaskColorCode(item, isPart ? 'Part' : item.type, new Date())}`;
                
                // Extra check for late completion to apply special styling
                if (item.isCompleted) {
                    const deadlineDate = new Date(item.deadline);
                    const subDate = item.submissionDate ? new Date(item.submissionDate) : deadlineDate;
                    if (subDate > deadlineDate) {
                        colorClass = 'task-completed-late';
                    }
                }

                let displayTitle = item.title;
                if (isPart) {
                  const pTicketId = item.parentTask?.ticketId;
                  const pType = item.parentTask?.type;
                  if (pTicketId) {
                    displayTitle = `${pTicketId}: ${pType} - ${item.title}`;
                  } else {
                    displayTitle = `• ${item.title}`;
                  }
                } else if (item.ticketId) {
                  displayTitle = `${item.ticketId}: ${item.title}`;
                }
                
                const taskDisplayDate = (item.isCompleted && item.submissionDate) 
                    ? new Date(item.submissionDate) 
                    : new Date(item.deadline);

                return (
                    <div 
                        key={item.id} 
                        className={`task-chip ${colorClass}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(isPart ? item.parentTask : item);
                        }}
                    >
                        <div className="task-content">
                          <p title={displayTitle}>{displayTitle}</p>
                          <div className="task-actions flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button className="icon-btn" onClick={() => onInfoClick(isPart ? item.parentTask : item)} title="Details">
                              <Info size={12} />
                            </button>
                            <button className="icon-btn" onClick={() => onEditClick(isPart ? item.parentTask : item)} title="Edit">
                              <Edit2 size={12} />
                            </button>
                            {((!isPart && item.taskLink) || (isPart && item.parentTask?.taskLink)) && (
                              <button className="icon-btn" onClick={(e) => { 
                                e.stopPropagation(); 
                                const link = isPart ? item.parentTask.taskLink : item.taskLink;
                                window.open(link.startsWith('http') ? link : `https://${link}`, '_blank'); 
                              }} title="Open Task Link">
                                <ExternalLink size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="task-time">{format(taskDisplayDate, 'h:mm a')}</span>
                    </div>
                );
            })}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="calendar-row" key={day} style={{display: 'contents'}}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="calendar-grid">{rows}</div>;
  };

  return (
    <div className="calendar-container">
      {renderHeader()}
      <div style={{display: 'flex', flexDirection: 'column'}}>
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
};

export default Calendar;
