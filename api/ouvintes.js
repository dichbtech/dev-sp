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
        // Dá 3 segundos para o loop procurar a música antes de desistir e fechar a conexão
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`https://api.zeno.fm/mounts/metadata/subscribe/${STATION_ID}`, {
            headers: { 'Accept': 'text/event-stream' },
            signal: controller.signal
        });

        let song = "Ao Vivo";

        if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            try {
                // Fica lendo todos os pacotes que chegam no fluxo
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    
                    // Procura especificamente a tag streamTitle no meio do código que a Zeno jorra
                    const match = text.match(/"streamTitle"\s*:\s*"([^"]+)"/);
                    
                    if (match && match[1]) {
                        if (match[1] !== "Unknown") {
                            song = match[1];
                        }
                        // Achou a música! Quebra o loop na hora para economizar recursos da Vercel.
                        break; 
                    }
                }
            } catch (readError) {
                // O timeout de 3 segundos cai aqui silenciosamente para não travar o servidor
            } finally {
                clearTimeout(timeoutId);
                controller.abort(); 
            }
        }

        return res.status(200).json({ musica: song });

    } catch (error) {
        return res.status(200).json({ musica: "Ao Vivo" });
    }
}