/**
 * Utility functions for exporting data from the application
 */

export interface ExportOptions {
  format: 'json' | 'csv';
  includeMetadata?: boolean;
}

export function exportToJson(data: any, filename: string = 'export.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCsv(data: any[], filename: string = 'export.csv') {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportProjects(projects: any[], options: ExportOptions = { format: 'json' }) {
  try {
    if (!projects || projects.length === 0) {
      console.warn('No projects to export');
      return;
    }

    const exportData = {
      metadata: options.includeMetadata ? {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        count: projects.length,
      } : undefined,
      projects: projects.map(p => ({
        name: p.name,
        projectKey: p.projectKey,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };

    if (options.format === 'csv') {
      exportToCsv(exportData.projects, `projects-${Date.now()}.csv`);
    } else {
      exportToJson(exportData, `projects-${Date.now()}.json`);
    }
  } catch (error) {
    console.error('Error exporting projects:', error);
    throw error;
  }
}

export function exportWorkflows(workflows: any[], options: ExportOptions = { format: 'json' }) {
  try {
    if (!workflows || workflows.length === 0) {
      console.warn('No workflows to export');
      return;
    }

    const exportData = {
      metadata: options.includeMetadata ? {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        count: workflows.length,
      } : undefined,
      workflows: workflows.map(w => ({
        name: w.name,
        workflowKey: w.workflowKey,
        tags: w.tags,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    };

    if (options.format === 'csv') {
      exportToCsv(exportData.workflows, `workflows-${Date.now()}.csv`);
    } else {
      exportToJson(exportData, `workflows-${Date.now()}.json`);
    }
  } catch (error) {
    console.error('Error exporting workflows:', error);
    throw error;
  }
}

export function exportWebhooks(webhooks: any[], options: ExportOptions = { format: 'json' }) {
  try {
    if (!webhooks || webhooks.length === 0) {
      console.warn('No webhooks to export');
      return;
    }

    const exportData = {
      metadata: options.includeMetadata ? {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        count: webhooks.length,
      } : undefined,
      webhooks: webhooks.map(w => ({
        name: w.name,
        hookKey: w.hookKey,
        routingType: w.routingType,
        isEnabled: w.isEnabled,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    };

    if (options.format === 'csv') {
      exportToCsv(exportData.webhooks, `webhooks-${Date.now()}.csv`);
    } else {
      exportToJson(exportData, `webhooks-${Date.now()}.json`);
    }
  } catch (error) {
    console.error('Error exporting webhooks:', error);
    throw error;
  }
}

export function importFromJson(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function importFromCsv(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          reject(new Error('CSV file must have at least a header and one data row'));
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((header, index) => {
            let value = values[index]?.trim() || '';
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1).replace(/""/g, '"');
            }
            obj[header] = value;
          });
          return obj;
        });

        resolve(data);
      } catch (error) {
        reject(new Error('Failed to parse CSV file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

