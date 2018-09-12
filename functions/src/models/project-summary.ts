export interface ISummaryStatus {
  difficulty: number;
  hours: number;
  spent: number;
  earned: number;
}

export class SummaryStatus implements ISummaryStatus{
  difficulty: number = 0;
  hours: number = 0;
  spent: number = 0;
  earned: number = 0;
}

export class Summary {
  done: SummaryStatus = new SummaryStatus();
  planned: SummaryStatus = new SummaryStatus;
  total: SummaryStatus = new SummaryStatus;
}
export class ProjectSummary extends Summary {
  participants: { [participant: string]: Summary } = {};

  todoDifficulty: number = 0;
  difficultyProgress: number = 0;
  availableAmount: number = 0;
  spentProgress: number = 0;

  missingEarnings: number = 0;
  earnedProgress: number = 0;
}

export const getExecutionEarnPrice = (execution, participant, project) => {
  if (execution.price) {
    return execution.price;
  } else if (participant && participant.hour_price) {
    return execution.hours * participant.hour_price;
  } else {
    return execution.hours * project.hour_price;
  }
}

export const getExecutionSpentPrice = (execution, participant, project) => {
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

export const newProjectSummary = () : ProjectSummary => new ProjectSummary();
export const newItemSummary = () : Summary => new Summary();