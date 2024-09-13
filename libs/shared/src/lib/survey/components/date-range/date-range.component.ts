import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Required for ngModel
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';

/**
 * Component for displaying the date range question
 */
@Component({
  selector: 'shared-date-range',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './date-range.component.html',
  styleUrls: ['./date-range.component.scss'],
  providers: [DatePipe],
})
export class DateRangeComponent implements OnInit {
  /** Date minimum of the range */
  @Input() dateMin!: string; // Format: 'YYYY-MM-DD'
  /** Date maximum of the range */
  @Input() dateMax!: string; // Format: 'YYYY-MM-DD'
  /** Data to display on the date range */
  @Input() data!: string;
  /** Output for the date change */
  @Output() dateChange = new EventEmitter<string>();
  /** Max value for the range question */
  public max = 1;
  /** Range question value */
  public rangeValue = 1;

  /**
   * Component for displaying the date range question
   *
   * @param datePipe Angular date pipe
   */
  constructor(private datePipe: DatePipe) {}

  ngOnInit() {
    this.buildDateRange();
  }

  /** build date range question */
  private buildDateRange() {
    const dateMinFormatted = new Date(this.dateMin); // Parse the ISO string to a Date object
    const dateMinMilliseconds = dateMinFormatted.getTime(); // Get the time in milliseconds since the Unix epoch
    const dateMinMinutes = Math.floor(dateMinMilliseconds / (1000 * 60)); // Convert milliseconds to minutes

    const dateMaxFormatted = new Date(this.dateMax); // Parse the ISO string to a Date object
    const dateMaxMilliseconds = dateMaxFormatted.getTime(); // Get the time in milliseconds since the Unix epoch
    const dateMaxMinutes = Math.floor(dateMaxMilliseconds / (1000 * 60)); // Convert milliseconds to minutes

    // set the max value for the range input taking account the window of dates in dateMin and dateMax
    this.max = (dateMaxMinutes - dateMinMinutes) / (60 * 24); // convert to days

    if (this.data) {
      const currentDateFormatted = new Date(this.data); // Parse the ISO string to a Date object
      const currentDateMilliseconds = currentDateFormatted.getTime(); // Get the time in milliseconds since the Unix epoch
      const currentDateMinutes = Math.floor(
        currentDateMilliseconds / (1000 * 60)
      ); // Convert milliseconds to minutes
      // set the value in the range input too
      this.rangeValue = (currentDateMinutes - dateMinMinutes) / (60 * 24); // convert to days
    }
  }

  /** On change range */
  public onRangeChange() {
    // format date min
    const dateMinFormatted = new Date(this.dateMin);
    // add range to the date
    dateMinFormatted.setDate(dateMinFormatted.getDate() + this.rangeValue);
    // transform to the format yyyy-MM-dd
    this.data = this.datePipe.transform(dateMinFormatted, 'yyyy-MM-dd') ?? '';
    // emit current value
    this.dateChange.emit(this.data);
  }
}
