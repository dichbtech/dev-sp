const firebaseConfig = {
    apiKey: "AIzaSyBm_RTyytsToUJFSa4Qwbmr2pWjAbE7V3M",
    authDomain: "developer-supervisores.firebaseapp.com",
    projectId: "developer-supervisores",
    storageBucket: "developer-supervisores.firebasestorage.app",
    messagingSenderId: "38038012491",
    appId: "1:38038012491:web:6d735211e466c44ca083ce"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Usar "var" permite que essas variáveis existam globalmente para todos os outros módulos
var auth = firebase.auth();
var db = firebase.firestore();

window.usuarioLogadoEmail = '';
window.usuarioLogadoNick = '';
window.nivelUsuarioGlobal = 'SUPERVISOR';
window.acessosData = [];
window.planilhaAcessos = {};
window.membrosDataArray = [];
window.dashboardEventosData = [];
window.pontosExtrasMap = {};
window.eventoAtivo = false;
window.eventoMult = 1;
window.cargosMap = {};
window.isEditMode = false;

window.layoutConfig = {
    'avatar-1': { left: '114px', top: '34px', width: '124px' },
    'avatar-2': { left: '176px', top: '100px', width: '124px' },
    'avatar-empate-1': { left: '175px', top: '50px', width: 'auto' },
    'avatar-empate-2': { left: '80px', top: '100px', width: 'auto' },
    'avatar-selecionado': { left: '104px', top: '59px', width: '154px' },
    'img-brasao': { left: '-7px', top: '47px', width: '181px' },
    'img-emblema-sup': { left: '38px', top: '93px', width: '84px' },
    'img-palco-base': { left: '102px', top: '255px', width: '170px' },
    'img-podio-base': { left: '87px', top: '203px', width: '252px' },
    'img-premio-hc': { width: '40px' },
    'img-premio-moedas': { width: '100px' },
    'img-premio-moedas-0': { width: '175px' },
    'medal-1': { left: '156px', top: '32px', width: 'auto' },
    'medal-2': { left: '219px', top: '98px', width: 'auto' },
    'nick-1': { left: '25px', top: '154px', width: 'auto' },
    'nick-2': { left: '304px', top: '201px', width: 'auto' },
    'sponsorInner': { left: '-5px', top: '-16px', width: '60px' },
    'txt-empate-1': { left: '139px', top: '49px', width: 'auto' },
    'txt-empate-2': { left: '204px', top: '124px', width: 'auto' }
};