document.addEventListener("DOMContentLoaded", () => {
    const htmlPadrao = `
    <h1>Política de Privacidade</h1>
    <span class="date">Última atualização: 24 de março de 2026</span>
    
    <p>Esta Política de Privacidade descreve como as informações são tratadas ao utilizar o site: <br><a href="https://dicsp.vercel.app/">https://dicsp.vercel.app/</a></p>
    <p>O objetivo deste site é fornecer uma plataforma simples de feedback para usuários. A privacidade dos visitantes é respeitada e nenhum dado pessoal é coletado além do estritamente necessário para funcionamento da autenticação.</p>
    
    <h2>1. Coleta de Dados</h2>
    <p>Este site não coleta nem solicita dados pessoais diretamente.</p>
    <p>Para permitir o acesso à plataforma, é utilizado o sistema de autenticação do Firebase Authentication, que permite login com conta do Google.</p>
    <p>Durante o processo de autenticação, as seguintes informações podem ser disponibilizadas ao sistema:</p>
    <ul>
      <li>Nome do usuário</li>
      <li>Endereço de e-mail</li>
    </ul>
    <p>Essas informações são fornecidas pelo próprio serviço de autenticação do Google e não são solicitadas manualmente pelo site.</p>

    <h2>2. Uso das Informações</h2>
    <p>As informações obtidas através da autenticação são utilizadas exclusivamente para:</p>
    <ul>
      <li>Permitir o login do usuário no sistema</li>
      <li>Identificar o usuário dentro da aplicação</li>
    </ul>
    <p>Esses dados não são utilizados para:</p>
    <ul>
      <li>marketing</li>
      <li>publicidade</li>
      <li>venda ou compartilhamento com terceiros</li>
      <li>criação de perfis de comportamento</li>
    </ul>

    <h2>3. Armazenamento de Dados</h2>
    <p>Este site não mantém banco de dados próprio com informações pessoais dos usuários.</p>
    <p>As informações utilizadas durante a autenticação são processadas pela infraestrutura do Google por meio do Firebase.</p>

    <h2>4. Hospedagem do Site</h2>
    <p>Este site é hospedado na plataforma GitHub Pages (e agora Vercel), que pode coletar dados técnicos básicos automaticamente, como:</p>
    <ul>
      <li>endereço IP</li>
      <li>informações de navegador</li>
      <li>logs de acesso</li>
    </ul>
    <p>Essas informações são utilizadas apenas para funcionamento e segurança da infraestrutura da plataforma.</p>

    <h2>5. Cookies e Tecnologias de Sessão</h2>
    <p>Este site não utiliza cookies próprios para rastreamento de usuários.</p>
    <p>No entanto, cookies técnicos podem ser utilizados automaticamente pelos serviços de autenticação do Firebase e pelo login do Google, necessários para manter a sessão do usuário autenticado.</p>

    <h2>6. Base Legal (LGPD)</h2>
    <p>O tratamento mínimo de dados realizado neste site está em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD), sendo baseado na necessidade técnica para funcionamento da autenticação do usuário no sistema.</p>
    <p>Nenhum dado sensível é coletado ou processado.</p>

    <h2>7. Segurança</h2>
    <p>Este site utiliza serviços fornecidos pela infraestrutura do Google através do Firebase, que implementa padrões de segurança amplamente utilizados para autenticação e proteção de dados.</p>

    <h2>8. Alterações nesta Política</h2>
    <p>Esta Política de Privacidade pode ser atualizada periodicamente para refletir melhorias técnicas ou mudanças no funcionamento do site.</p>
    <p>Recomenda-se que os usuários revisem esta página ocasionalmente.</p>

    <h2>9. Contato</h2>
    <p>Caso tenha dúvidas sobre esta Política de Privacidade ou sobre o funcionamento do site, entre em contato através do repositório do projeto ou dos canais associados ao projeto.</p>
    `;

    // Utiliza a variável window.db que já foi criada pelo firebase-init.js
    window.db.collection("sistema").doc("config_geral").get().then((doc) => {
        let box = document.getElementById('privacy-content');
        if (doc.exists && doc.data().textoPrivacidade) {
            box.innerHTML = doc.data().textoPrivacidade;
        } else {
            box.innerHTML = htmlPadrao;
        }
    }).catch(() => {
        document.getElementById('privacy-content').innerHTML = htmlPadrao;
    });
});