import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer'
import * as moment from 'moment';;

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

export const sendMonthEmail = (project, summary, executions, dateReference) => {
  const html = `<html><body>
    <div>
      <h2>Por Participante</h2>
      <ul>
        ${executions.map(execution => `<li>${execution.date} - ${execution.description} => ${execution.hours} ===> ${execution.participant}</li>`).join("\r\n")}
      </ul>
      <h2>Geral</h2>
      <ul>
        ${executions.map(execution => `<li>${execution.date} - ${execution.description} => ${execution.hours}</li>`).join("\r\n")}
      </ul>
      <div>
        Total Horas: ${summary.done.hours}
        <br/>
        $ Total (spent): ${summary.done.spent}
        <br/>
        # Total (earned): ${summary.done.earned}
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