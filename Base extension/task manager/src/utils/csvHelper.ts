import { Project, Comment, SubTask } from '../types';

export const parseCSV = (csvText: string): Project[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const projects: Project[] = [];

  // Simple regex to handle commas inside quotes
  const parseLine = (line: string) => {
    const result = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        result.push(line.substring(start, i).replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        start = i + 1;
      }
    }
    result.push(line.substring(start).replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    return result;
  };

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    if (!currentLine) continue;

    const values = parseLine(currentLine);
    
    // Allow for optional trailing columns if CSV format evolves
    if (values.length < headers.length) continue; 

    const project: any = {};
    headers.forEach((header, index) => {
      let value: any = values[index];
      
      if (header === 'budget') {
        value = parseFloat(value) || 0;
      } else if (header === 'comments' || header === 'subtasks') {
        try {
          value = value ? JSON.parse(value) : [];
        } catch (e) {
          console.warn(`Failed to parse JSON for field ${header}`, e);
          value = [];
        }
      }
      
      project[header] = value;
    });

    // Ensure array fields exist even if missing in CSV
    if (!project.comments) project.comments = [];
    if (!project.subtasks) project.subtasks = [];
    // Ensure startDate exists, fallback to created/dueDate logic if missing in old CSVs
    if (!project.startDate) {
        // Fallback: Default to 30 days before due date if missing
        const d = new Date(project.dueDate);
        d.setDate(d.getDate() - 30);
        project.startDate = d.toISOString().slice(0, 10);
    }

    projects.push(project as Project);
  }

  return projects;
};

export const generateCSV = (projects: Project[]): string => {
  if (projects.length === 0) return '';
  // Defined order including startDate
  const headers = ['id', 'name', 'status', 'priority', 'owner', 'budget', 'startDate', 'dueDate', 'description', 'comments', 'subtasks'];
  const headerRow = headers.join(',');

  const rows = projects.map(p => {
    return headers.map(header => {
      let val = (p as any)[header];
      
      if (header === 'comments' || header === 'subtasks') {
        val = JSON.stringify(val || []);
      }

      const stringVal = String(val === undefined || val === null ? '' : val).replace(/"/g, '""');
      
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal}"`;
      }
      return stringVal;
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};