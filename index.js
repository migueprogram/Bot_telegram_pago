require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_TOKEN;
const CANAL_CHAT_ID = process.env.CANAL_CHAT_ID;

// Configuración oficial del SDK de Mercado Pago
const client = new MercadoPagoConfig({ accessToken: MERCADO_PAGO_TOKEN });
const preference = new Preference(client);

// Ruta para recibir los mensajes de Telegram (Webhook)
app.post('/telegram-webhook', async (req, res) => {
    const update = req.body;

    // Verificamos si hay un mensaje y si es el comando /start
    if (update.message && update.message.text === '/start') {
        const chatId = update.message.chat.id;

        const mensajeBienvenida = "¡Hola! Bienvenido al bot. Para obtener acceso al canal VIP, por favor realiza tu pago. En caso de que no se te entregue tu link de acceso después de 5 minutos, manda tu comprobante de pago a soporte @Chico_programador_x. En cuanto esté disponible, se revisará y se comparará con el historial de pagos para poder validar y entregarte tu link de acceso al canal.Si vienes a renovar solo usa el comando /start para generar una nueva linea de captura y se te pueda validar otra vez el pago";
        
        try {
            // 1. Enviamos el mensaje de bienvenida a Telegram
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: mensajeBienvenida
            });

            // 2. Generamos la liga de pago automáticamente en Mercado Pago
            const response = await preference.create({
                body: {
                    items: [
                        {
                            title: 'Acceso a Canal VIP Telegram',
                            unit_price: 5.00, // Puedes cambiar el precio aquí
                            quantity: 1,
                        }
                    ],
                    external_reference: chatId.toString(), // Guardamos el ID del usuario
                    back_urls: {
                        success: "https://t.me/chico_programador_vip_bot"
                    },
                    auto_return: "approved"
                }
            });

            const linkPago = response.init_point;

            // 3. Enviamos el link de pago abajo del mensaje de bienvenida
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `Haz clic en el siguiente enlace para realizar tu pago:\n${linkPago}`
            });

        } catch (error) {
            console.error('Error al generar la preferencia de pago:', error);
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: 'Hubo un error al generar el enlace de pago automático. Intenta más tarde.'
            });
        }
    }

    return res.sendStatus(200);
});

// Ruta para recibir las notificaciones o webhooks de Mercado Pago
app.post('/mp-webhook', async (req, res) => {
    const data = req.body;
    console.log("Notificación MP recibida:", JSON.stringify(data));

    // Extraemos el ID del recurso o del pago de la notificación
    const paymentId = data.data ? data.data.id : (data.id || data.resource?.id);

    if (paymentId) {
        try {
            // Consultamos el estado real del pago mediante la API de Mercado Pago
            const paymentResponse = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`
                }
            });

            const paymentStatus = paymentResponse.data.status;
            const userId = paymentResponse.data.external_reference;

            console.log(`Estatus del pago ${paymentId}: ${paymentStatus} - Usuario: ${userId}`);

            // Verificamos que el pago esté aprobado y exista la referencia del usuario
            if (paymentStatus === 'approved' && userId) {
                // Genera el enlace de invitación de un solo uso para el canal de Telegram
                const inviteResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/createChatInviteLink`, {
                    chat_id: CANAL_CHAT_ID,
                    member_limit: 1 // Límite de un solo uso
                });

                const inviteLink = inviteResponse.data.result.invite_link;

                // Envía el link de acceso por Telegram al usuario que pagó
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: userId,
                    text: `¡Pago exitoso! Aquí tienes tu enlace de acceso al canal:\n${inviteLink}`
                });
            }

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
