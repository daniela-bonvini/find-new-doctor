import { Component } from '@angular/core';
import { DataTableComponent } from './data-table/data-table';

@Component({
  selector: 'app-root',
  imports: [ DataTableComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'find-new-doctor';
}
