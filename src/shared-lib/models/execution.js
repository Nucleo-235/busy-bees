"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const priority_1 = require("./priority");
class Execution {
    constructor() {
        this.key = null;
        this.hours = null;
        this.dateValue = null;
        this.date = null;
        this.difficulty = null;
        this.description = '';
        this.participant = null;
        this.planned = false;
        this.priority = null;
        this.cost = null;
        this.price = null;
        this.custom_hour_value = null;
        this.custom_hour_cost = null;
        this.getSpentPrice = (participant, project) => {
            const execution = this;
            if (execution.cost) {
                return execution.cost;
            }
            else if (execution.custom_hour_value) {
                return execution.hours * execution.custom_hour_cost;
            }
            else if (participant) {
                return execution.hours * participant.hour_value;
            }
            else {
                return 0;
            }
        };
        this.getEarnPrice = (participant, project, prioritiesMap) => {
            const execution = this;
            const priority = priority_1.findPriority(execution.priority, prioritiesMap);
            if (priority) {
                return execution.hours * priority.hour_price;
            }
            else if (execution.price) {
                return execution.price;
            }
            else if (participant && participant.hour_price) {
                return execution.hours * participant.hour_price;
            }
            else {
                return execution.hours * project.hour_price;
            }
        };
    }
}
exports.Execution = Execution;
class CalculatedExecution extends Execution {
}
exports.CalculatedExecution = CalculatedExecution;
//# sourceMappingURL=execution.js.map