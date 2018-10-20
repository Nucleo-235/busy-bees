"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Participant {
}
exports.Participant = Participant;
function getParticipants(hiveParticipants, projectParticipants) {
    const map = {};
    const participantsKeys = Object.keys(projectParticipants);
    for (const participantKey of participantsKeys) {
        const participant = new Participant();
        participant.name = participantKey;
        if (hiveParticipants[participantKey])
            Object.assign(participant, Object.assign({}, hiveParticipants[participantKey]));
        const projectParticipant = projectParticipants[participantKey];
        if (projectParticipant && projectParticipant !== true)
            Object.assign(participant, projectParticipants[participantKey]);
        map[participant.name] = participant;
    }
    return map;
}
exports.getParticipants = getParticipants;
//# sourceMappingURL=project.js.map