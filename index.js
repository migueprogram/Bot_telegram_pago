const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Variables que configuraremos de forma segura en Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_TOKEN;
const CANAL_CHAT_ID = process.env.CANAL_CHAT_ID;

// Endpoint para recibir mensajes de Telegram
app.post('/telegram-webhook', async (req, res) => {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text;

    // Comando para solicitar pago
    if (text.startsWith('/pagar')) {
        try {
            // Llama a la API de Mercado Pago para crear la preferencia de cobro
            const mpResponse = await axios.post('https://api.mercadopago.com/v1/preferences', {
                items: [{
                    title: "Acceso a canal exclusivo",
                    quantity: 1,
                    unit_price: 150
                }],
                external_reference: chatId.toString()
            }, {
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            const paymentLink = mpResponse.data.init_point;

            // Envía el link de pago al usuario por Telegram
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `¡Hola! Haz clic en el siguiente enlace para realizar tu pago de $150 y acceder al canal:\n\n${paymentLink}`
            });

        } catch (error) {
            console.error('Error al generar pago:', error.response?.data || error.message);
        }
    }

    res.sendStatus(200);
});

// Endpoint para recibir la notificación de pago de Mercado Pago
app.post('/mp-webhook', async (req, res) => {
    const data = req.body;
    
    // Aquí tu servidor escuchará cuando el pago sea exitoso o aprobado
    if (data.action === 'payment.created' || data.type === 'payment') {
        try {
            // Genera el enlace de invitación para el canal de Telegram
            const inviteResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/createChatInviteLink`, {
                chat_id: CANAL_CHAT_ID,
                member_limit: 1 // Límite de un solo uso
            });

            const inviteLink = inviteResponse.data.result.invite_link;

            // NOTA: Para enviar el link al usuario correcto, se extrae el ID guardado en external_reference.
            // Este es el bloque base para enviar el acceso al usuario que pagó.

        } catch (error) {
            console.error('Error al generar enlace de Telegram:', error.response?.data || error.message);
        }
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
