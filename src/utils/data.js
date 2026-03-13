import { addHours, addDays } from 'date-fns';

const now = new Date();

export const dummyTasks = [
  {
    id: '1',
    title: 'Review Literature: Burnout',
    type: 'Assignment',
    deadline: addHours(now, 2).toISOString(),
    wordCountTarget: 500,
    notes: 'Focus on recent papers from 2020 onwards.',
    aiTool: 'ChatGPT',
    linkedAccount: 'Account A',
    isCompleted: false,
    parts: []
  },
  {
    id: '2',
    title: 'Draft Introduction',
    type: 'Assignment',
    deadline: addHours(now, 12).toISOString(),
    wordCountTarget: 800,
    notes: 'Include definitions of key terms.',
    aiTool: 'Claude',
    linkedAccount: 'Account B',
    isCompleted: false,
    parts: []
  },
  {
    id: '5001',
    title: 'ticket 4832 - Coastal Tourism and Climate Change',
    type: 'Dissertation',
    deadline: addDays(now, 17).toISOString(), 
    wordCountTarget: 10000,
    notes: 'Main Dissertation Timeline based on the approved proposal.',
    aiTool: 'None',
    linkedAccount: 'Account A',
    isCompleted: false,
    parts: [
      { id: 'p1', title: 'Chapter 1', deadline: addDays(now, -2).toISOString(), isCompleted: false },
      { id: 'p2', title: 'Chapter 2 and 3', deadline: addDays(now, 5).toISOString(), isCompleted: false },
      { id: 'p3', title: 'Final Review', deadline: addDays(now, 17).toISOString(), isCompleted: false }
    ]
  },
  {
    id: '5002',
    title: 'ticket 4420 - Machine Learning in Healthcare',
    type: 'Dissertation',
    deadline: addDays(now, 25).toISOString(), 
    wordCountTarget: 15000,
    notes: 'Focus on diagnostic algorithms.',
    aiTool: 'ChatGPT',
    linkedAccount: 'Account C',
    isCompleted: false,
    parts: [
      { id: 't4420_p1', title: 'Literature Review', deadline: addDays(now, 3).toISOString(), isCompleted: false },
      { id: 't4420_p2', title: 'Methodology & Data Collection', deadline: addDays(now, 10).toISOString(), isCompleted: false },
      { id: 't4420_p3', title: 'Model Training', deadline: addDays(now, 18).toISOString(), isCompleted: false },
      { id: 't4420_p4', title: 'Results & Conclusion', deadline: addDays(now, 25).toISOString(), isCompleted: false }
    ]
  }
];

export const getTaskColorCode = (item, type, currentDate = new Date()) => {
  if (item.isCompleted) return 'gray';

  const deadline = new Date(item.deadline);
  const diffTime = deadline.getTime() - currentDate.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffHours < 0) return 'purple'; // Overdue

  if (type === 'Assignment' || type === 'Part') {
    if (diffHours < 3) return 'red';
    if (diffHours < 24) return 'yellow';
    return 'green';
  } else if (type === 'Dissertation') {
    if (diffDays < 3) return 'red';
    if (diffDays < 7) return 'yellow';
    return 'green';
  }
  return 'green';
};
