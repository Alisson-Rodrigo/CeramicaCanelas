console.log('Script js/lancamento.js DEFINIDO.');

// Variável global para rastrear qual lançamento está sendo editado via modal
let currentEditingLaunchId = null;

// =======================================================
// FUNÇÕES DE LIMPEZA E RESET DO FORMULÁRIO
// =======================================================
function resetFormCompletely() {
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('dueDate').value = '';
    document.getElementById('launchDate').value = new Date().toISOString().split('T')[0];
    resetClientSelection();
    resetCategorySelection();
    document.getElementById('categoryId').value = '';
    document.getElementById('customerId').value = '';
    resetSelectsToDefault();
}

function resetClientSelection() {
    document.getElementById('customerId').value = '';
    document.getElementById('selectedCustomerName').textContent = 'Nenhum cliente selecionado';
}

function resetCategorySelection() {
    document.getElementById('categoryId').value = '';
    document.getElementById('selectedCategoryName').textContent = 'Nenhuma categoria selecionada';
}

function resetSelectsToDefault() {
    const paymentSelect = document.getElementById('paymentMethod');
    const statusSelect = document.getElementById('status');
    if (paymentSelect.options.length > 0) {
        paymentSelect.selectedIndex = 0;
    }
    statusSelect.value = '1'; // "Pago"
    document.getElementById('group-dueDate').style.display = 'none';
}

function resetFormOnTypeChange() {
    resetFormCompletely();
}

// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de lancamento.js foi chamada.');
    initializeLaunchForm();
    initializeLaunchCategoryModal();
    initializeCustomerModal();
    initializeHistoryFilters();
    fetchAndRenderHistory(1);
}

// =======================================================
// LÓGICA DO FORMULÁRIO DE CADASTRO
// =======================================================
function initializeLaunchForm() {
    const typeSelection = document.getElementById('type-selection-group');
    const launchForm = document.getElementById('launchForm');
    const statusSelect = document.getElementById('status');

    populateEnumSelects();

    typeSelection.addEventListener('change', (event) => {
        if (event.target.name === 'Type') {
            updateFormVisibility(event.target.value);
        }
    });

    statusSelect.addEventListener('change', (event) => {
        const dueDateGroup = document.getElementById('group-dueDate');
        dueDateGroup.style.display = (event.target.value === '0') ? 'block' : 'none';
        if (event.target.value === '1') {
            document.getElementById('dueDate').value = '';
        }
    });

    launchForm.addEventListener('submit', handleLaunchSubmit);
}

function updateFormVisibility(type) {
    const launchForm = document.getElementById('launchForm');
    const categoryGroup = document.getElementById('group-categoryId');
    const customerGroup = document.getElementById('group-customerId');

    launchForm.style.display = 'block';
    resetFormOnTypeChange();

    if (type === '1') { // Entrada
        categoryGroup.style.display = 'none';
        customerGroup.style.display = 'block';
        document.querySelector('#group-categoryId label').innerHTML = "Categoria (Opcional)";
    } else if (type === '2') { // Saída
        categoryGroup.style.display = 'block';
        customerGroup.style.display = 'none';
        document.querySelector('#group-categoryId label').innerHTML = "Categoria <span style='color:red'>*</span>";
    }
}

function populateEnumSelects() {
    const paymentSelect = document.getElementById('paymentMethod');
    const statusSelect = document.getElementById('status');
    
    paymentSelect.innerHTML = '';
    statusSelect.innerHTML = '';

    for (const [key, value] of Object.entries(paymentMethodMap)) {
        paymentSelect.appendChild(new Option(value, key));
    }
    for (const [key, value] of Object.entries(statusMap)) {
        const option = new Option(value, key);
        if (key === '1') option.selected = true;
        statusSelect.appendChild(option);
    }
}

async function handleLaunchSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const selectedType = document.querySelector('input[name="Type"]:checked');
    if (!selectedType) {
        showErrorModal({ title: "Validação Falhou", detail: "Selecione Entrada ou Saída." });
        return;
    }

    const formData = new FormData(form);
    formData.set('Type', selectedType.value);

    if (selectedType.value === '1') { // Entrada
        if (!formData.get('CustomerId')) formData.delete('CustomerId');
        formData.delete('CategoryId');
    } else if (selectedType.value === '2') { // Saída
        if (!formData.get('CategoryId')) {
            showErrorModal({ title: "Validação Falhou", detail: "Selecione uma Categoria para lançamentos de Saída." });
            return;
        }
        formData.delete('CustomerId');
    }

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Lançamento salvo com sucesso!');
            form.reset();
            populateEnumSelects();
            resetClientSelection();
            resetCategorySelection();
            selectedType.checked = false;
            form.style.display = 'none';
            fetchAndRenderHistory(1);
        } else {
            const errorData = await response.json();
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
}

// =======================================================
// LÓGICA DAS MODAIS
// =======================================================
function initializeLaunchCategoryModal() {
    const modal = document.getElementById('categorySearchModal');
    const openBtn = document.getElementById('openCategoryModalBtn');
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector('.modal-close-btn');
    const filterBtn = modal.querySelector('#modalCategoryFilterBtn');

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'block';
        fetchAndRenderLaunchCategoriesInModal(1);
    });

    if (closeBtn) closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        currentEditingLaunchId = null; // Limpa o ID de edição ao fechar
    });
    if (filterBtn) filterBtn.addEventListener('click', () => fetchAndRenderLaunchCategoriesInModal(1));

    modal.querySelector('#modalCategoryResultsContainer').addEventListener('click', (event) => {
        if (event.target.classList.contains('select-category-btn')) {
            const categoryId = event.target.dataset.id;
            const categoryName = event.target.dataset.name;

            if (currentEditingLaunchId) {
                // Modo de edição: atualiza a linha da tabela
                const row = document.getElementById(`row-launch-${currentEditingLaunchId}`);
                if (row) {
                    const categoryCell = row.querySelector('[data-field="category"]');
                    categoryCell.querySelector('.edit-selection-name').textContent = categoryName;
                    categoryCell.dataset.newCategoryId = categoryId; // Armazena o novo ID para salvar
                }
                currentEditingLaunchId = null; // Reseta o rastreador
            } else {
                // Modo de cadastro: atualiza o formulário principal
                document.getElementById('selectedCategoryName').textContent = categoryName;
                document.getElementById('categoryId').value = categoryId;
            }
            
            modal.style.display = 'none';
        }
    });
}

function initializeCustomerModal() {
    const modal = document.getElementById('customerSearchModal');
    const openBtn = document.getElementById('openCustomerModalBtn');
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector('.modal-close-btn');
    const filterBtn = modal.querySelector('#modalCustomerFilterBtn');

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'block';
        fetchAndRenderCustomersInModal(1);
    });

    if (closeBtn) closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        currentEditingLaunchId = null; // Limpa o ID de edição ao fechar
    });
    if (filterBtn) filterBtn.addEventListener('click', () => fetchAndRenderCustomersInModal(1));

    modal.querySelector('#modalCustomerResultsContainer').addEventListener('click', (event) => {
        if (event.target.classList.contains('select-customer-btn')) {
            const customerId = event.target.dataset.id;
            const customerName = event.target.dataset.name;

            if (currentEditingLaunchId) {
                // Modo de edição: atualiza a linha da tabela
                const row = document.getElementById(`row-launch-${currentEditingLaunchId}`);
                if (row) {
                    const customerCell = row.querySelector('[data-field="customer"]');
                    customerCell.querySelector('.edit-selection-name').textContent = customerName;
                    customerCell.dataset.newCustomerId = customerId; // Armazena o novo ID para salvar
                }
                currentEditingLaunchId = null; // Reseta o rastreador
            } else {
                // Modo de cadastro: atualiza o formulário principal
                document.getElementById('selectedCustomerName').textContent = customerName;
                document.getElementById('customerId').value = customerId;
            }
            
            modal.style.display = 'none';
        }
    });
}

async function fetchAndRenderLaunchCategoriesInModal(page = 1) {
    // Implementação da busca de categorias (sem alterações)
    const resultsContainer = document.getElementById('modalCategoryResultsContainer');
    resultsContainer.innerHTML = '<p>Buscando...</p>';
    try {
        const accessToken = localStorage.getItem('accessToken');
        const search = document.getElementById('modalCategorySearchInput').value;
        const params = new URLSearchParams({ Page: page, PageSize: 5, OrderBy: 'Name' });
        if (search) params.append('Search', search);
        const url = `${API_BASE_URL}/financial/launch-categories/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha: ${response.status}`);
        const paginatedData = await response.json();
        renderLaunchCategoryModalResults(paginatedData.items, resultsContainer);
        renderLaunchCategoryModalPagination(paginatedData);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderLaunchCategoryModalResults(categories, container) {
    if (!categories || categories.length === 0) {
        container.innerHTML = '<p>Nenhuma categoria encontrada.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'results-table';
    table.innerHTML = `<thead><tr><th>Nome</th><th>Ação</th></tr></thead><tbody>
        ${categories.map(cat => `<tr><td>${cat.name}</td><td><button type="button" class="select-category-btn" data-id="${cat.id}" data-name="${cat.name}">Selecionar</button></td></tr>`).join('')}
    </tbody>`;
    container.innerHTML = '';
    container.appendChild(table);
}

function renderLaunchCategoryModalPagination(paginationData) {
    // Implementação da paginação da modal (sem alterações)
    const controlsContainer = document.getElementById('modalCategoryPaginationControls');
    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    const { page, totalPages } = paginationData;
    controlsContainer.innerHTML = `
        <button class="pagination-btn" onclick="fetchAndRenderLaunchCategoriesInModal(${page - 1})" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
        <span class="pagination-info">Página ${page} de ${totalPages}</span>
        <button class="pagination-btn" onclick="fetchAndRenderLaunchCategoriesInModal(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Próxima</button>
    `;
}

async function fetchAndRenderCustomersInModal(page = 1) {
    // Implementação da busca de clientes (sem alterações)
    const resultsContainer = document.getElementById('modalCustomerResultsContainer');
    resultsContainer.innerHTML = '<p>Buscando...</p>';
    try {
        const accessToken = localStorage.getItem('accessToken');
        const search = document.getElementById('modalCustomerSearchInput').value;
        const params = new URLSearchParams({ Page: page, PageSize: 5, OrderBy: 'Name' });
        if (search) params.append('Search', search);
        const url = `${API_BASE_URL}/financial/customer/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha: ${response.status}`);
        const paginatedData = await response.json();
        renderCustomerModalResults(paginatedData.items, resultsContainer);
        renderCustomerModalPagination(paginatedData);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderCustomerModalResults(customers, container) {
    if (!customers || customers.length === 0) {
        container.innerHTML = '<p>Nenhum cliente encontrado.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'results-table';
    table.innerHTML = `<thead><tr><th>Nome</th><th>Documento</th><th>Ação</th></tr></thead><tbody>
        ${customers.map(c => `<tr><td>${c.name}</td><td>${c.document || 'N/A'}</td><td><button type="button" class="select-customer-btn" data-id="${c.id}" data-name="${c.name}">Selecionar</button></td></tr>`).join('')}
    </tbody>`;
    container.innerHTML = '';
    container.appendChild(table);
}

function renderCustomerModalPagination(paginationData) {
    // Implementação da paginação da modal (sem alterações)
    const controlsContainer = document.getElementById('modalCustomerPaginationControls');
    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    const { page, totalPages } = paginationData;
    controlsContainer.innerHTML = `
        <button class="pagination-btn" onclick="fetchAndRenderCustomersInModal(${page - 1})" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
        <span class="pagination-info">Página ${page} de ${totalPages}</span>
        <button class="pagination-btn" onclick="fetchAndRenderCustomersInModal(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Próxima</button>
    `;
}


// =======================================================
// LÓGICA DA TABELA DE HISTÓRICO
// =======================================================
function initializeHistoryFilters() {
    const filterBtn = document.getElementById('historyFilterBtn');
    const clearBtn = document.getElementById('historyClearBtn');
    const typeSelect = document.getElementById('historyType');
    const statusSelect = document.getElementById('historyStatus');

    typeSelect.innerHTML = '<option value="">Todos os Tipos</option>';
    statusSelect.innerHTML = '<option value="">Todos os Status</option>';
    for (const [key, value] of Object.entries(launchTypeMap)) {
        typeSelect.appendChild(new Option(value, key));
    }
    for (const [key, value] of Object.entries(statusMap)) {
        statusSelect.appendChild(new Option(value, key));
    }

    if (filterBtn) filterBtn.onclick = () => fetchAndRenderHistory(1);
    if (clearBtn) clearBtn.onclick = () => {
        document.getElementById('historySearch').value = '';
        document.getElementById('historyStartDate').value = '';
        document.getElementById('historyEndDate').value = '';
        typeSelect.value = '';
        statusSelect.value = '';
        fetchAndRenderHistory(1);
    };
}

async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    const tableBody = document.querySelector('#launch-history-body');
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Buscando...</td></tr>`;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ Page: page, PageSize: 10, OrderBy: 'LaunchDate', Ascending: false });
        
        const search = document.getElementById('historySearch')?.value;
        const type = document.getElementById('historyType')?.value;
        const status = document.getElementById('historyStatus')?.value;
        const startDate = document.getElementById('historyStartDate')?.value;
        const endDate = document.getElementById('historyEndDate')?.value;
        
        if(search) params.append('Search', search);
        if(type) params.append('Type', type);
        if(status) params.append('Status', status);
        if(startDate) params.append('StartDate', startDate);
        if(endDate) params.append('EndDate', endDate);

        const url = `${API_BASE_URL}/financial/launch/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar lançamentos (Status: ${response.status})`);
        const paginatedData = await response.json();
        historyItemsCache = paginatedData.items;
        renderHistoryTable(paginatedData.items, tableBody);
        renderHistoryPagination(paginatedData);
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">${error.message}</td></tr>`;
    }
}


function renderHistoryTable(items, tableBody) {
    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Nenhum lançamento encontrado.</td></tr>`;
        return;
    }
    items.forEach(item => {
        const itemJsonString = JSON.stringify(item).replace(/'/g, "&apos;");
        const date = new Date(item.launchDate);
        const formattedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
        const formattedAmount = (item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // --- ALTERAÇÃO AQUI ---
        // Cria um HMTL customizado com emoji e cor para o tipo
        let typeDisplayHtml = 'N/A';
        if (item.type === 1) { // Entrada
            typeDisplayHtml = `<span class="type-indicator income">Entrada</span>`;
        } else if (item.type === 2) { // Saída
            typeDisplayHtml = `<span class="type-indicator expense">Saída</span>`;
        }
        // --- FIM DA ALTERAÇÃO ---
        
        const statusText = statusMap[item.status] || 'N/A';
        const operator = item.operatorName || 'Desconhecido';
        const amountClass = item.type === 1 ? 'income' : 'expense';
        const categoryName = item.categoryName || 'N/A';
        const customerName = item.customerName || 'N/A';

        const rowHTML = `
            <tr id="row-launch-${item.id}">
                <td data-field="type">${typeDisplayHtml}</td>
                <td data-field="description">${item.description}</td>
                <td data-field="amount" class="${amountClass}">${formattedAmount}</td>
                <td data-field="launchDate">${formattedDate}</td>
                <td data-field="category" data-category-id="${item.categoryId || ''}">${categoryName}</td>
                <td data-field="customer" data-customer-id="${item.customerId || ''}">${customerName}</td>
                <td data-field="status">${statusText}</td>
                <td data-field="operator">${operator}</td>
                <td class="actions-cell" data-field="actions">
                    <button class="btn-action btn-edit" onclick='editLaunch(${itemJsonString})'>Editar</button>
                    <button class="btn-action btn-delete" onclick="deleteLaunch('${item.id}')">Excluir</button>
                </td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', rowHTML);
    });
}
function renderHistoryPagination(paginationData) {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    const { page, totalPages } = paginationData;
    controlsContainer.innerHTML = `
        <button class="pagination-btn" onclick="fetchAndRenderHistory(${page - 1})" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
        <span class="pagination-info">Página ${page} de ${totalPages}</span>
        <button class="pagination-btn" onclick="fetchAndRenderHistory(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Próxima</button>
    `;
}

// =======================================================
// AÇÕES DA TABELA (EDITAR, DELETAR, SALVAR, CANCELAR)
// =======================================================
window.deleteLaunch = async (launchId) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch/${launchId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            alert('Lançamento excluído com sucesso!');
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Excluir" }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};

window.openCategoryModalForEdit = (launchId) => {
    currentEditingLaunchId = launchId;
    document.getElementById('categorySearchModal').style.display = 'block';
    fetchAndRenderLaunchCategoriesInModal(1);
};

window.openCustomerModalForEdit = (launchId) => {
    currentEditingLaunchId = launchId;
    document.getElementById('customerSearchModal').style.display = 'block';
    fetchAndRenderCustomersInModal(1);
};


window.editLaunch = (item) => {
    const row = document.getElementById(`row-launch-${item.id}`);
    if (!row || originalRowHTML_Launch[item.id]) return;
    
    originalRowHTML_Launch[item.id] = row.innerHTML;

    // Campos de texto e número
    row.querySelector('[data-field="description"]').innerHTML = `<textarea name="Description" class="edit-input">${item.description}</textarea>`;
    row.querySelector('[data-field="amount"]').innerHTML = `<input type="number" name="Amount" class="edit-input" value="${item.amount}" step="0.01">`;
    const isoDate = new Date(item.launchDate).toISOString().split('T')[0];
    row.querySelector('[data-field="launchDate"]').innerHTML = `<input type="date" name="LaunchDate" class="edit-input" value="${isoDate}">`;

    // Select de Status
    let statusOptions = '';
    for (const [key, value] of Object.entries(statusMap)) {
        statusOptions += `<option value="${key}" ${key == item.status ? 'selected' : ''}>${value}</option>`;
    }
    row.querySelector('[data-field="status"]').innerHTML = `<select name="Status" class="edit-input">${statusOptions}</select>`;

    // Categoria e Cliente (condicional)
    const categoryCell = row.querySelector('[data-field="category"]');
    const customerCell = row.querySelector('[data-field="customer"]');
    
    categoryCell.dataset.newCategoryId = item.categoryId || '';
    customerCell.dataset.newCustomerId = item.customerId || '';

    if (item.type === 2) { // Saída: Categoria é editável
        categoryCell.innerHTML = `
            <span class="edit-selection-name">${item.categoryName || 'N/A'}</span>
            <button type="button" class="btn-action btn-edit-modal" onclick="openCategoryModalForEdit('${item.id}')">Alterar</button>
        `;
    }
    if (item.type === 1) { // Entrada: Cliente é editável
        customerCell.innerHTML = `
            <span class="edit-selection-name">${item.customerName || 'N/A'}</span>
            <button type="button" class="btn-action btn-edit-modal" onclick="openCustomerModalForEdit('${item.id}')">Alterar</button>
        `;
    }

    // Botões de Ação
    row.querySelector('[data-field="actions"]').innerHTML = `
        <button class="btn-action btn-save" onclick="saveLaunchChanges('${item.id}')">Salvar</button>
        <button class="btn-action btn-cancel" onclick="cancelLaunchEdit('${item.id}')">Cancelar</button>
    `;
};


window.saveLaunchChanges = async (launchId) => {
    const row = document.getElementById(`row-launch-${launchId}`);
    if (!row) return;

    const originalItem = historyItemsCache.find(i => i.id === launchId);
    if (!originalItem) {
        showErrorModal({ title: "Erro", detail: "Não foi possível encontrar os dados originais." });
        return;
    }

    const formData = new FormData();
    formData.append('Id', launchId);
    formData.append('Description', row.querySelector('[name="Description"]').value);
    formData.append('Amount', row.querySelector('[name="Amount"]').value);
    formData.append('LaunchDate', row.querySelector('[name="LaunchDate"]').value);
    formData.append('Status', row.querySelector('[name="Status"]').value);
    
    // Preserva dados não editáveis
    formData.append('Type', originalItem.type);
    formData.append('PaymentMethod', originalItem.paymentMethod);

    // Pega Categoria/Cliente que podem ter sido alterados
    if (originalItem.type === 2) { // Saída
        const newCategoryId = row.querySelector('[data-field="category"]').dataset.newCategoryId;
        if (newCategoryId) formData.append('CategoryId', newCategoryId);
    }
    if (originalItem.type === 1) { // Entrada
        const newCustomerId = row.querySelector('[data-field="customer"]').dataset.newCustomerId;
        if (newCustomerId) formData.append('CustomerId', newCustomerId);
    }

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });
        if (response.ok) {
            alert('Lançamento atualizado com sucesso!');
            delete originalRowHTML_Launch[launchId];
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Salvar" }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
        cancelLaunchEdit(launchId);
    }
};

window.cancelLaunchEdit = (launchId) => {
    const row = document.getElementById(`row-launch-${launchId}`);
    if (row && originalRowHTML_Launch[launchId]) {
        row.innerHTML = originalRowHTML_Launch[launchId];
        delete originalRowHTML_Launch[launchId];
    }
};