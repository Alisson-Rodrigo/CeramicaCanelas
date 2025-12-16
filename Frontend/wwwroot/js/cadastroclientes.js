console.log('Script js/cliente.js DEFINIDO.');



// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de cliente.js foi chamada.');
    
    const formElement = document.querySelector('.customer-form');
    if (formElement) {
        initializeCustomerForm(formElement);
    }

    initializeFilters();
    // Inicia a busca (com sistema de retry embutido na função)
    fetchAndRenderCustomers(1);
}

function initializeFilters() {
    document.getElementById('filter-btn')?.addEventListener('click', () => fetchAndRenderCustomers(1));
    document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
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
        console.error(error);
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

// ADICIONADO: Parâmetro 'retryCount' para controlar as tentativas
async function fetchAndRenderCustomers(page = 1, retryCount = 0) {
    currentPage = page;
    
    // Tenta encontrar a tabela no DOM
    const tableBody = document.querySelector('#customer-list-body');
    
    // --- LÓGICA DE PROTEÇÃO E RETRY ---
    if (!tableBody) {
        // Se não achou a tabela e ainda não tentamos 10 vezes (10 * 300ms = 3 segundos de tolerância)
        if (retryCount < 10) {
            console.warn(`⚠️ Tabela não encontrada. Tentando novamente em 300ms... (Tentativa ${retryCount + 1}/10)`);
            setTimeout(() => fetchAndRenderCustomers(page, retryCount + 1), 300);
            return; // Sai da função e espera o timeout
        } else {
            console.error("❌ Erro: Elemento #customer-list-body não foi carregado no DOM após várias tentativas.");
            return; // Desiste silenciosamente para não quebrar a página
        }
    }

    // Se chegou aqui, a tabela existe. Pode manipular o innerHTML com segurança.
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Buscando...</td></tr>';
    
    try {
        const accessToken = localStorage.getItem('accessToken');
        const search = document.getElementById('search-input')?.value;
        const params = new URLSearchParams({ Page: currentPage, PageSize: 10, OrderBy: 'Name' });
        if (search) params.append('Search', search);

        const url = `${API_BASE_URL}/financial/customer/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        
        if (!response.ok) throw new Error(`Falha ao buscar clientes (Status: ${response.status})`);
        
        // Garante objeto válido mesmo se vier vazio
        const paginatedData = await response.json().catch(() => ({ items: [], totalPages: 0 }));
        
        // --- SEGUNDA VERIFICAÇÃO DE SEGURANÇA ---
        // (O usuário pode ter trocado de página durante o await do fetch)
        const currentTableBody = document.querySelector('#customer-list-body');
        if (!currentTableBody) return; 

        renderCustomerTable(paginatedData?.items || [], currentTableBody);
        renderPagination(paginatedData || {});

    } catch (error) {
        console.error("Erro no fetchAndRenderCustomers:", error);
        
        // Verifica se a tabela ainda existe antes de exibir o erro nela
        const errorTableBody = document.querySelector('#customer-list-body');
        if (errorTableBody) {
            errorTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Erro: ${error.message}</td></tr>`;
        }
        
    }
}

function renderCustomerTable(customers, tableBody) {
    if (!tableBody) return; // Segurança redundante

    tableBody.innerHTML = '';
    
    if (!customers || customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum cliente encontrado.</td></tr>';
        return;
    }

    customers.forEach(customer => {
        const customerJsonString = JSON.stringify(customer).replace(/'/g, "&apos;");
        
        const rowHTML = `
            <tr id="row-customer-${customer.id}">
                <td data-field="name">${customer.name || '-'}</td>
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
    
    if (!paginationData || !paginationData.totalPages || paginationData.totalPages <= 1) return;
    
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

// =======================================================
// AÇÕES GLOBAIS (EDITAR / EXCLUIR)
// =======================================================

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
    
    row.querySelector('[data-field="name"]').innerHTML = `<input type="text" name="Name" class="edit-input" value="${customer.name || ''}">`;
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
    
    // Verificações seguras para os inputs
    const safeValue = (name) => {
        const el = row.querySelector(`[name="${name}"]`);
        return el ? el.value : '';
    };

    formData.append('Name', safeValue('Name'));
    formData.append('Document', safeValue('Document'));
    formData.append('Email', safeValue('Email'));
    formData.append('PhoneNumber', safeValue('PhoneNumber'));

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

// Inicialização automática
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicForm);
} else {
    initDynamicForm();
}