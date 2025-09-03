console.log('Script js/vendas-pendentes.js DEFINIDO.');


// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de vendas-pendentes.js foi chamada.');
    initializeFilters();
    fetchReportData(1);
}

function initializeFilters() {
    document.getElementById('searchButton')?.addEventListener('click', () => fetchReportData(1));
    document.getElementById('clearButton')?.addEventListener('click', clearFilters);
    
    const paymentSelect = document.getElementById('payment-method-filter');
    if (paymentSelect && typeof paymentMethodMap !== 'undefined') {
        paymentSelect.innerHTML = '<option value="">Todos</option>';
        for (const [key, value] of Object.entries(paymentMethodMap)) {
            paymentSelect.appendChild(new Option(value, key));
        }
    }
}

function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('payment-method-filter').value = '';
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

        const params = new URLSearchParams({ Page: currentPage, PageSize: 10 });
        
        const search = document.getElementById('search-input')?.value;
        const paymentMethod = document.getElementById('payment-method-filter')?.value;
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        
        if (search) params.append('Search', search);
        if (paymentMethod) params.append('PaymentMethod', paymentMethod);
        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);

        const url = `${API_BASE_URL}/sales/pending/paged?${params.toString()}`;
        
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

    items.forEach(item => {
        const date = new Date(item.saleDate);
        const formattedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
        const formattedTotal = (item.totalNet || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.noteNumber || 'N/A'}</td>
            <td>${item.customerName || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>${item.customerPhone || 'N/A'}</td>
            <td>${item.itemsCount || 0}</td>
            <td>${formattedTotal}</td>
            <td class="actions-cell">
                <button class="btn-action btn-success" onclick="markSaleAsPaid('${item.id}')">Marcar como Pago</button>
            </td>
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

// =======================================================
// FUNÇÃO PARA MARCAR COMO PAGO (CORRIGIDA)
// =======================================================
window.markSaleAsPaid = async (saleId) => {
    if (!confirm('Tem certeza que deseja marcar esta venda como paga?')) return;

    try {
        const accessToken = localStorage.getItem('accessToken');
        const url = `${API_BASE_URL}/sales/${saleId}/pay`;
        
        const response = await fetch(url, {
            method: 'POST', // CORREÇÃO: A rota é POST, não PUT
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            alert('Venda atualizada para "Confirmada" com sucesso!');
            fetchReportData(currentPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro" }));
            showErrorModal({ title: "Falha ao Atualizar", detail: errorData.message || "Não foi possível marcar como pago."});
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};