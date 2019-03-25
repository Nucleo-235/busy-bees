import * as moment from 'moment';

import { findPriority } from './priority';

export class Execution {
  key: string = null;
  hours: number = null;
  dateValue: number = null;

  date: moment.Moment|Date|string = null;
  difficulty: number = null;
  description: string = '';
  participant: string = null;
  planned: Boolean = false;
  priority: string = null;

  cost: number = null;
  price: number = null;
  custom_hour_value: number = null;
  custom_hour_cost: number = null;

  getSpentPrice = (participant, project) => {
    const execution = this;
    if (execution.cost) {
      return execution.cost;
    } else if (execution.custom_hour_value) {
      return execution.hours * execution.custom_hour_cost;
    } else if (participant) {
      return execution.hours * participant.hour_value;
    } else {
      return 0;
    }
  }

  getEarnPrice = (participant, project, prioritiesMap) => {
    const execution = this;
    if (execution.price) {
      return execution.price;
    } else {
      const priority = findPriority(execution.priority, prioritiesMap);
      if (priority) {
        return execution.hours * priority.hour_price;
      } else if (participant && participant.hour_price) {
        return execution.hours * participant.hour_price;
      } else {
        return execution.hours * project.hour_price;
      }
    }
  }
}

export class CalculatedExecution extends Execution {
  spent: number;
  earned: number;
}