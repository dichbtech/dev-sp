const firebaseConfig = {
    apiKey: "AIzaSyCvyt0IyruvPqZPb6OqX5yiGuvIjUWpktA",
    authDomain: "central-supervisores.firebaseapp.com",
    projectId: "central-supervisores",
    storageBucket: "central-supervisores.firebasestorage.app",
    messagingSenderId: "882541677437",
    appId: "1:882541677437:web:ed25d1e7aa273ca40cda14"
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
    'img-podio-base': { left: '100px', top: '150px', width: 'auto' },
    'avatar-1': { left: '175px', top: '50px', width: 'auto' },
    'medal-1': { left: '175px', top: '0px', width: 'auto' },
    'nick-1': { left: '160px', top: '120px', width: 'auto' },
    'avatar-2': { left: '80px', top: '100px', width: 'auto' },
    'medal-2': { left: '80px', top: '50px', width: 'auto' },
    'nick-2': { left: '60px', top: '170px', width: 'auto' },
    'avatar-empate-1': { left: '175px', top: '50px', width: 'auto' },
    'txt-empate-1': { left: '175px', top: '20px', width: 'auto' },
    'avatar-empate-2': { left: '80px', top: '100px', width: 'auto' },
    'txt-empate-2': { left: '80px', top: '70px', width: 'auto' },
    'img-palco-base': { left: '50px', top: '220px', width: 'auto' },
    'img-brasao': { left: '10px', top: '10px', width: 'auto' },
    'img-emblema-sup': { left: '45px', top: '40px', width: 'auto' },
    'avatar-selecionado': { left: '130px', top: '100px', width: 'auto' },
    'sponsorInner': { left: '0px', top: '-10px', width: '60px' }
};