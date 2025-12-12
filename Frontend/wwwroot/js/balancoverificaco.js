console.log('Script js/dashboard-financeiro.js DEFINIDO.');

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

    // Popula os seletores de método de pagamento e status
    populateSelect(document.getElementById('payment-method-filter'), paymentMethodMap, 'Todos os Métodos');
    populateSelect(document.getElementById('status-filter'), statusMap, 'Todos os Status');

    fetchAndPopulateGroups();
    fetchAndPopulateCategories();
    
    // Listener para filtro de grupo - atualiza categorias
    const groupFilter = document.getElementById('group-filter');
    if (groupFilter) {
        groupFilter.addEventListener('change', function() {
            const selectedGroupId = this.value;
            if (selectedGroupId) {
                fetchAndPopulateCategories(selectedGroupId);
            } else {
                fetchAndPopulateCategories();
            }
        });
    }
}

function clearFilters() {
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('group-filter').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('payment-method-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('search-input').value = '';
    
    // Recarrega todas as categorias quando limpar o filtro
    fetchAndPopulateCategories();
    fetchReportData();
}

async function fetchAndPopulateGroups() {
    try {
        const accessToken = localStorage.getItem('accessToken');

        // 🔹 força a API a retornar muitos registros de uma vez
        const url = `${API_BASE_URL}/financial/launch-category-groups/paged?Page=1&PageSize=9999`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar grupos');

        const data = await response.json();

        // opcional: cache global, se quiser reaproveitar
        groupsCache = data.items || [];

        const groupsMap = groupsCache.reduce((map, group) => {
            map[group.id] = group.name;
            return map;
        }, {});

        populateSelect(
            document.getElementById('group-filter'),
            groupsMap,
            'Todos os Grupos'
        );
    } catch (error) {
        console.error("Erro ao buscar grupos para filtro:", error);
    }
}


async function fetchAndPopulateCategories(groupId = null) {
    try {
        const accessToken = localStorage.getItem('accessToken');

        // 🔹 já entra paginado “grande”
        let url = `${API_BASE_URL}/financial/launch-categories/paged?Page=1&PageSize=9999`;

        // Se houver groupId, adiciona no querystring
        if (groupId) {
            url += `&GroupId=${encodeURIComponent(groupId)}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar categorias');

        const data = await response.json();

        // opcional: cache global
        categoriesCache = data.items || [];

        const categoriesMap = categoriesCache.reduce((map, cat) => {
            map[cat.id] = cat.name;
            return map;
        }, {});

        populateSelect(
            document.getElementById('category-filter'),
            categoriesMap,
            'Todas as Categorias'
        );
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
        
        // Captura os valores dos filtros
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        const groupId = document.getElementById('group-filter')?.value;
        const categoryId = document.getElementById('category-filter')?.value;
        const paymentMethod = document.getElementById('payment-method-filter')?.value;
        const status = document.getElementById('status-filter')?.value;
        const search = document.getElementById('search-input')?.value;

        // Adiciona apenas os parâmetros que possuem valor
        if (startDate && startDate.trim() !== '') {
            params.append('StartDate', startDate);
        }
        if (endDate && endDate.trim() !== '') {
            params.append('EndDate', endDate);
        }
        if (groupId && groupId.trim() !== '') {
            params.append('GroupId', groupId);
        }
        if (categoryId && categoryId.trim() !== '') {
            params.append('CategoryId', categoryId);
        }
        if (paymentMethod && paymentMethod.trim() !== '') {
            params.append('PaymentMethod', parseInt(paymentMethod, 10));
        }
        if (status && status.trim() !== '') {
            params.append('Status', parseInt(status, 10));
        }
        if (search && search.trim() !== '') {
            params.append('Search', search.trim());
        }

        const url = `${API_BASE_URL}/financial/dashboard-financial/with-extract?${params.toString()}`;
        console.log('🔍 URL da requisição:', url);
        console.log('📋 Filtros aplicados:', {
            startDate,
            endDate,
            groupId,
            categoryId,
            paymentMethod,
            status,
            search
        });
        
        const response = await fetch(url, { 
            headers: { 'Authorization': `Bearer ${accessToken}` } 
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Falha ao buscar dados (Status: ${response.status})`);
        }

        const data = await response.json();
        console.log('✅ Dados recebidos da API:', data);

        // Aplica filtros adicionais no frontend se necessário
        const filteredData = applyClientSideFilters(data, {
            startDate,
            endDate,
            groupId,
            categoryId,
            search
        });

        updateDashboardUI(filteredData);

        if (resultsSection) resultsSection.style.display = 'block';

    } catch (error) {
        console.error('❌ Erro ao buscar dados:', error);
        if (typeof showErrorModal === 'function') {
            showErrorModal({ title: "Erro ao Gerar Relatório", detail: error.message });
        } else {
            alert(`Erro: ${error.message}`);
        }
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

/**
 * Aplica filtros adicionais no lado do cliente para garantir consistência
 */
function applyClientSideFilters(data, filters) {
    const { startDate, endDate, groupId, categoryId, search } = filters;
    
    // Clona os dados para não modificar o original
    const filteredData = { ...data };
    
    // Verifica se há filtros ativos
    const hasActiveFilters = Boolean(
        (startDate && startDate.trim()) || 
        (endDate && endDate.trim()) || 
        (groupId && groupId.trim()) || 
        (categoryId && categoryId.trim()) || 
        (search && search.trim())
    );
    
    console.log('🔍 Filtros ativos:', {
        hasActiveFilters,
        startDate,
        endDate,
        groupId,
        categoryId,
        search
    });
    
    // Filtra grupos se necessário
    if (groupId && groupId.trim() && data.groups) {
        filteredData.groups = data.groups.filter(group => {
            // Assumindo que a API pode retornar o groupId
            // Se não houver, pode precisar de uma abordagem diferente
            return true; // A API já deve filtrar corretamente
        });
    }
    
    // Filtra categorias dentro dos grupos se necessário
    if (categoryId && categoryId.trim() && data.groups) {
        filteredData.groups = data.groups.map(group => {
            if (group.categories) {
                return {
                    ...group,
                    categories: group.categories.filter(cat => {
                        // Se tiver o ID da categoria, podemos filtrar
                        return true; // A API já deve filtrar corretamente
                    })
                };
            }
            return group;
        }).filter(group => group.categories && group.categories.length > 0);
    }
    
    // Filtra extratos por data e busca
    if (data.extracts) {
        let filteredExtracts = [...data.extracts];
        const originalCount = filteredExtracts.length;
        
        // Filtro por data inicial
        if (startDate && startDate.trim() !== '') {
            const start = new Date(startDate + 'T00:00:00');
            console.log('📅 Filtrando por data inicial:', start);
            
            filteredExtracts = filteredExtracts.filter(ext => {
                const extDate = new Date(ext.date + 'T00:00:00');
                const isValid = extDate >= start;
                if (!isValid) {
                    console.log(`  ❌ Removendo: ${ext.date} (${ext.description})`);
                }
                return isValid;
            });
            
            console.log(`  Após filtro inicial: ${originalCount} → ${filteredExtracts.length}`);
        }
        
        // Filtro por data final
        if (endDate && endDate.trim() !== '') {
            const end = new Date(endDate + 'T23:59:59');
            console.log('📅 Filtrando por data final:', end);
            
            const beforeEndFilter = filteredExtracts.length;
            filteredExtracts = filteredExtracts.filter(ext => {
                const extDate = new Date(ext.date + 'T00:00:00');
                const isValid = extDate <= end;
                if (!isValid) {
                    console.log(`  ❌ Removendo: ${ext.date} (${ext.description})`);
                }
                return isValid;
            });
            
            console.log(`  Após filtro final: ${beforeEndFilter} → ${filteredExtracts.length}`);
        }
        
        // Filtro por busca
        if (search && search.trim() !== '') {
            const searchLower = search.trim().toLowerCase();
            console.log('🔎 Filtrando por busca:', searchLower);
            
            const beforeSearchFilter = filteredExtracts.length;
            filteredExtracts = filteredExtracts.filter(ext => {
                const matchDescription = ext.description?.toLowerCase().includes(searchLower);
                const matchAccount = ext.accountName?.toLowerCase().includes(searchLower);
                return matchDescription || matchAccount;
            });
            
            console.log(`  Após filtro de busca: ${beforeSearchFilter} → ${filteredExtracts.length}`);
        }
        
        filteredData.extracts = filteredExtracts;
        
        console.log(`📊 TOTAL: Extratos filtrados de ${originalCount} para ${filteredExtracts.length}`);
    }
    
    return filteredData;
}

function updateDashboardUI(data) {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--';

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
    if (!tableBody) return;

    tableBody.innerHTML = '';
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (accounts && accounts.length > 0) {
        accounts.forEach(acc => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${acc.accountName}</td>
                <td class="income">${formatCurrency(acc.totalIncome)}</td>
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
        const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        groups.forEach(group => {
            const groupRow = tableBody.insertRow();
            groupRow.className = 'group-row';
            groupRow.innerHTML = `
                <td><strong>${group.groupName}</strong></td>
                <td class="expense"><strong>${formatCurrency(group.groupExpense)}</strong></td>
            `;
            
            if (group.categories && group.categories.length > 0) {
                group.categories.forEach(cat => {
                    const categoryRow = tableBody.insertRow();
                    categoryRow.className = 'category-row';
                    categoryRow.innerHTML = `
                        <td class="category-name">${cat.categoryName}</td>
                        <td class="expense">${formatCurrency(cat.totalExpense)}</td>
                    `;
                });
            }
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="2">Nenhum dado de grupo/categoria encontrado para os filtros aplicados.</td></tr>';
    }
}

/**
 * Renderiza a tabela de extratos e calcula o total dos lançamentos.
 * @param {Array<Object>} extracts - A lista de lançamentos vinda da API.
 */
function renderExtractsTable(extracts) {
    const tableBody = document.getElementById('extracts-history-body');
    const tableFooterCell = document.getElementById('extracts-total');
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    tableBody.innerHTML = '';
    let totalValue = 0;

    if (extracts && extracts.length > 0) {
        // Ordena por data (mais recente primeiro)
        const sortedExtracts = [...extracts].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        sortedExtracts.forEach(ext => {
            // Soma o valor (considerando entradas como positivo e saídas como negativo)
            totalValue += (ext.type.toLowerCase() === 'entrada' ? ext.value : -ext.value);
            
            const row = tableBody.insertRow();
            const valueClass = ext.type.toLowerCase() === 'entrada' ? 'income' : 'expense';
            row.innerHTML = `
                <td>${new Date(ext.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>${ext.description}</td>
                <td>${ext.accountName}</td>
                <td>${ext.type}</td>
                <td class="${valueClass}">${formatCurrency(ext.value)}</td>
            `;
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="5">Nenhum lançamento no extrato para os filtros aplicados.</td></tr>';
    }

    // Atualiza a célula do rodapé com o total calculado
    if (tableFooterCell) {
        tableFooterCell.textContent = formatCurrency(totalValue);
        tableFooterCell.className = totalValue >= 0 ? 'income' : 'expense';
    }
}

async function generatePdfReport() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.display = 'flex';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams();
        
        // Captura os valores dos filtros
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        const groupId = document.getElementById('group-filter')?.value;
        const categoryId = document.getElementById('category-filter')?.value;
        const paymentMethod = document.getElementById('payment-method-filter')?.value;
        const status = document.getElementById('status-filter')?.value;
        const search = document.getElementById('search-input')?.value;

        // Adiciona apenas os parâmetros que possuem valor
        if (startDate && startDate.trim() !== '') {
            params.append('StartDate', startDate);
        }
        if (endDate && endDate.trim() !== '') {
            params.append('EndDate', endDate);
        }
        if (groupId && groupId.trim() !== '') {
            params.append('GroupId', groupId);
        }
        if (categoryId && categoryId.trim() !== '') {
            params.append('CategoryId', categoryId);
        }
        if (paymentMethod && paymentMethod.trim() !== '') {
            params.append('PaymentMethod', parseInt(paymentMethod, 10));
        }
        if (status && status.trim() !== '') {
            params.append('Status', parseInt(status, 10));
        }
        if (search && search.trim() !== '') {
            params.append('Search', search.trim());
        }

        const url = `${API_BASE_URL}/financial/dashboard-financial/trial-balance/pdf?${params.toString()}`;
        console.log('📄 URL do PDF:', url);

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
        console.error('❌ Erro ao gerar PDF:', error);
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