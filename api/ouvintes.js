export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const response = await fetch('http://uk19freenew.listen2myradio.com:37504/status-json.xsl', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (response.ok) {
            const data = await response.json();
            let listeners = 0;
            let song = "Ao Vivo";

            if (data.icestats && data.icestats.source) {
                const source = Array.isArray(data.icestats.source) ? data.icestats.source[0] : data.icestats.source;
                listeners = source.listeners || 0;
                song = source.title || "Ao Vivo";
            }
            
            return res.status(200).json({ ouvintes: listeners, musica: song });
        }
        throw new Error('Falha ao obter status');
    } catch (error) {
        return res.status(200).json({ ouvintes: 0, musica: "Offline" });
    }
}