import { findPriority } from './priority';

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
  priorities: { [priority: string]: Summary } = {};

  todoDifficulty: number = 0;
  difficultyProgress: number = 0;
  availableAmount: number = 0;
  spentProgress: number = 0;

  missingEarnings: number = 0;
  earnedProgress: number = 0;
}

export const newProjectSummary = () : ProjectSummary => new ProjectSummary();
export const newItemSummary = () : Summary => new Summary();