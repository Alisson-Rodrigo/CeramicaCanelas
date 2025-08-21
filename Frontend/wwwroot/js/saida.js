console.log('Script js/saida.js DEFINIDO.');

function initDynamicForm() {
    console.log('▶️ initDynamicForm() de saida.js foi chamada.');

    // ✅ VERIFICAÇÃO ADICIONADA: Só executa se os elementos da página de saída existirem
    const exitForm = document.getElementById('productExitForm');
    const historyTbody = document.getElementById('historyTbody');

    if (!exitForm || !historyTbody) {
        console.log('⚠️ Elementos da página de saída não encontrados. Pulando inicialização.');
        return;
    }

    initializeExitForm();
    initializeProductModal();
    initializeEmployeeModal();
    initializeHistoryFilters();
    initializeHistoryTableListeners();

    const categoryFilter = document.getElementById('historyCategoryFilter');
    if (categoryFilter) {
        loadProductCategories(categoryFilter, 'Todas as Categorias')
            .then(() => {
                fetchAndRenderHistory(1);
            })
            .catch(() => {
                console.log('⚠️ Erro ao carregar categorias, mas continuando...');
                fetchAndRenderHistory(1);
            });
    } else {
        fetchAndRenderHistory(1);
    }
}

// =======================================================
// LÓGICA DO FORMULÁRIO DE SAÍDA (CARRINHO)
// =======================================================
function initializeExitForm() {
    const exitForm = document.getElementById('productExitForm');
    if (!exitForm) return;

    exitForm.addEventListener('submit', handleFormSubmit);

    const exitItemsTbody = document.getElementById('exitItemsTbody');
    if (exitItemsTbody) {
        exitItemsTbody.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-delete')) {
                event.target.closest('tr').remove();
                checkPlaceholder();
            }
        });
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const employeeIdInput = document.getElementById('employeeId');
    const observationInput = document.getElementById('observation');
    const itemRows = document.querySelectorAll('#exitItemsTbody tr:not(#placeholder-row)');

    const employeeId = employeeIdInput ? employeeIdInput.value : '';
    const observation = observationInput ? observationInput.value : '';

    if (!employeeId) {
        showErrorModal({ title: "Validação Falhou", detail: "Por favor, selecione um funcionário responsável." });
        return;
    }
    if (itemRows.length === 0) {
        showErrorModal({ title: "Validação Falhou", detail: "Adicione pelo menos um produto à lista de saída." });
        return;
    }

    const exitItems = [];
    for (const row of itemRows) {
        const quantityInput = row.querySelector('input[type="number"]');
        const quantity = quantityInput ? quantityInput.value : 0;
        if (!quantity || parseInt(quantity) <= 0) {
            showErrorModal({ title: "Validação Falhou", detail: `Por favor, insira uma quantidade válida para o produto "${row.dataset.productName}".` });
            return;
        }
        exitItems.push({
            ProductId: row.dataset.productId,
            Quantity: parseInt(quantity),
            IsReturnable: row.querySelector('input[type="checkbox"]').checked,
        });
    }

    const submitButton = document.querySelector('.submit-btn');
    if (!submitButton) return;

    const originalButtonHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="loading-spinner"></span> Registrando...`;

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
        const exitForm = document.getElementById('productExitForm');
        const exitItemsTbody = document.getElementById('exitItemsTbody');
        const selectedEmployeeName = document.getElementById('selectedEmployeeName');

        if (exitForm) exitForm.reset();
        if (exitItemsTbody) exitItemsTbody.innerHTML = '<tr id="placeholder-row"><td colspan="4" style="text-align: center; color: #888;">Nenhum produto adicionado.</td></tr>';
        if (selectedEmployeeName) selectedEmployeeName.textContent = 'Nenhum funcionário selecionado';
        fetchAndRenderHistory(1);
    } catch (error) {
        console.error("Falha ao registrar uma ou mais saídas:", error);
        showErrorModal({ title: "Erro ao Registrar Saídas", detail: error.message });
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHTML;
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
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Erro ${response.status}`);
    }
    return true;
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
        <td><input type="number" class="form-input" value="1" min="1"></td>
        <td><input type="checkbox" class="form-checkbox"></td>
        <td><button type="button" class="btn-action btn-delete">Remover</button></td>
    `;
    tbody.appendChild(newRow);
}

function checkPlaceholder() {
    const tbody = document.getElementById('exitItemsTbody');
    if (!tbody) return;
    const placeholder = document.getElementById('placeholder-row');
    if (placeholder && tbody.querySelectorAll('tr:not(#placeholder-row)').length > 0) {
        placeholder.style.display = 'none';
    } else if (!placeholder && tbody.children.length === 0) {
        tbody.innerHTML = '<tr id="placeholder-row"><td colspan="4" style="text-align: center; color: #888;">Nenhum produto adicionado.</td></tr>';
    } else if (placeholder) {
        placeholder.style.display = 'table-row';
    }
}

// =======================================================
// LÓGICA DA MODAL DE BUSCA DE PRODUTOS
// =======================================================
function initializeProductModal() {
    const modal = document.getElementById('productSearchModal');
    const openBtn = document.getElementById('openProductModalBtn');
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector('.modal-close-btn');
    const filterBtn = modal.querySelector('#modalProductFilterBtn');

    openBtn.addEventListener('click', () => {
        currentProductModalPage = 1;
        modal.style.display = 'block';
        const modalCategoryFilter = modal.querySelector('#modalProductCategoryFilter');
        if (modalCategoryFilter) {
            loadProductCategories(modalCategoryFilter, 'Todas as Categorias')
                .then(() => fetchPaginatedProducts(1))
                .catch(() => fetchPaginatedProducts(1));
        } else {
            fetchPaginatedProducts(1);
        }
    });

    if (filterBtn) filterBtn.addEventListener('click', () => fetchPaginatedProducts(1));
    if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    const resultsContainer = modal.querySelector('#modalProductResultsContainer');
    if (resultsContainer) {
        resultsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-select-product')) {
                const product = JSON.parse(event.target.dataset.product);
                addProductToExitTable(product);
                modal.style.display = 'none';
            }
        });
    }
}

async function fetchPaginatedProducts(page) {
    currentProductModalPage = page;
    const resultsContainer = document.getElementById('modalProductResultsContainer');
    const paginationContainer = document.getElementById('modalProductPaginationControls');
    if (!resultsContainer || !paginationContainer) return;

    resultsContainer.innerHTML = '<p>Buscando...</p>';
    paginationContainer.innerHTML = '';

    const searchInput = document.getElementById('modalProductSearchInput');
    const categoryFilter = document.getElementById('modalProductCategoryFilter');
    const orderBySelect = document.getElementById('modalProductOrderBySelect');

    const search = searchInput ? searchInput.value : '';
    const categoryId = categoryFilter ? categoryFilter.value : '';
    const orderBy = orderBySelect ? orderBySelect.value : 'Name';

    const params = new URLSearchParams({ Page: page, PageSize: 5, OrderBy: orderBy });
    if (search) params.append('Search', search);
    if (categoryId) params.append('CategoryId', categoryId);

    const url = `${API_BASE_URL}/products/paged?${params.toString()}`;

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error('Falha ao buscar produtos.');

        const data = await response.json();
        const tableHTML = (data.items && data.items.length > 0)
            ? `<table class="results-table"><thead><tr><th>Nome</th><th>Estoque</th><th>Ação</th></tr></thead><tbody>${data.items.map(p => `<tr><td>${p.name}</td><td>${p.stockCurrent || 0}</td><td><button type="button" class="btn-action btn-select-product" data-product='${JSON.stringify(p)}'>Selecionar</button></td></tr>`).join('')}</tbody></table>`
            : `<p>Nenhum produto encontrado.</p>`;
        resultsContainer.innerHTML = tableHTML;

        renderProductModalPagination(data);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderProductModalPagination(paginationData) {
    const controlsContainer = document.getElementById('modalProductPaginationControls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';

    if (!paginationData.totalPages) paginationData.totalPages = Math.ceil(paginationData.totalItems / paginationData.pageSize);
    if (isNaN(paginationData.totalPages) || paginationData.totalPages <= 1) return;

    const hasPreviousPage = paginationData.page > 1;
    const hasNextPage = paginationData.page < paginationData.totalPages;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = !hasPreviousPage;
    prevButton.addEventListener('click', () => fetchPaginatedProducts(paginationData.page - 1));

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${paginationData.page} de ${paginationData.totalPages}`;

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = !hasNextPage;
    nextButton.addEventListener('click', () => fetchPaginatedProducts(paginationData.page + 1));

    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}

// =======================================================
// LÓGICA DA MODAL DE BUSCA DE FUNCIONÁRIOS
// =======================================================
function initializeEmployeeModal() {
    const modal = document.getElementById('employeeSearchModal');
    const openBtn = document.getElementById('openEmployeeModalBtn');
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector('.modal-close-btn');
    const filterBtn = modal.querySelector('#modalEmployeeFilterBtn');
    const positionSelect = modal.querySelector('#modalEmployeePositionFilter');

    if (positionSelect) populatePositionFilter(positionSelect);

    openBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        fetchPaginatedEmployees(1);
    });
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (filterBtn) filterBtn.addEventListener('click', () => fetchPaginatedEmployees(1));

    const resultsContainer = modal.querySelector('#modalEmployeeResultsContainer');
    if (resultsContainer) {
        resultsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-select-employee')) {
                const employeeIdInput = document.getElementById('employeeId');
                const selectedEmployeeName = document.getElementById('selectedEmployeeName');
                if (employeeIdInput) employeeIdInput.value = event.target.dataset.id;
                if (selectedEmployeeName) selectedEmployeeName.textContent = event.target.dataset.name;
                modal.style.display = 'none';
            }
        });
    }
}

function populatePositionFilter(selectElement) {
    if (!selectElement) return;
    if (typeof positionMap !== 'undefined') {
        selectElement.innerHTML = '<option value="">Todos os Cargos</option>';
        for (const [key, value] of Object.entries(positionMap)) {
            const option = new Option(value, key);
            selectElement.appendChild(option);
        }
    }
}

async function fetchPaginatedEmployees(page = 1) {
    currentEmployeeModalPage = page;
    const resultsContainer = document.getElementById('modalEmployeeResultsContainer');
    const paginationContainer = document.getElementById('modalEmployeePaginationControls');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<p>Buscando...</p>';
    if (paginationContainer) paginationContainer.innerHTML = '';

    try {
        const accessToken = localStorage.getItem('accessToken');
        const searchInput = document.getElementById('modalEmployeeSearchInput');
        const positionFilter = document.getElementById('modalEmployeePositionFilter');

        const search = searchInput ? searchInput.value : '';
        const position = positionFilter ? positionFilter.value : '';
        const params = new URLSearchParams({ Page: page, PageSize: 10, OrderBy: 'Name' });
        if (search) params.append('Search', search);
        if (position) params.append('Positions', position);
        const url = `${API_BASE_URL}/employees/pages?${params.toString()}`;

        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar funcionários (Status: ${response.status})`);

        const paginatedData = await response.json();
        renderEmployeeModalResults(paginatedData.items);
        renderEmployeeModalPagination(paginatedData);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderEmployeeModalResults(employees) {
    const container = document.getElementById('modalEmployeeResultsContainer');
    if (!container) return;

    if (!employees || employees.length === 0) {
        container.innerHTML = '<p>Nenhum funcionário encontrado.</p>';
        return;
    }
    const tableHTML = `<table class="results-table"><thead><tr><th>Nome</th><th>Cargo</th><th>Ação</th></tr></thead>
        <tbody>${employees.map(e => `<tr><td>${e.name}</td><td>${getPositionName(e.positions)}</td><td><button type="button" class="btn-action btn-select-employee" data-id="${e.id}" data-name="${e.name}">Selecionar</button></td></tr>`).join('')}</tbody>
    </table>`;
    container.innerHTML = tableHTML;
}

function renderEmployeeModalPagination(paginationData) {
    const controlsContainer = document.getElementById('modalEmployeePaginationControls');
    if (!controlsContainer || paginationData.totalPages <= 1) {
        if (controlsContainer) controlsContainer.innerHTML = '';
        return;
    }

    const page = paginationData.page;
    const totalPages = paginationData.totalPages;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = page <= 1;
    prevButton.addEventListener('click', () => fetchPaginatedEmployees(page - 1));

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.addEventListener('click', () => fetchPaginatedEmployees(page + 1));

    controlsContainer.innerHTML = '';
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}

// =======================================================
// LÓGICA DO HISTÓRICO DE SAÍDAS (COM CRUD)
// =======================================================
function initializeHistoryFilters() {
    const filterBtn = document.getElementById('historyFilterBtn');
    const clearBtn = document.getElementById('historyClearFilterBtn');
    if (filterBtn) filterBtn.addEventListener('click', () => fetchAndRenderHistory(1));
    if (clearBtn) clearBtn.addEventListener('click', () => {
        const searchInput = document.getElementById('historySearchInput');
        const categoryFilter = document.getElementById('historyCategoryFilter');
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        fetchAndRenderHistory(1);
    });
}

function initializeHistoryTableListeners() {
    const tableBody = document.getElementById('historyTbody');
    if (!tableBody) return;
    tableBody.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('btn-delete')) {
            event.preventDefault();
            const exitId = target.dataset.id;
            deleteHistoryItem(exitId);
        }
        if (target.classList.contains('btn-edit')) {
            event.preventDefault();
            const exitId = target.dataset.id;
            const item = historyItemsCache.find(i => i.id === exitId);
            if (item) {
                editHistoryItem(item);
            }
        }
    });
}

async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    const tableBody = document.getElementById('historyTbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Buscando histórico...</td></tr>';
    try {
        const accessToken = localStorage.getItem('accessToken');
        const searchInput = document.getElementById('historySearchInput');
        const categoryFilter = document.getElementById('historyCategoryFilter');

        const search = searchInput ? searchInput.value : '';
        const categoryId = categoryFilter ? categoryFilter.value : '';
        const params = new URLSearchParams({ Page: currentHistoryPage, PageSize: 10, OrderBy: 'ExitDate', Ascending: false });
        if (search) params.append('Search', search);
        if (categoryId) params.append('CategoryId', categoryId);
        const url = `${API_BASE_URL}/products-exit/paged?${params.toString()}`;

        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar histórico (Status: ${response.status})`);

        const api = await response.json();

        // usa exatamente o que veio da API (sem calcular no front)
        const data = {
            page: api.page ?? api.Page ?? 1,
            pageSize: api.pageSize ?? api.PageSize ?? 10,
            totalPages: api.totalPages ?? api.TotalPages ?? 1,
            items: api.items ?? api.Items ?? []
        };

        // mantém a página atual
        currentHistoryPage = data.page;

        historyItemsCache = data.items;
        renderHistoryTable(data.items);
        renderHistoryPagination(data);

    } catch (error) {
        showErrorModal({ title: "Erro ao Listar Histórico", detail: error.message });
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">${error.message}</td></tr>`;
        const paginationControls = document.getElementById('historyPaginationControls');
        if (paginationControls) paginationControls.innerHTML = '';
    }
}

function renderHistoryTable(items) {
    const tableBody = document.getElementById('historyTbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum registro de saída encontrado.</td></tr>';
        return;
    }
    items.forEach(item => {
        const exitDate = new Date(item.exitDate).toLocaleDateString('pt-BR');
        const isReturnableText = item.isReturnable ? 'Sim' : 'Não';
        const row = document.createElement('tr');
        row.id = `row-history-${item.id}`;
        row.innerHTML = `
            <td data-field="productName">${item.productName || 'N/A'}</td>
            <td data-field="employeeName">${item.employeeName || 'N/A'}</td>
            <td data-field="quantity">${item.quantity}</td>
            <td data-field="exitDate">${exitDate}</td>
            <td data-field="isReturnable">${isReturnableText}</td>
            <td data-field="observation" style="max-width: 200px; white-space: pre-wrap; word-break: break-word;">${item.observation || ''}</td>
            <td data-field="insertedBy">${item.insertedBy || 'N/A'}</td>
            <td class="actions-cell" data-field="actions">
                <button class="btn-action btn-edit" data-id="${item.id}">Editar</button>
                <button class="btn-action btn-delete" data-id="${item.id}">Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderHistoryPagination({ page, totalPages }) {
    const controlsContainer = document.getElementById('historyPaginationControls');
    if (!controlsContainer) return;

    controlsContainer.innerHTML = '';
    if (totalPages <= 1) return;

    const hasPrev = page > 1;
    const hasNext = page < totalPages;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = !hasPrev;
    prevButton.addEventListener('click', () => fetchAndRenderHistory(page - 1));

    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Página ${page} de ${totalPages}`;

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = !hasNext;
    nextButton.addEventListener('click', () => fetchAndRenderHistory(page + 1));

    controlsContainer.append(prevButton, pageInfo, nextButton);
}


window.deleteHistoryItem = async (exitId) => {
    if (!confirm('Tem certeza que deseja excluir este registro? A ação não pode ser desfeita.')) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/products-exit/${exitId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (response.ok) {
            alert('Registro excluído com sucesso!');
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Excluir", detail: "Não foi possível processar a exclusão." }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};

window.editHistoryItem = (item) => {
    const row = document.getElementById(`row-history-${item.id}`);
    if (!row || originalHistoryRowHTML[item.id]) return;

    originalHistoryRowHTML[item.id] = row.innerHTML;

    const quantityField = row.querySelector('[data-field="quantity"]');
    const isReturnableField = row.querySelector('[data-field="isReturnable"]');
    const observationField = row.querySelector('[data-field="observation"]');
    const actionsField = row.querySelector('[data-field="actions"]');

    if (quantityField) quantityField.innerHTML = `<input type="number" name="Quantity" class="form-input edit-input" value="${item.quantity}" min="1">`;
    if (isReturnableField) isReturnableField.innerHTML = `<input type="checkbox" name="IsReturnable" class="form-checkbox" ${item.isReturnable ? 'checked' : ''}>`;
    if (observationField) observationField.innerHTML = `<textarea name="Observation" class="form-input edit-input" rows="2">${item.observation || ''}</textarea>`;
    if (actionsField) {
        actionsField.innerHTML = `
            <button class="btn-action btn-save" onclick="saveHistoryChanges('${item.id}')">Salvar</button>
            <button class="btn-action btn-cancel" onclick="cancelHistoryEdit('${item.id}')">Cancelar</button>
        `;
    }
};

window.saveHistoryChanges = async (exitId) => {
    const row = document.getElementById(`row-history-${exitId}`);
    if (!row) return;

    const quantityInput = row.querySelector('[name="Quantity"]');
    const isReturnableInput = row.querySelector('[name="IsReturnable"]');
    const observationInput = row.querySelector('[name="Observation"]');

    if (!quantityInput) {
        alert("Campo quantidade não encontrado.");
        return;
    }

    const quantityValue = quantityInput.value;
    const quantity = parseInt(quantityValue, 10);
    if (isNaN(quantity) || quantity <= 0) {
        alert("A quantidade deve ser um número maior que zero.");
        return;
    }

    const saveButton = row.querySelector('.btn-save');
    if (!saveButton) return;

    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="loading-spinner"></span>`;

    const formData = new FormData();
    formData.append('Id', exitId);
    formData.append('Quantity', quantityValue);
    formData.append('IsReturnable', isReturnableInput ? isReturnableInput.checked : false);
    formData.append('Observation', observationInput ? observationInput.value : '');

    try {
        const accessToken = localStorage.getItem('accessToken');
        const url = `${API_BASE_URL}/products-exit`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Registro atualizado com sucesso!');
            delete originalHistoryRowHTML[exitId];
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Salvar", detail: `O servidor respondeu com status ${response.status}.` }));
            showErrorModal(errorData);
            cancelHistoryEdit(exitId); // Restaura a linha em caso de erro
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
        cancelHistoryEdit(exitId);
    }
};

window.cancelHistoryEdit = (exitId) => {
    const row = document.getElementById(`row-history-${exitId}`);
    if (row && originalHistoryRowHTML[exitId]) {
        row.innerHTML = originalHistoryRowHTML[exitId];
        delete originalHistoryRowHTML[exitId];
    }
};

// =======================================================
// FUNÇÕES UTILITÁRIAS DE CARREGAMENTO DE DADOS
// =======================================================
