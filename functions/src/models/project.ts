export interface IParticipant {
  hour_value: number;
  name: string;
}

export class Participant implements IParticipant {
  hour_value: number;
  hour_price: number;
  name: string;
}

export type ParticipantMap = { [particpants: string]: IParticipant; }
export function getParticipants(hiveParticipants, projectParticipants) : ParticipantMap {
  const map = { };
  const participantsKeys = Object.keys(projectParticipants);
  for (const participantKey of participantsKeys) {
    const participant = new Participant();
    participant.name = participantKey;
    if (hiveParticipants[participantKey])
      Object.assign(participant, { ...hiveParticipants[participantKey] });

    const projectParticipant = projectParticipants[participantKey];
    if (projectParticipant && projectParticipant !== true)
      Object.assign(participant, projectParticipants[participantKey]);

    map[participant.name] = participant;
  }
  return map;
}

export function getPriorities(hivePriorities, projectPriorities) {
  const priorities = Object.assign({}, hivePriorities || {}, projectPriorities || {});
  for (const priorityKey of Object.keys(priorities)) {
    priorities[priorityKey].key = priorityKey;
  }
  return priorities;
}

export const findPriority = (itemPriority, priorities) => {
  if (itemPriority && priorities[itemPriority]) {
    return priorities[itemPriority];
  }
  let defaultPriority = null;
  for (const priorityKey of Object.keys(priorities)) {
    const currentPriority = priorities[priorityKey];
    if (!defaultPriority || currentPriority.hour_price < defaultPriority.hour_price)
      defaultPriority = priorities[priorityKey];
  }
  return defaultPriority;
}