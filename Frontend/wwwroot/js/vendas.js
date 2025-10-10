console.log('Script js/relatorio-itens-vendidos.js DEFINIDO.');


// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de relatorio-itens-vendidos.js foi chamada.');
    initializeFilters();
    fetchReportData(1);
}

function initializeFilters() {
    document.getElementById('searchButton')?.addEventListener('click', () => fetchReportData(1));
    document.getElementById('clearButton')?.addEventListener('click', clearFilters);
    document.getElementById('generatePdfButton')?.addEventListener('click', generatePdfReport);
    
    // Popula os selects de filtro (assumindo que os mapas estão definidos no HTML)
    populateSelect(document.getElementById('product-filter'), productTypeMap, 'Todos os Produtos');
    populateSelect(document.getElementById('status-filter'), saleStatusMap, 'Todos os Status');
    populateSelect(document.getElementById('payment-method-filter'), paymentMethodMap, 'Todos os Métodos');
}

function populateSelect(selectElement, map, defaultOptionText) {
    if (!selectElement || typeof map === 'undefined') return;
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
    for (const [key, value] of Object.entries(map)) {
        selectElement.appendChild(new Option(value, key));
    }
}

function clearFilters() {
    document.getElementById('product-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('payment-method-filter').value = '';
    document.getElementById('city-filter').value = '';
    document.getElementById('state-filter').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    fetchReportData(1);
}

// =======================================================
// LÓGICA DE BUSCA E GERAÇÃO DE PDF
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

        const params = new URLSearchParams({ Page: currentPage, PageSize: 10 });
        
        const product = document.getElementById('product-filter')?.value;
        const status = document.getElementById('status-filter')?.value;
        const paymentMethod = document.getElementById('payment-method-filter')?.value;
        const city = document.getElementById('city-filter')?.value;
        const state = document.getElementById('state-filter')?.value;
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;

        if (product) params.append('Product', product);
        if (status) params.append('Status', status);
        if (paymentMethod) params.append('PaymentMethod', paymentMethod);
        if (city) params.append('City', city);
        if (state) params.append('State', state);
        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);
        
        const url = `${API_BASE_URL}/sales/items/paged?${params.toString()}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);

        const data = await response.json();
        
        renderReportTable(data.items);
        renderPagination(data);
        
        if(resultsSection) resultsSection.style.display = 'block';

    } catch (error) {
        alert(`Erro na Pesquisa: ${error.message}`);
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
        tableBody.style.display = 'none'; // Esconde o corpo da tabela
        return;
    }
    noResultsDiv.style.display = 'none';
    tableBody.style.display = ''; // Garante que o corpo da tabela está visível

    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    items.forEach(item => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.productName || 'N/A'}</td>
            <td>${item.milheiros || 0}</td>
            <td>${item.units || 0}</td>
            <td>${item.breaks || 0}</td>
            <td class="income">${formatCurrency(item.revenue)}</td>
            <td>${formatCurrency(item.avgPrice)}</td>
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

async function generatePdfReport() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.display = 'flex';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams();
        
        const product = document.getElementById('product-filter')?.value;
        const status = document.getElementById('status-filter')?.value;
        const paymentMethod = document.getElementById('payment-method-filter')?.value;
        const city = document.getElementById('city-filter')?.value;
        const state = document.getElementById('state-filter')?.value;
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;

        if (product) params.append('Product', product);
        if (status) params.append('Status', status);
        if (paymentMethod) params.append('PaymentMethod', paymentMethod);
        if (city) params.append('City', city);
        if (state) params.append('State', state);
        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);

        const url = `${API_BASE_URL}/sales/items/pdf?${params.toString()}`;
        console.log("📡 Gerando PDF a partir de:", url);

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
        alert(`Erro ao Gerar PDF: ${error.message}`);
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

// Chamar a inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initDynamicForm);