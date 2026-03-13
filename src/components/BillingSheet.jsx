import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Download, FileText, Printer, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';

const BillingSheet = ({ tasks }) => {
  const [billingData, setBillingData] = useState([]);
  const [filterMonth, setFilterMonth] = useState(new Date());
  
  // Flatten, prepare and filter completed tasks by selected month
  useEffect(() => {
    const flattened = [];
    tasks.forEach(t => {
      // For Assignments
      if (t.type === 'Assignment' && t.isCompleted) {
        const subDate = new Date(t.submissionDate || t.deadline);
        if (isSameMonth(subDate, filterMonth)) {
          flattened.push({
            rowId: t.id,
            taskRef: t,
            isPart: false,
            partIndex: null,
            ticketId: t.ticketId,
            title: t.title,
            format: t.taskFormat || 'Doc',
            wordCount: parseInt(t.wordCountTarget) || 0,
            submissionDate: subDate,
            billingDetails: t.billingDetails ? {
              changesReport: parseFloat(t.billingDetails.changesReport) || 0,
              changesPPT: parseFloat(t.billingDetails.changesPPT) || 0,
              changesCode: parseFloat(t.billingDetails.changesCode) || 0,
              dupReport: parseFloat(t.billingDetails.dupReport) || 0,
              dupPPT: parseFloat(t.billingDetails.dupPPT) || 0,
              dupCode: parseFloat(t.billingDetails.dupCode) || 0,
              ppw: parseFloat(t.billingDetails.ppw) || 0.46
            } : {
              changesReport: 0, changesPPT: 0, changesCode: 0,
              dupReport: 0, dupPPT: 0, dupCode: 0,
              ppw: 0.46
            }
          });
        }
      }
      
      // For Dissertations
      if (t.type === 'Dissertation' && t.parts && t.parts.length > 0) {
        t.parts.forEach((p, idx) => {
          if (p.isCompleted) {
            const subDate = new Date(p.submissionDate || p.deadline);
            if (isSameMonth(subDate, filterMonth)) {
              flattened.push({
                 rowId: p.id || `${t.id}-part-${idx}`,
                 taskRef: t,
                 isPart: true,
                 partIndex: idx,
                 ticketId: t.ticketId,
                 title: `${p.title}`,
                 format: p.taskFormat || 'Doc',
                 wordCount: parseInt(p.wordCountTarget) || 0,
                 submissionDate: subDate,
                 billingDetails: p.billingDetails ? {
                    changesReport: parseFloat(p.billingDetails.changesReport) || 0,
                    changesPPT: parseFloat(p.billingDetails.changesPPT) || 0,
                    changesCode: parseFloat(p.billingDetails.changesCode) || 0,
                    dupReport: parseFloat(p.billingDetails.dupReport) || 0,
                    dupPPT: parseFloat(p.billingDetails.dupPPT) || 0,
                    dupCode: parseFloat(p.billingDetails.dupCode) || 0,
                    ppw: parseFloat(p.billingDetails.ppw) || 0.46
                 } : {
                    changesReport: 0, changesPPT: 0, changesCode: 0,
                    dupReport: 0, dupPPT: 0, dupCode: 0,
                    ppw: 0.46
                 }
              });
            }
          }
        });
      }
    });

    flattened.sort((a, b) => a.submissionDate - b.submissionDate);
    setBillingData(flattened);
  }, [tasks, filterMonth]);

  const handleBillingChange = async (rowId, field, value) => {
    const updatedData = [...billingData];
    const rowIndex = updatedData.findIndex(r => r.rowId === rowId);
    if (rowIndex === -1) return;
    
    const row = updatedData[rowIndex];
    row.billingDetails[field] = parseFloat(value) || 0;
    setBillingData(updatedData);

    const mainTask = { ...row.taskRef };
    if (row.isPart) {
      if (!mainTask.parts[row.partIndex].billingDetails) {
        mainTask.parts[row.partIndex].billingDetails = {};
      }
      mainTask.parts[row.partIndex].billingDetails[field] = parseFloat(value) || 0;
    } else {
      if (!mainTask.billingDetails) mainTask.billingDetails = {};
      mainTask.billingDetails[field] = parseFloat(value) || 0;
    }

    try {
      await setDoc(doc(db, "tasks", mainTask.id), mainTask);
    } catch (e) {
      console.error("Failed to update billing details in DB", e);
    }
  };

  const calculateTotalWords = (row) => {
    const bd = row.billingDetails;
    const base = row.wordCount || 0;
    return base + (bd.changesReport || 0) + (bd.changesPPT || 0) + (bd.changesCode || 0) 
           + (bd.dupReport || 0) + (bd.dupPPT || 0) + (bd.dupCode || 0);
  };

  const calculateGrandTotal = () => {
    return billingData.reduce((acc, row) => {
      const words = calculateTotalWords(row);
      const ppw = row.billingDetails.ppw !== undefined ? row.billingDetails.ppw : 0.46;
      return acc + (words * ppw);
    }, 0);
  };

  // Month navigation
  const nextMonth = () => {
    const next = addMonths(filterMonth, 1);
    const now = new Date();
    if (next <= endOfMonth(now)) {
      setFilterMonth(next);
    }
  };

  const prevMonth = () => {
    setFilterMonth(subMonths(filterMonth, 1));
  };

  const handleMonthChange = (e) => {
    const [year, month] = e.target.value.split('-');
    setFilterMonth(new Date(year, month - 1, 1));
  };

  const downloadCSV = () => {
    const headers = [
      "S. No.", "Task Name (Task ID)", "Task Name / Subtask Name", "Report", "PPT", "Code", 
      "Changes - Report", "Changes - PPT", "Changes - Code", 
      "Duplicate - Report", "Duplicate - PPT", "Duplicate - Code", 
      "TOTAL Effort", "PPW", "Amount"
    ];

    const rows = billingData.map((row, index) => {
      const bd = row.billingDetails;
      const words = calculateTotalWords(row);
      const ppw = bd.ppw !== undefined ? bd.ppw : 0.46;
      const amount = words * ppw;
      
      return [
        index + 1,
        `"${row.ticketId || ''}"`,
        `"${row.title}"`,
        row.format === 'Doc' ? row.wordCount : 0,
        row.format === 'PPT' ? row.wordCount : 0,
        row.format === 'Code' ? row.wordCount : 0,
        bd.changesReport || 0,
        bd.changesPPT || 0,
        bd.changesCode || 0,
        bd.dupReport || 0,
        bd.dupPPT || 0,
        bd.dupCode || 0,
        words,
        ppw,
        amount.toFixed(2)
      ];
    });

    const totalRow = [
      "", "", "", "", "", "", "", "", "", "", "", "", "GRAND TOTAL", "", calculateGrandTotal().toFixed(2)
    ];

    const csvContent = [headers, ...rows, totalRow]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Billing_Sheet_${format(filterMonth, 'yyyy-MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
      {/* Month Selector Controls */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-bg)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{display: 'flex', gap: '0.25rem'}}>
            <button onClick={prevMonth} className="icon-btn" style={{padding: '0.4rem', background: 'var(--panel-hover)', borderRadius: '6px'}} title="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="icon-btn" style={{padding: '0.4rem', background: 'var(--panel-hover)', borderRadius: '6px', opacity: addMonths(filterMonth, 1) > endOfMonth(new Date()) ? 0.4 : 1, cursor: addMonths(filterMonth, 1) > endOfMonth(new Date()) ? 'not-allowed' : 'pointer'}} title="Next Month">
              <ChevronRight size={18} />
            </button>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
             <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', minWidth: '160px', textAlign: 'center'}}>
               {format(filterMonth, 'MMMM yyyy')}
             </h3>
             <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
               <CalendarIcon size={16} style={{position: 'absolute', left: '10px', color: 'var(--primary-color)', pointerEvents: 'none'}} />
               <input 
                 type="month" 
                 value={format(filterMonth, 'yyyy-MM')} 
                 onChange={handleMonthChange}
                 max={format(new Date(), 'yyyy-MM')}
                 style={{
                   padding: '0.4rem 0.75rem 0.4rem 2.25rem',
                   fontSize: '0.85rem',
                   borderRadius: '6px',
                   border: '1px solid var(--border-color)',
                   background: 'var(--bg-color)',
                   color: 'var(--text-primary)',
                   cursor: 'pointer',
                   outline: 'none',
                   fontFamily: 'inherit'
                 }}
               />
             </div>
          </div>
        </div>

        <div style={{display: 'flex', gap: '0.75rem'}}>
          <button onClick={downloadCSV} className="btn btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem'}}>
            <Download size={16} /> Download CSV
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem'}}>
            <Printer size={16} /> PDF / Print
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="printable-sheet" style={{maxWidth: '100%', overflowX: 'auto', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1750px', fontSize: '0.82rem'}}>
          <thead>
            <tr style={{background: '#35694f', color: '#fff', fontSize: '0.75rem', position: 'sticky', top: 0, zIndex: 10, textAlign: 'center'}}>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '60px', verticalAlign: 'middle'}}>S. No.</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', minWidth: '150px', verticalAlign: 'middle', textAlign: 'left'}}>Task Name (ID)</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', minWidth: '350px', verticalAlign: 'middle', textAlign: 'left'}}>Title/Subtask</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '90px', verticalAlign: 'middle'}}>Report</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '90px', verticalAlign: 'middle'}}>PPT</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Code Eq.</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Chg - Rep</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Chg - PPT</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Chg - Code</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Dup - Rep</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Dup - PPT</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Dup - Code</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>TOTAL</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '70px', verticalAlign: 'middle'}}>PPW</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {billingData.length === 0 ? (
              <tr>
                <td colSpan="15" style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  <FileText size={48} style={{opacity: 0.2, marginBottom: '1rem'}} /><br/>
                  No billing entries for {format(filterMonth, 'MMMM yyyy')}.
                </td>
              </tr>
            ) : (
              <>
                {billingData.map((row, index) => {
                  const bd = row.billingDetails;
                  const totalWords = calculateTotalWords(row);
                  const ppw = bd.ppw !== undefined ? bd.ppw : 0.46;
                  const amount = totalWords * ppw;

                  const inputStyle = {
                    width: '100%', 
                    padding: '0.5rem', 
                    fontSize: '0.85rem', 
                    border: '1px solid transparent', 
                    background: 'transparent',
                    textAlign: 'center', 
                    color: 'var(--text-primary)',
                    outline: 'none',
                    borderRadius: '4px'
                  };

                  return (
                    <tr key={row.rowId} style={{borderBottom: '1px solid var(--border-color)', background: index % 2 === 0 ? 'var(--bg-color)' : 'var(--panel-bg)'}}>
                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-secondary)'}}>{index + 1}</td>
                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.85rem'}}>{row.ticketId || '-'}</td>
                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.85rem'}}>{row.title}</td>
                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center'}}>{row.format === 'Doc' ? row.wordCount : 0}</td>
                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center'}}>{row.format === 'PPT' ? row.wordCount : 0}</td>
                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center'}}>{row.format === 'Code' ? row.wordCount : 0}</td>
                      
                      <td data-value={bd.changesReport || 0} style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.changesReport || ''} onChange={(e) => handleBillingChange(row.rowId, 'changesReport', e.target.value)} />
                      </td>
                      <td data-value={bd.changesPPT || 0} style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.changesPPT || ''} onChange={(e) => handleBillingChange(row.rowId, 'changesPPT', e.target.value)} />
                      </td>
                      <td data-value={bd.changesCode || 0} style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.changesCode || ''} onChange={(e) => handleBillingChange(row.rowId, 'changesCode', e.target.value)} />
                      </td>

                      <td data-value={bd.dupReport || 0} style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.dupReport || ''} onChange={(e) => handleBillingChange(row.rowId, 'dupReport', e.target.value)} />
                      </td>
                      <td data-value={bd.dupPPT || 0} style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.dupPPT || ''} onChange={(e) => handleBillingChange(row.rowId, 'dupPPT', e.target.value)} />
                      </td>
                      <td data-value={bd.dupCode || 0} style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.dupCode || ''} onChange={(e) => handleBillingChange(row.rowId, 'dupCode', e.target.value)} />
                      </td>

                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center', fontWeight: 'bold'}}>{totalWords}</td>
                      <td data-value={ppw} style={{padding: '0', border: '1px solid var(--border-color)'}}>
                        <input type="number" step="0.01" onFocus={(e) => e.target.style.background='var(--panel-hover)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={ppw} onChange={(e) => handleBillingChange(row.rowId, 'ppw', e.target.value)} />
                      </td>
                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold', color: 'var(--green-tag-text)'}}>
                        ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{background: '#35694f', color: '#fff', fontWeight: 'bold'}}>
                  <td colSpan="12" style={{padding: '1rem', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'right', fontSize: '1rem'}}>GRAND TOTAL</td>
                  <td style={{padding: '1rem', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', fontSize: '1rem'}}>
                    {billingData.reduce((acc, row) => acc + calculateTotalWords(row), 0)}
                  </td>
                  <td style={{padding: '1rem', border: '1px solid rgba(255,255,255,0.2)'}}></td>
                  <td style={{padding: '1rem', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'right', fontSize: '1rem'}}>
                    ₹{calculateGrandTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      
      <style>{`
        @media print {
          @page { 
            size: landscape; 
            margin: 10mm;
          }
          body * { visibility: hidden; }
          .printable-sheet, .printable-sheet * { visibility: visible; }
          .printable-sheet { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            overflow: visible !important;
          }
          table { 
            width: 100% !important; 
            min-width: 0 !important; 
            table-layout: auto !important;
            font-size: 7.5pt !important;
            border: 0.5pt solid #000 !important;
          }
          th, td { 
            padding: 4px 2px !important; 
            border: 0.5pt solid #000 !important; 
            line-height: 1.1 !important;
            color: #000 !important;
          }
          input { 
            display: none !important; 
          }
          /* Show values instead of inputs in print */
          td:has(input)::after {
            content: attr(data-value);
            display: block;
            text-align: center;
          }
          thead tr { 
            background: #35694f !important; 
            color: #fff !important;
            -webkit-print-color-adjust: exact; 
          }
          .btn, .icon-btn, .dashboard-container > header { display: none !important; }
          
          /* Visual adjustments for totals */
          tr[style*="background: #35694f"] {
            background: #35694f !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default BillingSheet;
