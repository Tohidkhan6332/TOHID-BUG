'use strict';

const axios = require('axios');

async function tohidImageGen(prompt) {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) throw new Error('Image prompt is empty');

    const providers = [
        {
            name: 'prexzy-genimage',
            model: 'Prexzy GenImage',
            run: async () => axios.get('https://prexzyapis.com/ai/genimage', {
                params: { prompt: cleanPrompt, width: 768, height: 768, steps: 20 },
                timeout: 60000
            })
        },
        {
            name: 'prexzy-dalle',
            model: 'DALL·E 3 XL',
            run: async () => axios.get('https://prexzyapis.com/ai/dalle', {
                params: { prompt: cleanPrompt },
                timeout: 60000
            })
        }
    ];

    const extractUrl = (data) => {
        if (typeof data === 'string' && /^https?:\/\//i.test(data)) return data.trim();
        const values = [
            data?.image_url, data?.imageUrl, data?.url, data?.image,
            data?.result, data?.data?.image_url, data?.data?.imageUrl,
            data?.data?.url, data?.data?.image, data?.data?.result,
            data?.images?.[0], data?.data?.images?.[0],
            data?.result?.image_url, data?.result?.url,
            data?.result?.image?.url
        ];
        for (const value of values) {
            if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
            if (value && typeof value === 'object') {
                const nested = value.url || value.image_url || value.imageUrl;
                if (typeof nested === 'string' && /^https?:\/\//i.test(nested)) return nested;
            }
        }
        return null;
    };

    let lastError;
    for (const provider of providers) {
        try {
            const response = await provider.run();
            const url = extractUrl(response?.data);
            if (!url) throw new Error(provider.name + ' returned no image URL');

            const image = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: { 'User-Agent': 'TOHID-AI' }
            });
            const buffer = Buffer.from(image.data);
            if (buffer.length >= 1024) return { buffer, model: provider.model };
            throw new Error('Image response was empty');
        } catch (error) {
            lastError = error;
            console.error('[AI:IMAGE]', provider.name, error?.message || error);
        }
    }

    throw lastError || new Error('Image generation failed on all providers');
}

module.exports = { tohidImageGen };
