import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { getTaskColorCode } from '../utils/data';
import { ChevronLeft, ChevronRight, Info, Edit2, ExternalLink, Search, X } from 'lucide-react';

const Calendar = ({ currentMonth, onDateChange, tasks, onTaskClick, onInfoClick, onEditClick, searchQuery, setSearchQuery }) => {
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false);
  const searchRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchExpanded(false);
      }
    };
    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded]);
  const nextMonth = () => onDateChange(addDays(currentMonth, 31)); // Simple next
  const prevMonth = () => onDateChange(addDays(currentMonth, -31)); // Simple prev

  const renderHeader = () => {
    return (
      <div className="calendar-controls-container">
        <h2 className="section-title">{format(currentMonth, 'MMMM yyyy')}</h2>
        
        <div className="calendar-actions-group">
          <div className={`calendar-search-wrapper ${isSearchExpanded ? 'expanded' : ''}`} ref={searchRef}>
            <button 
              className="btn btn-secondary mobile-search-toggle" 
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              aria-label="Toggle Search"
            >
              <Search size={18} />
            </button>
            <div className="search-input-group">
              <Search size={16} className="search-icon-inner" />
              <input 
                type="text" 
                placeholder="Search ID or Title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="calendar-search-input"
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="month-nav-buttons">
            <button className="btn btn-secondary" onClick={prevMonth} aria-label="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <button className="btn btn-secondary" onClick={nextMonth} aria-label="Next Month">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth);
    for (let i = 0; i < 7; i++) {
        const day = addDays(startDate, i);
        const fullDay = format(day, 'EEEE');
        const shortDay = format(day, 'EEEEE'); // Single letter 'S', 'M', etc.
        days.push(
            <div className="calendar-header-cell" key={i}>
                <span className="full-day">{fullDay}</span>
                <span className="short-day">{shortDay}</span>
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

    // Helper: get the calendar day an item should appear on
    const getDisplayDay = (item) => {
      if (item.isCompleted && item.submissionDate) {
        return new Date(item.submissionDate);
      }
      return new Date(item.deadline);
    };

    // Optimization: Group tasks by date first so we don't filter in every cell
    const tasksByDay = allItems.reduce((acc, item) => {
      const dateKey = format(getDisplayDay(item), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    }, {});

    // Helper: compare date-only (strips time) for late/early detection
    const toDateOnly = (d) => {
      const dt = new Date(d);
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    };

    // Get submission tint: 'late' | 'early' | 'ontime'
    const getSubmissionTint = (item) => {
      if (!item.isCompleted) return null;
      const subDay = item.submissionDate ? toDateOnly(item.submissionDate) : toDateOnly(item.deadline);
      const deadlineDay = toDateOnly(item.deadline);
      if (subDay > deadlineDay) return 'late';
      if (subDay < deadlineDay) return 'early';
      return 'ontime';
    };

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayTasks = tasksByDay[dateKey] || [];

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
                const colorClass = `task-${getTaskColorCode(item, isPart ? 'Part' : item.type, new Date())}`;
                const tint = getSubmissionTint(item);

                // Extra inline style only for completed tasks with late/early status
                let chipStyle = {};
                let textStyle = {};
                if (item.isCompleted) {
                  if (tint === 'late') {
                    chipStyle = { background: 'rgba(248, 81, 73, 0.12)', borderColor: 'rgba(248, 81, 73, 0.35)' };
                    textStyle = { textDecorationColor: '#ff7b72' };
                  } else if (tint === 'early') {
                    chipStyle = { background: 'rgba(46, 160, 67, 0.12)', borderColor: 'rgba(46, 160, 67, 0.35)' };
                    textStyle = { textDecorationColor: '#56d364' };
                  }
                }
                
                let displayTitle = item.title;
                const isMobileView = window.innerWidth < 768;

                if (isPart) {
                  const pTicketId = item.parentTask?.ticketId;
                  const pType = item.parentTask?.type;
                  if (isMobileView && pTicketId) {
                    displayTitle = pTicketId;
                  } else if (pTicketId) {
                    displayTitle = `${pTicketId}: ${pType} - ${item.title}`;
                  } else {
                    displayTitle = `• ${item.title}`;
                  }
                } else if (item.ticketId) {
                  displayTitle = isMobileView ? item.ticketId : `${item.ticketId}: ${item.title}`;
                } else if (isMobileView) {
                  displayTitle = item.title.slice(0, 8) + '..';
                }
                
                const isDissertation = item.type === 'Dissertation' || item.parentTask?.type === 'Dissertation';
                
                return (
                    <div 
                        key={item.id} 
                        className={`task-chip ${colorClass} ${isDissertation ? 'special-dissertation' : ''}`}
                        style={chipStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.innerWidth < 768) {
                            setIsSearchExpanded(false); // Close search on mobile when opening modal
                            onInfoClick(isPart ? item.parentTask : item);
                          } else {
                            onTaskClick(isPart ? item.parentTask : item);
                          }
                        }}
                    >
                        <div className="task-content">
                          <p title={displayTitle} style={textStyle}>{displayTitle}</p>
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
                        <span className="task-time">{format(new Date(item.deadline), 'h:mm a')}</span>
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
      <div className="calendar-grid-wrapper" style={{display: 'flex', flexDirection: 'column'}}>
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
};

export default Calendar;
