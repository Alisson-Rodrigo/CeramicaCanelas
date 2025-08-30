console.log('Script js/relatorio-clientes.js DEFINIDO.');



// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de relatorio-clientes.js foi chamada.');
    initializeFilters();
    fetchReportData(1);
}

function initializeFilters() {
    document.getElementById('searchButton')?.addEventListener('click', () => fetchReportData(1));
    document.getElementById('clearButton')?.addEventListener('click', clearFilters);
}

function clearFilters() {
    document.getElementById('search-input').value = '';
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
    
    if(loadingDiv) loadingDiv.style.display = 'flex';
    if(resultsSection) resultsSection.style.display = 'none';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams({ Page: currentPage, PageSize: 10, OrderBy: 'CustomerName' });
        const search = document.getElementById('search-input')?.value;
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;

        if (search) params.append('Search', search);
        
        // --- CORREÇÃO DE DATA APLICADA AQUI ---
        // Enviamos a data como string 'YYYY-MM-DD' para evitar problemas de fuso horário.
        // O backend deve ser capaz de interpretar este formato.
        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);
        // ------------------------------------

        // IMPORTANTE: Endpoint presumido. Ajuste se necessário.
        const url = `${API_BASE_URL}/financial/dashboard-financial/clients-balance?${params.toString()}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);

        const data = await response.json();
        
        renderReportTable(data.items);
        renderPagination(data);
        
        if(resultsSection) resultsSection.style.display = 'block';

    } catch (error) {
        if(typeof showErrorModal === 'function') {
        
        } else {
           
        }
    } finally {
        if(loadingDiv) loadingDiv.style.display = 'none';
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

    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    items.forEach(item => {
        // CORREÇÃO DE DATA: Trata a data recebida como UTC para exibir o dia correto.
        const date = new Date(item.dataDaUltimaCompra);
        const formattedDate = item.dataDaUltimaCompra ? new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR') : 'N/A';

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.customerName || 'N/A'}</td>
            <td class="income">${formatCurrency(item.totalAmount)}</td>
            <td>${formatCurrency(item.ticketMedio)}</td>
            <td class="expense">${formatCurrency(item.valorPendente)}</td>
            <td>${item.quantidadeDeCompras}</td>
            <td>${formattedDate}</td>
        `;
    });
}

function renderPagination(paginationData) {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || !paginationData.totalPages || paginationData.totalPages <= 1) return;
    
    const { page, totalPages } = paginationData;
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