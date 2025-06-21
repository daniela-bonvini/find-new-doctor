import {
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import {
  HttpClient,
  HttpClientModule,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  extractDoctorsData,
  loadDoctorsFromFile,
} from '../utils/extract-doctors.util';
import { Doctor } from '../models/doctor.model';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule, MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.css'],
  imports: [
    HttpClientModule,
    CommonModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSortModule,
  ],
})
export class DataTableComponent implements OnInit, AfterViewInit {
  htmlContent: SafeHtml = '';
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  doctors = signal<Doctor[]>([]);
  dataSource = new MatTableDataSource<Doctor>([]);
  displayedColumns: string[] = [];
  columnLabels: { [key: string]: string } = {};
  columnFilters: { [key: string]: string } = {};

  @ViewChild(MatSort) sort!: MatSort;

  constructor() {
    // Setup filtro personalizzato
    this.dataSource.filterPredicate = this.createFilter();
  }

  ngOnInit(): void {
    loadDoctorsFromFile()
      .then((doctors) => {
        console.log('Data loaded:', doctors);
        this.doctors.set(doctors);
        this.dataSource.data = doctors;
        this.setupDynamicColumns(doctors);
      })
      .catch((error) => {
        console.error('Failed to load doctors:', error);
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.setupSorting();
  }

  private setupSorting(): void {
    // Configura il sorting personalizzato per gestire i valori tradotti
    this.dataSource.sortingDataAccessor = (
      data: Doctor,
      sortHeaderId: string
    ): string => {
      const value = this.getCellValue(data, sortHeaderId);
      console.log(`Sorting ${sortHeaderId}:`, value); // Debug log
      return value.toLowerCase();
    };

    // Ascolta i cambiamenti di ordinamento
    if (this.sort) {
      this.sort.sortChange.subscribe(() => {
        console.log('Sort changed:', this.sort.active, this.sort.direction);
      });
    }
  }

  private createFilter(): (data: Doctor, filter: string) => boolean {
    return (data: Doctor, filter: string): boolean => {
      if (!filter) return true;

      try {
        const searchTerms = JSON.parse(filter);

        return this.displayedColumns.every((column) => {
          const columnFilter = searchTerms[column];
          if (!columnFilter) return true;

          const cellValue = this.getCellValue(data, column).toLowerCase();
          return cellValue.includes(columnFilter.toLowerCase());
        });
      } catch (error) {
        console.error('Error parsing filter:', error);
        return true;
      }
    };
  }

  applyFilter(column: string, event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.columnFilters[column] = filterValue;

    this.dataSource.filter = JSON.stringify(this.columnFilters);
  }

  clearAllFilters(): void {
    this.columnFilters = {};
    this.dataSource.filter = '';
    // Reset anche il sorting
    if (this.sort) {
      this.sort.sort({ id: '', start: 'asc', disableClear: false });
    }
  }

  clearColumnFilter(column: string): void {
    delete this.columnFilters[column];
    this.dataSource.filter = JSON.stringify(this.columnFilters);
  }

  private setupDynamicColumns(doctors: Doctor[]): void {
    if (doctors.length > 0) {
      // Estrai tutte le chiavi possibili dal primo oggetto
      const allKeys = this.getAllKeys(doctors[0]);

      // Filtro per escludere chiavi complesse come 'contacts'
      this.displayedColumns = allKeys.filter(
        (key) =>
          key !== 'contacts' &&
          key !== 'schedule' &&
          typeof doctors[0][key as keyof Doctor] !== 'object'
      );

      // Crea etichette più leggibili per le colonne
      this.columnLabels = {
        name: 'Nome',
        type: 'Tipo',
        address: 'Indirizzo',
        city: 'Città',
        area: 'Area',
        availability: 'Disponibilità',
        association: 'Associazione',
        group: 'Gruppo',
        network: 'Rete',
      };
    }
  }

  private getAllKeys(obj: any): string[] {
    const keys: string[] = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || this.capitalizeFirst(column);
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getCellValue(doctor: Doctor, column: string): string {
    const value = (doctor as any)[column];

    // Gestione speciale per availability
    if (column === 'availability') {
      switch (value) {
        case 'available':
          return 'Disponibile';
        case 'full':
          return 'Completo';
        case 'limited':
          return 'Limitata';
        default:
          return value || '';
      }
    }

    return value || '';
  }

  getStatusClass(doctor: Doctor, column: string): string {
    if (column === 'availability') {
      return `status-${doctor.availability}`;
    }
    return '';
  }

  getContactsDisplay(doctor: Doctor): string {
    const contacts = [];
    if (doctor.contacts.phone) contacts.push(`Tel: ${doctor.contacts.phone}`);
    if (doctor.contacts.email) contacts.push(`Email: ${doctor.contacts.email}`);
    return contacts.join(' | ');
  }

  getSortingInfo(): string {
    if (!this.sort?.active) {
      return 'Nessun ordinamento applicato';
    }

    const columnLabel = this.getColumnLabel(this.sort.active);
    const direction =
      this.sort.direction === 'asc' ? 'crescente' : 'decrescente';
    return `Ordinato per ${columnLabel} (${direction})`;
  }
}
