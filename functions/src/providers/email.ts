import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer'
import * as moment from 'moment';

import { findPriority } from '../shared/models/priority';

const APP_NAME = 'Busy Bees';

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

const priorityGroups = (project, summary, executions, dateReference, originalPriorities) => {
  const priorities = { ...originalPriorities };
  for (const priorityKey of Object.keys(priorities)) {
      priorities[priorityKey].name = priorities[priorityKey].key;
      priorities[priorityKey].executions = [];
  }
  for (const execution of executions) {
    const priority = findPriority(execution.priority, priorities);
    if (priority) {
      priority.executions.push(execution);
    } else {
      if (!priorities["___NONE___"])
        priorities["___NONE___"] = { name: "Não Definida", executions: [] };
      priorities["___NONE___"].executions.push(execution);
    }
  }
  for (const priorityKey of Object.keys(priorities)) {
    if (priorities[priorityKey].executions.length === 0) {
      delete priorities[priorityKey];
    }
  }
  return priorities;
}

export const sendMonthEmail = (project, summary, executions, dateReference, priorities) => {
  const groups = priorityGroups(project, summary, executions, dateReference, priorities);
  const html = `<html><body>
    <div>
      <h2>Detalhado</h2>
      <ul>
        ${executions.map(execution => `<li>${execution.date} - ${execution.description} => ${execution.hours} ===> ${execution.participant}</li>`).join("\r\n")}
      </ul>
      <h2>Por Prioridade</h2>
      ${Object.keys(groups).map(groupKey => (`
      <h3>${groups[groupKey].name}</h3>
      <ul>
        ${groups[groupKey].executions.map(execution => `<li>${execution.date} - ${execution.description} => ${execution.hours}</li>`).join("\r\n")}
      </ul>
      <div>
        Total Horas: ${summary.priorities[groupKey].done.hours}
        <br/>
        $ Custo: ${summary.priorities[groupKey].done.spent}
        <br/>
        $ Faturado: ${summary.priorities[groupKey].done.earned}
      </div>
      `)).join("\r\n")}
      
      <h2>Totais</h2>
      <div>
        Total Horas: ${summary.done.hours}
        <br/>
        $ Custo: ${summary.done.spent}
        <br/>
        $ Faturado: ${summary.done.earned}
      </div>
    </div>
  </body></html>`;
  return sendEmail('hrangel@nucleo.house', html, `${project.name} - ${moment(dateReference).format('YYYY-MM')}`)
};

export function sendEmail(toEmail, htmlBody, subject) {
  const mailOptions : any = {
    from: `${APP_NAME} <noreply@firebase.com>`,
    to: toEmail,
  };

  // The user subscribed to the newsletter.
  mailOptions.subject = subject;
  mailOptions.html = htmlBody;
  return mailTransport.sendMail(mailOptions);
}