export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // O seu ID da Zeno.fm capturado do link
    const STATION_ID = "c1ct7nz68f8uv"; 

    try {
        const response = await fetch(`https://tools.zeno.fm/api/station/${STATION_ID}/status`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cache: 'no-store'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.status === "success" && result.data) {
                const info = result.data;
                const listeners = info.listeners || 0;
                
                let song = "Ao Vivo";
                if (info.now_playing) {
                    const artist = info.now_playing.artist || "";
                    const track = info.now_playing.song || "";
                    song = artist && track ? `${artist} - ${track}` : (track || artist || "Ao Vivo");
                }

                return res.status(200).json({ ouvintes: listeners, musica: song });
            }
        }
        
        return res.status(200).json({ ouvintes: 0, musica: "Ao Vivo" });
    } catch (error) {
        console.error("Erro ao conectar com a API da Zeno:", error);
        return res.status(200).json({ ouvintes: 0, musica: "Conectando..." });
    }
}