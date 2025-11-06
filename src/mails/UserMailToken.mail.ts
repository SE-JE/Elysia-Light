import { renderMailTemplate, sendMail } from "@utils"

export async function UserMailToken(user: Record<string, any>, token: string) {
  const content = renderMailTemplate("user-mail-token", {
      title: "Verifikasi E-mail",
      ...user,
      token,
  })

  const send = await sendMail({
      subject: "Email Verification",
      to: user?.email,
      html: content
  })
  
  return send;
}
