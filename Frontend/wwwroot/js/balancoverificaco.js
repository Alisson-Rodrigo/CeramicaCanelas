console.log('Script js/dashboard-financeiro.js DEFINIDO.');

// =======================================================
// MAPAS E VARIÁVEIS GLOBAIS
// =======================================================

// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de dashboard-financeiro.js foi chamada.');
    initializeFilters();
    fetchReportData();
}

document.addEventListener('DOMContentLoaded', initDynamicForm);

// =======================================================
// LÓGICA DE FILTROS E AÇÕES
// =======================================================
function initializeFilters() {
    document.getElementById('generateReportBtn')?.addEventListener('click', fetchReportData);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
    document.getElementById('generatePdfButton')?.addEventListener('click', generatePdfReport);
    
    populateSelect(document.getElementById('payment-method-filter'), paymentMethodMap, 'Todos os Métodos');
    populateSelect(document.getElementById('status-filter'), statusMap, 'Todos os Status');
    
    fetchAndPopulateGroups();
    fetchAndPopulateCategories();
}

function clearFilters() {
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('group-filter').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('payment-method-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('search-input').value = '';
    fetchReportData();
}

async function fetchAndPopulateGroups() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        const url = `${API_BASE_URL}/financial/launch-category-groups/paged`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error('Falha ao buscar grupos');
        const data = await response.json();
        groupsCache = data.items;
        populateSelect(document.getElementById('group-filter'), groupsCache.reduce((map, group) => { map[group.id] = group.name; return map; }, {}), 'Todos os Grupos');
    } catch (error) {
        console.error("Erro ao buscar grupos para filtro:", error);
    }
}

async function fetchAndPopulateCategories() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        const url = `${API_BASE_URL}/financial/launch-categories/paged`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error('Falha ao buscar categorias');
        const data = await response.json();
        categoriesCache = data.items;
        populateSelect(document.getElementById('category-filter'), categoriesCache.reduce((map, cat) => { map[cat.id] = cat.name; return map; }, {}), 'Todas as Categorias');
    } catch (error) {
        console.error("Erro ao buscar categorias para filtro:", error);
    }
}

// =======================================================
// LÓGICA DO DASHBOARD
// =======================================================
async function fetchReportData() {
    const loadingDiv = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    
    if (loadingDiv) loadingDiv.style.display = 'flex';
    if (resultsSection) resultsSection.style.display = 'none';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams();
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        const groupId = document.getElementById('group-filter')?.value;
        const categoryId = document.getElementById('category-filter')?.value;
        const paymentMethod = document.getElementById('payment-method-filter')?.value;
        const status = document.getElementById('status-filter')?.value;
        const search = document.getElementById('search-input')?.value;

        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);
        if (groupId) params.append('GroupId', groupId);
        if (categoryId) params.append('CategoryId', categoryId);
        if (paymentMethod) params.append('PaymentMethod', paymentMethod);
        if (status) params.append('Status', status);
        if (search) params.append('Search', search);

        const url = `${API_BASE_URL}/financial/dashboard-financial/with-extract?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);
        
        const data = await response.json();
        
        updateDashboardUI(data);
        
        if (resultsSection) resultsSection.style.display = 'block';

    } catch (error) {
        if(typeof showErrorModal === 'function') {
            showErrorModal({ title: "Erro ao Gerar Relatório", detail: error.message });
        } else {
            alert(`Erro: ${error.message}`);
        }
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

function updateDashboardUI(data) {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--';
    
    const period = `${formatDate(data.startDate)} a ${formatDate(data.endDate)}`;
    document.getElementById('report-period').textContent = (data.startDate && data.endDate) ? period : 'Período Completo';
    document.getElementById('total-income').textContent = formatCurrency(data.totalIncomeOverall);
    document.getElementById('total-expense').textContent = formatCurrency(data.totalExpenseOverall);
    
    const netBalanceEl = document.getElementById('net-balance');
    netBalanceEl.textContent = formatCurrency(data.netBalance);
    netBalanceEl.style.color = data.netBalance >= 0 ? '#28a745' : '#dc3545';

    renderAccountsTable(data.accounts);
    renderGroupsTable(data.groups);
    renderExtractsTable(data.extracts);
}

function renderAccountsTable(accounts) {
    const tableBody = document.getElementById('totals-by-account-body');
    tableBody.innerHTML = '';
    if (accounts && accounts.length > 0) {
        accounts.forEach(acc => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${acc.accountName}</td>
                <td class="income">${(acc.totalIncome || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            `;
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="2">Nenhum dado de conta encontrado.</td></tr>';
    }
}

function renderGroupsTable(groups) {
    const tableBody = document.getElementById('expenses-by-group-body');
    tableBody.innerHTML = '';
    if (groups && groups.length > 0) {
        groups.forEach(group => {
            const groupRow = tableBody.insertRow();
            groupRow.className = 'group-row';
            groupRow.innerHTML = `
                <td><strong>${group.groupName}</strong></td>
                <td class="expense"><strong>${(group.groupExpense || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></td>
            `;
            if (group.categories && group.categories.length > 0) {
                group.categories.forEach(cat => {
                    const categoryRow = tableBody.insertRow();
                    categoryRow.className = 'category-row';
                    categoryRow.innerHTML = `
                        <td class="category-name">${cat.categoryName}</td>
                        <td class="expense">${(cat.totalExpense || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    `;
                });
            }
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="2">Nenhum dado de grupo encontrado.</td></tr>';
    }
}

function renderExtractsTable(extracts) {
    const tableBody = document.getElementById('extracts-history-body');
    tableBody.innerHTML = '';
    if (extracts && extracts.length > 0) {
        extracts.forEach(ext => {
            const row = tableBody.insertRow();
            const valueClass = ext.type.toLowerCase() === 'entrada' ? 'income' : 'expense';
            row.innerHTML = `
                <td>${new Date(ext.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td>${ext.description}</td>
                <td>${ext.accountName}</td>
                <td>${ext.type}</td>
                <td class="${valueClass}">${(ext.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            `;
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="5">Nenhum lançamento no extrato para este período.</td></tr>';
    }
}

async function generatePdfReport() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.display = 'flex';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams();
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        const groupId = document.getElementById('group-filter')?.value;
        const categoryId = document.getElementById('category-filter')?.value;
        const paymentMethod = document.getElementById('payment-method-filter')?.value;
        const status = document.getElementById('status-filter')?.value;
        const search = document.getElementById('search-input')?.value;

        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);
        if (groupId) params.append('GroupId', groupId);
        if (categoryId) params.append('CategoryId', categoryId);
        if (paymentMethod) params.append('PaymentMethod', paymentMethod);
        if (status) params.append('Status', status);
        if (search) params.append('Search', search);
        
        const url = `${API_BASE_URL}/financial/dashboard-financial/trial-balance/pdf?${params.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Falha ao gerar relatório (Status: ${response.status})`);
        }

        const blob = await response.blob();
        const fileURL = URL.createObjectURL(blob);
        
        window.open(fileURL, '_blank');
        URL.revokeObjectURL(fileURL);

    } catch (error) {
        if (typeof showErrorModal === 'function') {
            showErrorModal({ title: "Erro ao Gerar PDF", detail: error.message });
        } else {
            alert(`Erro: ${error.message}`);
        }
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

// =======================================================
// FUNÇÕES AUXILIARES
// =======================================================
function populateSelect(selectElement, map, defaultOptionText) {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
    for (const [key, value] of Object.entries(map)) {
        selectElement.appendChild(new Option(value, key));
    }
}

