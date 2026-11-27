'use strict';

/** Developer contact card with URL buttons and a text fallback. */
async function executeDeveloperContact(command, context) {
    const { sock: devtrust, msg: m, prepareWAMessageMedia, WHATSAPP_OWNER_NUMBER } = context;
    switch (command) {
                    case 'developercontact':
                    case 'devcontact': {
                        const developerImages = [
                            'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid.jpg',
                            'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid1.jpg',
                            'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid2.jpg',
                            'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid3.jpg'
                        ];
                        const developerImage = developerImages[Math.floor(Math.random() * developerImages.length)];
        
                        try {
                            const media = await prepareWAMessageMedia(
                                { image: { url: developerImage } },
                                { upload: devtrust.waUploadToServer }
                            );
        
                            await devtrust.relayMessage(m.chat, {
                                interactiveMessage: {
                                    header: {
                                        title: "👨‍💻 𝐌𝐑 𝐓𝐎𝐇𝐈𝐃",
                                        subtitle: "TOHID-AI DEVELOPER",
                                        hasMediaAttachment: true,
                                        ...media
                                    },
                                    body: {
                                        text: "✨ *MR TOHID — DEVELOPER*\n\n🤖 Building TOHID-AI and WhatsApp automation projects.\n⚡ Bot Developer • AI Projects • Automation\n🛠️ Creating and maintaining TOHID-AI."
                                    },
                                    nativeFlowMessage: {
                                        buttons: [
                                            {
                                                name: "cta_url",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: "📸 INSTAGRAM",
                                                    url: "https://instagram.com/Tohidkhan6332",
                                                    merchant_url: "https://instagram.com/Tohidkhan6332"
                                                })
                                            },
                                            {
                                                name: "cta_url",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: "✈️ TELEGRAM",
                                                    url: "https://t.me/Tohidkhan6332",
                                                    merchant_url: "https://t.me/Tohidkhan6332"
                                                })
                                            },
                                            {
                                                name: "cta_url",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: "💻 GITHUB",
                                                    url: "https://github.com/Tohidkhan6332",
                                                    merchant_url: "https://github.com/Tohidkhan6332"
                                                })
                                            },
                                            {
                                                name: "cta_url",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: "📱 WHATSAPP",
                                                    url: "https://wa.me/" + WHATSAPP_OWNER_NUMBER,
                                                    merchant_url: "https://wa.me/" + WHATSAPP_OWNER_NUMBER
                                                })
                                            }
                                        ]
                                    }
                                }
                            }, {});
                        } catch (err) {
                            console.log("❌ ERROR DEVELOPER CONTACT:", err);
                            await devtrust.sendMessage(m.chat, {
                                text: "👨‍💻 *MR TOHID — DEVELOPER*\n\n🤖 TOHID-AI Developer & Bot Creator\n\n📸 Instagram: https://instagram.com/Tohidkhan6332\n✈️ Telegram: https://t.me/Tohidkhan6332\n💻 GitHub: https://github.com/Tohidkhan6332\n📱 WhatsApp: https://wa.me/" + WHATSAPP_OWNER_NUMBER
                            }, { quoted: m });
                        }
                    }
                    break;
        default:
            return false;
    }
}

module.exports = { executeDeveloperContact };
