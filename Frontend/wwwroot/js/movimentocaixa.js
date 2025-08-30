console.log('Script js/movimento-caixa.js DEFINIDO.');


// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de movimento-caixa.js foi chamada.');
    initializeFilters();
    fetchReportData(1);
}

function initializeFilters() {
    document.getElementById('searchButton')?.addEventListener('click', () => fetchReportData(1));
    document.getElementById('clearButton')?.addEventListener('click', clearFilters);
    
    const typeSelect = document.getElementById('type-filter');
    
    if (typeSelect) typeSelect.innerHTML = '<option value="">Todos os Tipos</option>';
    
    if (typeof launchTypeMap !== 'undefined' && typeSelect) {
        for (const [key, value] of Object.entries(launchTypeMap)) {
            typeSelect.appendChild(new Option(value, key));
        }
    }
}

function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-category-or-customer').value = ''; // NOVO
    document.getElementById('type-filter').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    fetchReportData(1);
}


// =======================================================
// LÓGICA DE BUSCA E RENDERIZAÇÃO
// =======================================================
async function fetchReportData(page = 1) {
    currentPage = page;
    const loadingDiv = document.getElementById('loading');
    const resultsSection = document.getElementById('resultsSection');

    if (loadingDiv) loadingDiv.style.display = 'flex';
    if (resultsSection) resultsSection.style.display = 'none';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams({ Page: currentPage, PageSize: 10 });

        const search = document.getElementById('search-input')?.value;
        const type = document.getElementById('type-filter')?.value;
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;

        // NOVO CAMPO
        const searchCategoryOrCustomer = document.getElementById('search-category-or-customer')?.value;

        if (search) params.append('Search', search);
        if (type) params.append('Type', type);
        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);

        // Envia apenas se houver valor
        if (searchCategoryOrCustomer) {
            params.append('SearchCategoryOrCustomer', searchCategoryOrCustomer);
        }

        const url = `${API_BASE_URL}/financial/dashboard-financial/flow-report?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);

        const data = await response.json();

        updateSummaryCards(data);
        renderReportTable(data.items);
        renderPagination(data);

        if (resultsSection) resultsSection.style.display = 'block';
    } catch (error) {
        if (typeof showErrorModal === 'function') {
           
        } else {
            
        }
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}


function updateSummaryCards(data) {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    document.getElementById('total-entradas').textContent = formatCurrency(data.totalEntradas);
    document.getElementById('total-saidas').textContent = formatCurrency(data.totalSaidas);
    document.getElementById('saldo-total').textContent = formatCurrency(data.saldo);

    const saldoElement = document.getElementById('saldo-total');
    saldoElement.classList.remove('saldo-positivo', 'saldo-negativo');
    if (data.saldo > 0) {
        saldoElement.classList.add('saldo-positivo');
    } else if (data.saldo < 0) {
        saldoElement.classList.add('saldo-negativo');
    }
}

function renderReportTable(items) {
    const tableBody = document.getElementById('report-table-body');
    const noResultsDiv = document.getElementById('noResults');
    if(!tableBody || !noResultsDiv) return;
    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        noResultsDiv.style.display = 'block';
        return;
    }
    noResultsDiv.style.display = 'none';
    items.forEach(item => {
        const date = new Date(item.launchDate);
        const formattedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
        const formattedAmount = (item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const typeText = (typeof launchTypeMap !== 'undefined' && launchTypeMap[item.type]) ? launchTypeMap[item.type] : 'N/A';
        const amountClass = item.type === 1 ? 'income' : 'expense';
        const relatedEntity = item.type === 1 ? (item.customerName || 'N/A') : (item.categoryName || 'N/A');
        
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.description || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>${typeText}</td>
            <td>${relatedEntity}</td>
            <td>${item.paymentMethod || 'N/A'}</td>
            <td class="${amountClass}">${formattedAmount}</td>
        `;
    });
}

function renderPagination(paginationData) {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || !paginationData.totalPages || paginationData.totalPages <= 1) return;
    const page = paginationData.page;
    const totalPages = paginationData.totalPages;
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = page <= 1;
    prevButton.onclick = () => fetchReportData(page - 1);
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.className = 'pagination-info';
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.onclick = () => fetchReportData(page + 1);
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}