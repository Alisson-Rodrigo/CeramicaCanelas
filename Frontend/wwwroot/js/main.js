// =======================================================
// VARIÁVEIS E CONSTANTES GLOBAIS DA APLICAÇÃO
// =======================================================

// CONTROLE DE VERSÃO PARA LIMPEZA DE CACHE AUTOMÁTICA
// Mude esta versão sempre que atualizar o sistema (ex: '1.0.1')
const APP_VERSION = '1.0.0';

// const API_BASE_URL = 'https://api.ceramicacanelas.shop/api';
const API_BASE_URL = 'https://api.ceramicacanelas.shop/api';

// Cache para a tabela de histórico em páginas complexas
let historyItemsCache = []; 
const originalRowHTML_Extract = {};
// Objetos para guardar o estado original da linha durante a edição
const originalRowHTML_Product = {};
const originalRowHTML_Employee = {};
const originalRowHTML_Category = {};
const originalRowHTML_Supplier = {};
const originalRowHTML_Customer = {};
const originalRowHTML_LaunchCategory = {};
const originalRowHTML_Launch = {};
const originalEntryRowHTML = {};
const originalHistoryRowHTML = {};
const originalRowHTML_CategoryGroup = {};

// Variáveis de estado para paginação
let currentPage = 1;
let currentTablePage = 1;
let currentEmployeePage = 1;
let currentSupplierPage = 1;
let currentEntryPage = 1;
let currentHistoryPage = 1;
let currentProductModalPage = 1;
let currentEmployeeModalPage = 1;
let currentSupplierModalPage = 1;
let currentCategoryModalPage = 1;
let currentCustomerModalPage = 1;


// Mapas de Enums
const positionMap = {
    0: 'Enfornador', 1: 'Desenfornador', 2: 'Soldador', 3: 'Marombeiro',
    4: 'Operador de Pá Carregadeira', 5: 'Motorista', 6: 'Queimador',
    7: 'Conferente', 8: 'Caixa', 9: 'Auxiliar Administrativo',
    10: 'Auxiliar de Limpeza', 11: 'Dono', 12: 'Gerente',
    13: 'Auxiliar de Estoque', 14: 'Prestador de Serviços', 15: 'Pedreiro'
};
const userRolesMap = { 0: 'Admin', 1: 'Viewer', 2: 'Financial', 3: 'Almoxarifado' };
const launchTypeMap = { 1: 'Entrada', 2: 'Saída' };
const paymentMethodMap = { 
    0: 'Dinheiro', 
    1: 'CXPJ', 
    2: 'BBJ', 
    3: 'BBJS', 
    4: 'CHEQUE',
    5: 'Bradesco - PJ',
    6: 'Caixa Econômica',
    7: 'Débito Automático'
};
const statusMap = { 0: 'Pendente', 1: 'Pago' };
const productTypeMap = {
    0: "Tijolos de 1ª 06 Furos",
    1: "Tijolos de 2ª 06 Furos",
    2: "Tijolos de 1ª 08 Furos",
    3: "Tijolos de 2ª 08 Furos",
    4: "Tijolos de 08 Furos G",
    5: "Blocos de 9 Furos",
    6: "Blocos de 9 Furos Duplo",
    7: "Bandas 6 furos",
    8: "Telhas de 1ª",
    9: "Telhas de 2ª",
    10: "Lajotas",
    11: "Tijolos para churrasqueira",
    12: "Bandas 8 furos",
    13: "Bandas 9 furos",
    14: "Caldeado 6 furos",
    15: "Caldeado 8 furos",
    16: "Caldeado 9 furos",
    17: "Tijolo de 6 furos Duplo"
};

const originalRowHTML_Sale = {};
let salesRevenueChart = null;
let topProductsChart = null;
let paymentMethodsChart = null;
let topCitiesChart = null;
// Função utilitária global
const getPositionName = (positionId) => positionMap[positionId] || 'Desconhecido';
const saleStatusMap = { 0: 'Pendente', 1: 'Confirmada', 2: 'Cancelada' };
// =======================================================
// FUNÇÃO PRINCIPAL DE CARREGAMENTO DE PÁGINAS (COM CACHE BUSTING)
// =======================================================
let isFormLoading = false; // Trava para evitar carregamentos simultâneos

async function loadForm(formName) {
    if (isFormLoading) {
        console.warn(`🚦 AVISO: Tentativa de carregar '${formName}' enquanto outro formulário está em andamento.`);
        return;
    }
    isFormLoading = true;
    console.log(`▶️ Iniciando carregamento do formulário: ${formName}.`);

    const container = document.getElementById('form-container');
    if (!container) {
        console.error("❌ ERRO: Elemento 'form-container' não encontrado!");
        isFormLoading = false;
        return;
    }

    container.innerHTML = '<h2>Carregando Formulário...</h2>';
    document.getElementById('welcome-message')?.remove();
    document.getElementById('dynamic-form-script')?.remove();
    document.getElementById('dynamic-form-style')?.remove();

    try {
        const htmlUrl = `/forms/${formName}.html?v=${APP_VERSION}`;
        const cssUrl = `/css/${formName}.css?v=${APP_VERSION}`;
        const jsUrl = `/js/${formName}.js?v=${APP_VERSION}`;

        const [htmlResponse, cssResponse] = await Promise.all([
            fetch(htmlUrl),
            fetch(cssUrl).catch(() => null)
        ]);

        if (!htmlResponse.ok) throw new Error(`Formulário ${formName}.html não encontrado.`);
        
        const htmlContent = await htmlResponse.text();

        if (cssResponse && cssResponse.ok) {
            const cssContent = await cssResponse.text();
            const style = document.createElement('style');
            style.id = 'dynamic-form-style';
            style.textContent = cssContent;
            document.head.appendChild(style);
        }
        
        container.innerHTML = htmlContent;
        
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = 'dynamic-form-script';
            script.src = jsUrl;
            script.onload = () => {
                console.log(`✅ Script ${formName}.js carregado.`);
                if (typeof window.initDynamicForm === 'function') {
                    console.log(`🚀 Executando initDynamicForm() de ${formName}.js`);
                    window.initDynamicForm();
                } else {
                    console.warn(`⚠️ O script ${formName}.js não possui a função initDynamicForm().`);
                }
                resolve();
            };
            script.onerror = () => reject(new Error(`Falha ao carregar o script ${jsUrl}`));
            document.body.appendChild(script);
        });

    } catch (error) {
        console.error('💥 Erro no processo de loadForm:', error);
        container.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
    } finally {
        isFormLoading = false;
        console.log(`⏹️ Carregamento do formulário ${formName} finalizado.`);
    }
}

// =======================================================
// FUNÇÕES UTILITÁRIAS GLOBAIS
// =======================================================

function showErrorModal(errorData) {
    // Implemente sua lógica de modal de erro aqui
    // Exemplo com alert:
    alert((errorData.title || "Erro") + "\n\n" + (errorData.detail || "Ocorreu um erro."));
}

async function loadProductCategories(selectElement, defaultOptionText = 'Selecione uma categoria') { 
    if (!selectElement) return; 
    try { 
        const accessToken = localStorage.getItem('accessToken'); 
        const response = await fetch(`${API_BASE_URL}/categories`, { headers: { 'Authorization': `Bearer ${accessToken}` } }); 
        if (!response.ok) {
            if (response.status === 400 || response.status === 500) {
                 const errorData = await response.json().catch(() => null);
                 if (errorData && errorData.message && errorData.message.includes("Não há categórias cadastradas")) {
                    selectElement.innerHTML = `<option value="">Nenhuma categoria cadastrada</option>`;
                    selectElement.disabled = true;
                    return;
                 }
            }
            throw new Error(`Falha ao carregar categorias (Status: ${response.status})`);
        }
        const categories = await response.json(); 
        if (!categories || categories.length === 0) {
            selectElement.innerHTML = `<option value="">Nenhuma categoria cadastrada</option>`;
            selectElement.disabled = true;
        } else {
            selectElement.disabled = false;
            selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`; 
            categories.forEach(category => { 
                const option = new Option(category.name, category.id); 
                selectElement.appendChild(option); 
            }); 
        }
    } catch (error) { 
        console.error('Erro ao carregar categorias:', error); 
        selectElement.innerHTML = '<option value="">Erro ao carregar</option>'; 
        selectElement.disabled = true;
    } 
}

async function loadLaunchCategories(selectElement, defaultOptionText = 'Selecione uma categoria') { 
    if (!selectElement) return; 
    try { 
        const accessToken = localStorage.getItem('accessToken'); 
        const response = await fetch(`${API_BASE_URL}/financial/launch-categories`, { headers: { 'Authorization': `Bearer ${accessToken}` } }); 
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            if (errorData && errorData.message && errorData.message.includes("Não há categórias cadastradas")) {
               selectElement.innerHTML = `<option value="">Nenhuma categoria cadastrada</option>`;
               selectElement.disabled = true;
               return;
            }
            throw new Error(`Falha ao carregar categorias de lançamento (Status: ${response.status})`);
        }
        const paginatedData = await response.json();
        const categories = paginatedData.items || paginatedData; // Compatível com paged e não-paged
        if (!categories || categories.length === 0) {
            selectElement.innerHTML = `<option value="">Nenhuma categoria cadastrada</option>`;
            selectElement.disabled = true;
        } else {
            selectElement.disabled = false;
            selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`; 
            categories.forEach(category => { 
                const option = new Option(category.name, category.id); 
                selectElement.appendChild(option); 
            }); 
        }
    } catch (error) { 
        console.error('Erro ao carregar categorias de lançamento:', error); 
        selectElement.innerHTML = '<option value="">Erro ao carregar</option>'; 
        selectElement.disabled = true;
    } 
}