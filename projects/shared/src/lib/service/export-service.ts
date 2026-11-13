import { Service } from "@angular/core";
import * as Papa from "papaparse";

@Service()
export class ExportService {
  exportJSON(json: {}, filename: string): void {
    this.downloadFile(new Blob([JSON.stringify(json)], {type: 'application/json;charset=utf-8;'}), filename);
  }

  exportCSV(headers: string[], data: (string | undefined)[][], filename: string): void {
    const csv = Papa.unparse({fields: headers, data}, {delimiter: ';'});
    this.downloadFile(new Blob(['\ufeff' + csv], {type: 'text/csv;charset=utf-8;'}), filename);
  }

  downloadFile(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
