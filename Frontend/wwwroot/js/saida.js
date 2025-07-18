// Defina a URL base da sua API aqui.

// ===== VARIÁVEIS GLOBAIS =====


/**
 * =======================================================
 * INICIALIZAÇÃO PRINCIPAL
 * =======================================================
 */
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de saida_produto.js foi chamada.');
    
    initializeExitForm();
    initializeProductModal();
    initializeEmployeeModal();
    initializeHistoryFilters();
    loadProductCategories(document.getElementById('historyCategoryFilter'), 'Todas as Categorias')
        .then(() => {
            fetchAndRenderHistory(1);
        });
}

/**
 * =======================================================
 * LÓGICA DO FORMULÁRIO DE CADASTRO (CARRINHO)
 * =======================================================
 */
function initializeExitForm() {
    const exitForm = document.getElementById('productExitForm');
    if (!exitForm) return;

    exitForm.addEventListener('submit', handleFormSubmit);
    
    document.getElementById('exitItemsTbody')?.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-remove')) {
            event.target.closest('tr').remove();
            checkPlaceholder();
        }
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const employeeId = document.getElementById('employeeId')?.value;
    const observation = document.getElementById('observation')?.value;
    const itemRows = document.querySelectorAll('#exitItemsTbody tr:not(#placeholder-row)');

    if (!employeeId) {
        alert('Por favor, selecione um funcionário responsável.');
        return;
    }
    if (itemRows.length === 0) {
        alert('Adicione pelo menos um produto à lista de saída.');
        return;
    }

    const exitItems = [];
    for (const row of itemRows) {
        const quantityInput = row.querySelector('input[type="number"]');
        const quantity = quantityInput ? quantityInput.value : 0;
        if (!quantity || parseInt(quantity) <= 0) {
            alert(`Por favor, insira uma quantidade válida para o produto "${row.dataset.productName}".`);
            return;
        }
        exitItems.push({
            ProductId: row.dataset.productId,
            Quantity: parseInt(quantity),
            IsReturnable: row.querySelector('input[type="checkbox"]').checked,
        });
    }

    const requests = exitItems.map(item => {
        const formData = new FormData();
        formData.append('ProductId', item.ProductId);
        formData.append('EmployeeId', employeeId);
        formData.append('Quantity', item.Quantity);
        formData.append('IsReturnable', item.IsReturnable);
        formData.append('Observation', observation);
        return sendExitRequest(formData);
    });

    try {
        await Promise.all(requests);
        alert('Todas as saídas foram registradas com sucesso!');
        document.getElementById('productExitForm').reset();
        document.getElementById('exitItemsTbody').innerHTML = '<tr id="placeholder-row"><td colspan="4" style="text-align: center; color: #888;">Nenhum produto adicionado.</td></tr>';
        document.getElementById('selectedEmployeeName').textContent = 'Nenhum funcionário selecionado';
        fetchAndRenderHistory(1);
    } catch (error) {
        console.error("Falha ao registrar uma ou mais saídas:", error);
        alert(`Erro ao registrar saídas: ${error.message}.`);
    }
}

async function sendExitRequest(formData) {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/products-exit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
    });
    if (!response.ok) {
        let errorMsg = `Erro ${response.status}: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.title || JSON.stringify(errorData);
        } catch (e) {
            console.warn("Não foi possível parsear a resposta de erro como JSON.");
        }
        throw new Error(errorMsg);
    }
    return true;
}

/**
 * =======================================================
 * LÓGICA DOS MODAIS DE BUSCA E TABELA DE ITENS
 * =======================================================
 */
async function loadProductCategories(selectElement, defaultOptionText = 'Selecione uma categoria') {
    if (!selectElement) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/categories`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Falha ao carregar categorias.');
        const categories = await response.json();
        selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
        categories.forEach(category => {
            const option = new Option(category.name, category.id);
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        selectElement.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

function addProductToExitTable(product) {
    const tbody = document.getElementById('exitItemsTbody');
    if (!tbody) return;
    if (document.querySelector(`tr[data-product-id="${product.id}"]`)) {
        alert('Este produto já foi adicionado à lista.');
        return;
    }
    checkPlaceholder();
    const newRow = document.createElement('tr');
    newRow.dataset.productId = product.id;
    newRow.dataset.productName = product.name;
    newRow.innerHTML = `
        <td>${product.name}</td>
        <td><input type="number" class="form-control" value="1" min="1"></td>
        <td><input type="checkbox"></td>
        <td><button type="button" class="btn-remove">Remover</button></td>
    `;
    tbody.appendChild(newRow);
}

function checkPlaceholder() {
    const tbody = document.getElementById('exitItemsTbody');
    if(!tbody) return;
    const placeholder = document.getElementById('placeholder-row');
    if (placeholder && tbody.querySelectorAll('tr:not(#placeholder-row)').length > 0) {
        placeholder.remove();
    } else if (!placeholder && tbody.children.length === 0) {
        tbody.innerHTML = '<tr id="placeholder-row"><td colspan="4" style="text-align: center; color: #888;">Nenhum produto adicionado.</td></tr>';
    }
}

function initializeProductModal() {
    const config = {
        modal: document.getElementById('productSearchModal'),
        openBtn: document.getElementById('openProductModalBtn'),
        searchInput: document.getElementById('modalProductSearchInput'),
        resultsContainer: document.getElementById('modalProductResultsContainer'),
        paginationContainer: document.getElementById('modalProductPaginationControls')
    };
    if (!config.modal || !config.openBtn) return;

    const closeBtn = config.modal.querySelector('.modal-close-btn');
    
    config.openBtn.addEventListener('click', () => { 
        currentProductModalPage = 1;
        config.modal.style.display = 'block'; 
        fetchPaginatedProducts(config, currentProductModalPage); 
    });
    
    if(closeBtn) closeBtn.addEventListener('click', () => { config.modal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === config.modal) config.modal.style.display = 'none'; });
    
    if (config.searchInput) {
        let timeout;
        config.searchInput.addEventListener('input', () => { 
            clearTimeout(timeout); 
            timeout = setTimeout(() => {
                currentProductModalPage = 1;
                fetchPaginatedProducts(config, currentProductModalPage);
            }, 500); 
        });
    }
    
    config.resultsContainer?.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-select-product')) {
            const product = JSON.parse(event.target.dataset.product);
            addProductToExitTable(product);
            config.modal.style.display = 'none';
        }
    });
}

async function fetchPaginatedProducts(config, page) {
    currentProductModalPage = page;
    const searchTerm = config.searchInput ? config.searchInput.value : '';
    config.resultsContainer.innerHTML = '<p>Buscando...</p>';
    config.paginationContainer.innerHTML = '';
    
    const params = new URLSearchParams({ Page: page, PageSize: 5, Search: searchTerm });
    const url = `${API_BASE_URL}/products/paged?${params.toString()}`;
    
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error('Falha ao buscar produtos.');
        
        const data = await response.json();
        const tableHTML = (data.items && data.items.length > 0) 
            ? `<table class="items-table"><thead><tr><th>Nome</th><th>Estoque</th><th>Ação</th></tr></thead><tbody>${data.items.map(p => `<tr><td>${p.name}</td><td>${p.stockCurrent || 0}</td><td><button type="button" class="btn-select-product" data-product='${JSON.stringify(p)}'>Selecionar</button></td></tr>`).join('')}</tbody></table>`
            : `<p>Nenhum produto encontrado.</p>`;
        config.resultsContainer.innerHTML = tableHTML;
        
        renderProductModalPagination(config, data);
    } catch (error) {
        config.resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderProductModalPagination(config, paginationData) {
    const controlsContainer = config.paginationContainer;
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    
    paginationData.totalPages = Math.ceil(paginationData.totalItems / paginationData.pageSize);
    if (isNaN(paginationData.totalPages) || paginationData.totalPages <= 1) return;

    const hasPreviousPage = paginationData.page > 1;
    const hasNextPage = paginationData.page < paginationData.totalPages;

    let paginationHTML = '';
    if (hasPreviousPage) {
        paginationHTML += `<button class="pagination-btn" data-page="${paginationData.page - 1}">Anterior</button>`;
    }
    paginationHTML += `<span style="margin: 0 15px;">Página ${paginationData.page} de ${paginationData.totalPages}</span>`;
    if (hasNextPage) {
        paginationHTML += `<button class="pagination-btn" data-page="${paginationData.page + 1}">Próxima</button>`;
    }
    controlsContainer.innerHTML = paginationHTML;

    controlsContainer.querySelectorAll('.pagination-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const newPage = parseInt(event.target.dataset.page);
            fetchPaginatedProducts(config, newPage);
        });
    });
}

function initializeEmployeeModal() {
    const config = {
        modal: document.getElementById('employeeSearchModal'),
        openBtn: document.getElementById('openEmployeeModalBtn'),
        searchInput: document.getElementById('modalEmployeeSearchInput'),
        resultsContainer: document.getElementById('modalEmployeeResultsContainer'),
    };
    if (!config.modal || !config.openBtn) return;
    const closeBtn = config.modal.querySelector('.modal-close-btn');
    config.openBtn.addEventListener('click', () => { config.modal.style.display = 'block'; fetchAllEmployees(config); });
    if(closeBtn) closeBtn.addEventListener('click', () => { config.modal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === config.modal) config.modal.style.display = 'none'; });
    if (config.searchInput) {
        config.searchInput.addEventListener('input', () => renderFilteredEmployees(config));
    }
    config.resultsContainer?.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-select-employee')) {
            document.getElementById('employeeId').value = event.target.dataset.id;
            document.getElementById('selectedEmployeeName').textContent = event.target.dataset.name;
            config.modal.style.display = 'none';
        }
    });
}

async function fetchAllEmployees(config) {
    if (allEmployees.length > 0) {
        renderFilteredEmployees(config);
        return;
    }
    config.resultsContainer.innerHTML = '<p>Buscando funcionários...</p>';
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/employees`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error('Falha ao buscar funcionários.');
        allEmployees = await response.json();
        renderFilteredEmployees(config);
    } catch (error) {
        config.resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderFilteredEmployees(config) {
    const filter = config.searchInput ? config.searchInput.value.toLowerCase() : '';
    const filteredList = allEmployees.filter(e => e.name.toLowerCase().includes(filter));
    if (filteredList.length === 0) {
        config.resultsContainer.innerHTML = '<p>Nenhum funcionário encontrado.</p>';
        return;
    }
    config.resultsContainer.innerHTML = `
        <table class="items-table">
            <thead><tr><th>Nome</th><th>Cargo</th><th>Ação</th></tr></thead>
            <tbody>${filteredList.map(e => `<tr><td>${e.name}</td><td>${e.role || 'N/A'}</td><td><button type="button" class="btn-select-employee" data-id="${e.id}" data-name="${e.name}">Selecionar</button></td></tr>`).join('')}</tbody>
        </table>`;
}

/**
 * =======================================================
 * LÓGICA DO HISTÓRICO DE SAÍDAS
 * =======================================================
 */
function initializeHistoryFilters() {
    document.getElementById('historyFilterBtn')?.addEventListener('click', () => fetchAndRenderHistory(1));
    document.getElementById('historyClearFilterBtn')?.addEventListener('click', () => {
        document.getElementById('historySearchInput').value = '';
        document.getElementById('historyCategoryFilter').value = '';
        document.getElementById('historyOrderBySelect').value = 'ExitDate';
        document.getElementById('historyAscendingSelect').value = 'false';
        fetchAndRenderHistory(1);
    });
}

async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    const tableBody = document.getElementById('historyTbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Buscando histórico...</td></tr>';
    
    try {
        const accessToken = localStorage.getItem('accessToken');
        const search = document.getElementById('historySearchInput')?.value;
        const categoryId = document.getElementById('historyCategoryFilter')?.value;
        const orderBy = document.getElementById('historyOrderBySelect')?.value;
        const ascending = document.getElementById('historyAscendingSelect')?.value;

        const params = new URLSearchParams({ Page: currentHistoryPage, PageSize: 10 });
        if (search) params.append('Search', search);
        if (categoryId) params.append('CategoryId', categoryId);
        if (orderBy) params.append('OrderBy', orderBy);
        if (ascending) params.append('Ascending', ascending);

        const url = `${API_BASE_URL}/products-exit/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar histórico (Status: ${response.status})`);

        const paginatedData = await response.json();
        paginatedData.totalPages = Math.ceil(paginatedData.totalItems / paginatedData.pageSize);

        renderHistoryTable(paginatedData.items);
        renderHistoryPagination(paginatedData);
    } catch (error) {
        console.error("❌ Erro ao buscar histórico:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">${error.message}</td></tr>`;
        document.getElementById('historyPaginationControls').innerHTML = '';
    }
}

function renderHistoryTable(items) {
    const tableBody = document.getElementById('historyTbody');
    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum registro de saída encontrado.</td></tr>';
        return;
    }
    items.forEach(item => {
        const exitDate = new Date(item.exitDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const isReturnableText = item.isReturnable ? 'Sim' : 'Não';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.productName || 'N/A'}</td>
            <td>${item.employeeName || 'N/A'}</td>
            <td>${item.quantity}</td>
            <td>${exitDate}</td>
            <td>${isReturnableText}</td>
        `;
        tableBody.appendChild(row);
    });
}

function renderHistoryPagination(paginationData) {
    const controlsContainer = document.getElementById('historyPaginationControls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || isNaN(paginationData.totalPages) || paginationData.totalPages <= 1) return;

    const hasPreviousPage = paginationData.page > 1;
    const hasNextPage = paginationData.page < paginationData.totalPages;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.disabled = !hasPreviousPage;
    prevButton.addEventListener('click', () => fetchAndRenderHistory(paginationData.page - 1));

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${paginationData.page} de ${paginationData.totalPages}`;
    pageInfo.style.margin = "0 15px";

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.disabled = !hasNextPage;
    nextButton.addEventListener('click', () => fetchAndRenderHistory(paginationData.page + 1));
    
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}

// --- EXECUÇÃO PRINCIPAL ---
document.addEventListener('DOMContentLoaded', initDynamicForm);