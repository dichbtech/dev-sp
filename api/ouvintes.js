export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const STATION_ID = "c1ct7nz68f8uv"; 

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`https://api.zeno.fm/mounts/metadata/subscribe/${STATION_ID}`, {
            headers: { 'Accept': 'text/event-stream' },
            signal: controller.signal
        });

        let song = "Ao Vivo";

        if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            const { value } = await reader.read();
            clearTimeout(timeoutId);
            controller.abort(); 

            if (value) {
                const text = decoder.decode(value);
                const match = text.match(/data:\s*({.*})/);
                if (match && match[1]) {
                    try {
                        const data = JSON.parse(match[1]);
                        if (data.streamTitle && data.streamTitle !== "Unknown") {
                            song = data.streamTitle;
                        }
                    } catch (e) {
                        console.error("Erro ao ler música da Zeno");
                    }
                }
            }
        }

        return res.status(200).json({ musica: song });

    } catch (error) {
        return res.status(200).json({ musica: "Transmissão Automática" });
    }
}