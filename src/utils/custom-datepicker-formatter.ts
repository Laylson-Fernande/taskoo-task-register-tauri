import { Injectable } from '@angular/core';
import { NgbDateParserFormatter, NgbDateStruct, NgbDatepickerI18n } from '@ng-bootstrap/ng-bootstrap';

const I18N_VALUES = {
  'pt': {
    weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    months: [
      'Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.',
      'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'
    ]
  }
};

@Injectable()
export class CustomDateParserFormatter extends NgbDateParserFormatter {

  format(date: NgbDateStruct | null): string {
    return date ? `${this.pad(date.day)}/${this.pad(date.month)}/${date.year}` : '';
  }

  parse(value: string): NgbDateStruct | null {
    if (value) {
      const dateParts = value.trim().split('/');
      if (dateParts.length === 3) {
        return { day: +dateParts[0], month: +dateParts[1], year: +dateParts[2] };
      }
    }
    return null;
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }
}

@Injectable()
export class CustomDatepickerI18n extends NgbDatepickerI18n {

  getWeekdayShortName(weekday: number): string {
    return I18N_VALUES['pt'].weekdays[weekday - 1];
  }

  getMonthShortName(month: number): string {
    return I18N_VALUES['pt'].months[month - 1];
  }

  getMonthFullName(month: number): string {
    return I18N_VALUES['pt'].months[month - 1];
  }

  getDayAriaLabel(date: NgbDateStruct): string {
    return `${date.day}-${date.month}-${date.year}`;
  }

  getWeekdayLabel(weekday: number): string {
    return this.getWeekdayShortName(weekday);
  }

}
