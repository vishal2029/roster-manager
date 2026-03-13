import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Download, FileText, Printer } from 'lucide-react';

const BillingSheet = ({ tasks }) => {
  const [billingData, setBillingData] = useState([]);
  
  // Flatten and prepare completed tasks
  useEffect(() => {
    const flattened = [];
    tasks.forEach(t => {
      // For Assignments
      if (t.type === 'Assignment' && t.isCompleted) {
        flattened.push({
          rowId: t.id,
          taskRef: t,
          isPart: false,
          partIndex: null,
          ticketId: t.ticketId,
          title: t.title,
          format: t.taskFormat || 'Doc',
          wordCount: parseInt(t.wordCountTarget) || 0,
          submissionDate: new Date(t.submissionDate || t.deadline),
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
      
      // For Dissertations
      if (t.type === 'Dissertation' && t.parts && t.parts.length > 0) {
        t.parts.forEach((p, idx) => {
          if (p.isCompleted) {
            flattened.push({
               rowId: p.id || `${t.id}-part-${idx}`,
               taskRef: t,
               isPart: true,
               partIndex: idx,
               ticketId: t.ticketId,
               title: `${p.title}`,
               format: p.taskFormat || 'Doc',
               wordCount: parseInt(p.wordCountTarget) || 0,
               submissionDate: new Date(p.submissionDate || p.deadline),
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
        });
      }
    });

    flattened.sort((a, b) => a.submissionDate - b.submissionDate);
    setBillingData(flattened);
  }, [tasks]);

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
    link.setAttribute("download", `Billing_Sheet_${new Date().toISOString().slice(0, 7)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printSheet = () => {
    window.print();
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
      <div style={{display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '0.5rem'}}>
        <button onClick={downloadCSV} className="btn btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem'}}>
          <Download size={16} /> Download CSV
        </button>
        <button onClick={printSheet} className="btn btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem'}}>
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

      <div className="printable-sheet" style={{maxWidth: '100%', overflowX: 'auto', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1600px', fontSize: '0.85rem'}}>
          <thead>
            <tr style={{background: '#35694f', color: '#fff', fontSize: '0.75rem', position: 'sticky', top: 0, zIndex: 10, textAlign: 'center'}}>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '60px', verticalAlign: 'middle'}}>S. No.</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', minWidth: '150px', verticalAlign: 'middle', textAlign: 'left'}}>Task Name (Task ID)</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', minWidth: '250px', verticalAlign: 'middle', textAlign: 'left'}}>Task Name / Subtask Name</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Report (words)</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '90px', verticalAlign: 'middle'}}>PPT (words)</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '120px', verticalAlign: 'middle'}}>Code Eq. Words</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '120px', verticalAlign: 'middle'}}>Changes - Report</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '120px', verticalAlign: 'middle'}}>Changes - PPT</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '120px', verticalAlign: 'middle'}}>Changes - Code</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '130px', verticalAlign: 'middle'}}>Dup - Report</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '130px', verticalAlign: 'middle'}}>Dup - PPT</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '130px', verticalAlign: 'middle'}}>Dup - Code</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>TOTAL Words</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '80px', verticalAlign: 'middle'}}>PPW</th>
              <th style={{padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', width: '100px', verticalAlign: 'middle'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {billingData.length === 0 ? (
              <tr>
                <td colSpan="15" style={{padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)'}}>No completed tasks to bill yet.</td>
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
                    transition: 'all 0.2s ease',
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
                      
                      <td style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.changesReport || ''} onChange={(e) => handleBillingChange(row.rowId, 'changesReport', e.target.value)} />
                      </td>
                      <td style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.changesPPT || ''} onChange={(e) => handleBillingChange(row.rowId, 'changesPPT', e.target.value)} />
                      </td>
                      <td style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.changesCode || ''} onChange={(e) => handleBillingChange(row.rowId, 'changesCode', e.target.value)} />
                      </td>

                      <td style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.dupReport || ''} onChange={(e) => handleBillingChange(row.rowId, 'dupReport', e.target.value)} />
                      </td>
                      <td style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.dupPPT || ''} onChange={(e) => handleBillingChange(row.rowId, 'dupPPT', e.target.value)} />
                      </td>
                      <td style={{padding: '0', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-hover)'}}>
                        <input type="number" onFocus={(e) => e.target.style.background='var(--bg-color)'} onBlur={(e) => e.target.style.background='transparent'} style={inputStyle} value={bd.dupCode || ''} onChange={(e) => handleBillingChange(row.rowId, 'dupCode', e.target.value)} />
                      </td>

                      <td style={{padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center', fontWeight: 'bold'}}>{totalWords}</td>
                      <td style={{padding: '0', border: '1px solid var(--border-color)'}}>
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
          body * { visibility: hidden; }
          .printable-sheet, .printable-sheet * { visibility: visible; }
          .printable-sheet { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            overflow: visible !important;
          }
          table { width: 100% !important; min-width: 100% !important; border: 1px solid #000 !important; }
          th, td { border: 1px solid #000 !important; color: #000 !important; }
          input { border: none !important; color: #000 !important; }
          thead tr { background: #35694f !important; -webkit-print-color-adjust: exact; }
          .btn { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default BillingSheet;
