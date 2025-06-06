import { Injectable } from "@angular/core";

@Injectable({providedIn: 'root'})
export class ExportService {
  exportJSON(json: {}, filename: string): void {
    this.export(new Blob([JSON.stringify(json)], {type: 'application/json;charset=utf-8;'}), filename);
  }

  exportCSV(headers: string[], data: (string | undefined)[][], filename: string): void {
    const header = `${headers.join(';')}\n`;
    const csvData = data.map(row => row.map(col => this.csvEntry(col || '')).join(';')).join('\n');
    this.export(new Blob(['\ufeff' + header + csvData], {type: 'text/csv;charset=utf-8;'}), filename);
  }

  private csvEntry(input: string): string {
    return `"${input.replaceAll('"', '""')}"`;
  }

  private export(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
