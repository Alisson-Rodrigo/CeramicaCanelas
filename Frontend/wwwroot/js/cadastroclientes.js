console.log('Script js/cliente.js DEFINIDO.');



// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de cliente.js foi chamada.');
    initializeCustomerForm(document.querySelector('.customer-form'));
    initializeFilters();
    fetchAndRenderCustomers(1);
}

function initializeFilters() {
    document.getElementById('filter-btn')?.addEventListener('click', () => fetchAndRenderCustomers(1));
    document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        fetchAndRenderCustomers(1);
    });
}

// =======================================================
// LÓGICA DO FORMULÁRIO DE CADASTRO
// =======================================================
function initializeCustomerForm(form) {
    if (!form) return;
    form.onsubmit = (event) => {
        event.preventDefault();
        handleSaveCustomer(form);
    };
}

async function handleSaveCustomer(form) {
    const formData = new FormData(form);
    if (!formData.get('Name')?.trim()) {
        showErrorModal({ title: "Validação Falhou", detail: "O campo 'Nome Completo' é obrigatório." });
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    let originalText = '';
    if (submitBtn) {
        originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Salvando...";
        submitBtn.classList.add("loading");
    }

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/customer`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData,
        });

        if (response.ok) {
            alert('Cliente cadastrado com sucesso!');
            form.reset();
            fetchAndRenderCustomers(1);
        } else {
            const errorData = await response.json().catch(() => ({
                title: "Erro ao Salvar",
                detail: "Ocorreu um erro inesperado."
            }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: "Não foi possível comunicar com o servidor." });
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.classList.remove("loading");
        }
    }
}


// =======================================================
// LÓGICA DA TABELA (PAGINAÇÃO E CRUD)
// =======================================================
async function fetchAndRenderCustomers(page = 1) {
    currentPage = page;
    const tableBody = document.querySelector('#customer-list-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Buscando...</td></tr>';
    
    try {
        const accessToken = localStorage.getItem('accessToken');
        const search = document.getElementById('search-input')?.value;
        const params = new URLSearchParams({ Page: currentPage, PageSize: 10, OrderBy: 'Name' });
        if (search) params.append('Search', search);

        const url = `${API_BASE_URL}/financial/customer/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar clientes (Status: ${response.status})`);
        
        const paginatedData = await response.json();
        renderCustomerTable(paginatedData.items, tableBody);
        renderPagination(paginatedData);
    } catch (error) {
        showErrorModal({ title: "Erro ao Listar", detail: error.message });
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">${error.message}</td></tr>`;
    }
}

function renderCustomerTable(customers, tableBody) {
    tableBody.innerHTML = '';
    if (!customers || customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum cliente encontrado.</td></tr>';
        return;
    }
    customers.forEach(customer => {
        const customerJsonString = JSON.stringify(customer).replace(/'/g, "&apos;");
        const rowHTML = `
            <tr id="row-customer-${customer.id}">
                <td data-field="name">${customer.name}</td>
                <td data-field="document">${customer.document || ''}</td>
                <td data-field="email">${customer.email || ''}</td>
                <td data-field="phoneNumber">${customer.phoneNumber || ''}</td>
                <td class="actions-cell" data-field="actions">
                    <button class="btn-action btn-edit" onclick='editCustomer(${customerJsonString})'>Editar</button>
                    <button class="btn-action btn-delete" onclick="deleteCustomer('${customer.id}')">Excluir</button>
                </td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', rowHTML);
    });
}

function renderPagination(paginationData) {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    const { page, totalPages } = paginationData;
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = page <= 1;
    prevButton.onclick = () => fetchAndRenderCustomers(page - 1);
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.className = 'pagination-info';
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.onclick = () => fetchAndRenderCustomers(page + 1);
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}

window.deleteCustomer = async (customerId) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/customer/${customerId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            alert('Cliente excluído com sucesso!');
            fetchAndRenderCustomers(currentPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Excluir" }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};

window.editCustomer = (customer) => {
    const row = document.getElementById(`row-customer-${customer.id}`);
    if (!row) return;
    originalRowHTML_Customer[customer.id] = row.innerHTML;
    
    row.querySelector('[data-field="name"]').innerHTML = `<input type="text" name="Name" class="edit-input" value="${customer.name}">`;
    row.querySelector('[data-field="document"]').innerHTML = `<input type="text" name="Document" class="edit-input" value="${customer.document || ''}">`;
    row.querySelector('[data-field="email"]').innerHTML = `<input type="email" name="Email" class="edit-input" value="${customer.email || ''}">`;
    row.querySelector('[data-field="phoneNumber"]').innerHTML = `<input type="text" name="PhoneNumber" class="edit-input" value="${customer.phoneNumber || ''}">`;
    
    row.querySelector('[data-field="actions"]').innerHTML = `
        <button class="btn-action btn-save" onclick="saveCustomerChanges('${customer.id}')">Salvar</button>
        <button class="btn-action btn-cancel" onclick="cancelEditCustomer('${customer.id}')">Cancelar</button>
    `;
};

window.saveCustomerChanges = async (customerId) => {
    const row = document.getElementById(`row-customer-${customerId}`);
    if (!row) return;

    const saveBtn = row.querySelector('.btn-save');
    let originalText = '';
    if (saveBtn) {
        originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = "Salvando...";
        saveBtn.classList.add("loading");
    }

    const formData = new FormData();
    formData.append('Id', customerId);
    formData.append('Name', row.querySelector('[name="Name"]').value);
    formData.append('Document', row.querySelector('[name="Document"]').value);
    formData.append('Email', row.querySelector('[name="Email"]').value);
    formData.append('PhoneNumber', row.querySelector('[name="PhoneNumber"]').value);

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/customer`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Cliente atualizado com sucesso!');
            fetchAndRenderCustomers(currentPage);
        } else {
            const errorData = await response.json().catch(() => ({
                title: "Erro ao Salvar",
                detail: "Ocorreu um erro inesperado."
            }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
        cancelEditCustomer(customerId);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            saveBtn.classList.remove("loading");
        }
    }
};

window.cancelEditCustomer = (customerId) => {
    const row = document.getElementById(`row-customer-${customerId}`);
    if (row && originalRowHTML_Customer[customerId]) {
        row.innerHTML = originalRowHTML_Customer[customerId];
        delete originalRowHTML_Customer[customerId];
    }
};