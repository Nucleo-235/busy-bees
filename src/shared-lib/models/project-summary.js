"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SummaryStatus {
    constructor() {
        this.difficulty = 0;
        this.hours = 0;
        this.spent = 0;
        this.earned = 0;
    }
}
exports.SummaryStatus = SummaryStatus;
class Summary {
    constructor() {
        this.done = new SummaryStatus();
        this.planned = new SummaryStatus;
        this.total = new SummaryStatus;
    }
}
exports.Summary = Summary;
class ProjectSummary extends Summary {
    constructor() {
        super(...arguments);
        this.participants = {};
        this.priorities = {};
        this.todoDifficulty = 0;
        this.difficultyProgress = 0;
        this.availableAmount = 0;
        this.spentProgress = 0;
        this.missingEarnings = 0;
        this.earnedProgress = 0;
    }
}
exports.ProjectSummary = ProjectSummary;
exports.newProjectSummary = () => new ProjectSummary();
exports.newItemSummary = () => new Summary();
//# sourceMappingURL=project-summary.js.map