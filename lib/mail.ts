"use server"
// lib/mail.js
import nodemailer from "nodemailer"; // eslint-disable-line import/no-unresolved

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export async function sendEmailAviso(pedidoid: Number) {
  const mailOptions = {
    from: `"Uzcudun Coffee & Ride" <bitiadev@gmail.com>`,
    to: "uzcuduncoffeeride@gmail.com",
    subject: "Pedido recibido",
    html: `
    <html>
      <head>
        <title>Uzcudun Coffee & Ride / Pedido recibido</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;" >
        <div style="background-color: #a1c5b2; color: rgb(39, 39, 39); text-align: center; padding: 20px; border-radius: 5px 5px 0 0;">
          <h1>Uzcudun Coffee & Ride - Pedido recibido</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
          <p>Nuevo pedido recibido</p>

          <p>
            Ha recibido un nuevo pedido en la tienda online. Haga clic en el botón de abajo para ver los detalles del pedido.
          </p>
          <a
            href="https://uzcuduncoffeeride.com.ar/admin/orders/${pedidoid}"
            style="display: inline-block; background-color: #3b7945; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; cursor: pointer;"
          >
            <span style="color: white;">Ver pedido</span>
          </a>

          <p>Atentamente,<br />El equipo de Uzcudun Coffee & Ride</p>
        </div>
      </body>
    </html>
    `,
  };

  await transporter.sendMail(mailOptions);
}
