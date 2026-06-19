require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_TOKEN;
const CANAL_CHAT_ID = process.env.CANAL_CHAT_ID;

// Ruta para recibir los mensajes de Telegram (Webhook)
app.post('/telegram-webhook', async (req, res) => {
    const update = req.body;

    // Verificamos si hay un mensaje y si es el comando /start
    if (update.message && update.message.text === '/start') {
        const chatId = update.message.chat.id;

        const mensajeBienvenida = "¡Hola! Bienvenido al bot. Realiza tu pago desde el siguiente enlace para obtener acceso.";
        
        // Enviar respuesta a Telegram
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: mensajeBienvenida
        });
    }

    return res.sendStatus(200);
});

// Ruta para recibir las notificaciones de Mercado Pago
app.post('/mp-webhook', async (req, res) => {
    const data = req.body;

    // Tu servidor escuchará cuando el pago sea exitoso o aprobado
    if (data.action === 'payment.created' || data.type === 'payment') {
        try {
            // Genera el enlace de invitación para el canal de Telegram
            const inviteResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/createChatInviteLink`, {
                chat_id: CANAL_CHAT_ID,
                member_limit: 1 // Límite de un solo uso
            });

            const inviteLink = inviteResponse.data.result.invite_link;

            // Aquí deberías enviar el `inviteLink` al usuario que realizó el pago.
            console.log("Enlace de acceso generado:", inviteLink);

        } catch (error) {
            console.error('Error al generar enlace de Telegram:', error.response?.data || error.message);
        }
    }

    return res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
