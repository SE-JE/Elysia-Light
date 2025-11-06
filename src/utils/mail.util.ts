import { readFileSync } from "fs";
import { join } from "path";
import nodemailer, { SentMessageInfo } from "nodemailer";



export interface SendMailOptions {
  to            :  string;
  subject       :  string;
  html         ?:  string;
  text         ?:  string;
  attachments  ?:  {
    filename    :  string;
    path        :  string;
  }[];
}



// =============================>
// ## Mail: Send mail 
// =============================>
export async function sendMail(options: {
  to            :  string;
  subject       :  string;
  text         ?:  string;
  html         ?:  string;
  attachments  ?:  { filename: string; path: string }[];
}) {
  const transporter = nodemailer.createTransport({
    host    :  process.env.MAIL_HOST,
    port    :  Number(process.env.MAIL_PORT),
    secure  :  Number(process.env.MAIL_PORT) === 465,
    auth    :  {
      user  :  process.env.MAIL_USERNAME,
      pass  :  process.env.MAIL_PASSWORD,
    },
  });

  const info = (await transporter.sendMail({
    from         :  `${process.env.MAIL_FROM_NAME || process.env.APP_NAME} <${process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME}>`,
    to           :  options.to,
    subject      :  options.subject,
    text         :  options.text,
    html         :  options.html,
    attachments  :  options.attachments,
  })) as SentMessageInfo;

  console.log("✅ Email terkirim:", info.messageId);
  return info;
}



// =============================>
// ## Mail: Render mail template 
// =============================>
export function renderMailTemplate(template: string, options: Record<string, string>) {
  const templateDir = join(import.meta.dir, "./../mails/templates");

  const contentPath = join(templateDir, `${template}.stub`);
  let content = readFileSync(contentPath, "utf-8");

  for (const [key, value] of Object.entries(options)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    content = content.replace(regex, value);
  }

  let layout = readFileSync(join(templateDir, "layout.stub"), "utf-8");

  const globalVars = {
    ...options,
    date: "20-10-2025",
    app_name: process.env.APP_NAME || "",
  };

  for (const [key, value] of Object.entries(globalVars)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    layout = layout.replace(regex, value);
  }

  layout = layout.replace("{{content}}", content);

  return layout;
}