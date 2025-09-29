console.log('Script js/extrato.js DEFINIDO.');


// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de extrato.js foi chamada.');
    initializeExtractForm();
    initializeHistoryFilters();
    fetchAndRenderHistory(1);
}

// =======================================================
// LÓGICA DO FORMULÁRIO DE CADASTRO
// =======================================================
function initializeExtractForm() {
    const extractForm = document.getElementById('extractForm');
    if (extractForm) {
        extractForm.addEventListener('submit', handleExtractSubmit);
    }
    populateSelect(document.getElementById('paymentMethod'), paymentMethodMap, 'Selecione um método');

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('extractDate');
    if(dateInput) {
        dateInput.value = today;
    }
}

async function handleExtractSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/extracts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Extrato salvo com sucesso!');
            form.reset();
            document.getElementById('extractDate').value = new Date().toISOString().split('T')[0];
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
// LÓGICA DA TABELA DE HISTÓRICO
// =======================================================
function initializeHistoryFilters() {
    document.getElementById('historyFilterBtn')?.addEventListener('click', () => fetchAndRenderHistory(1));
    document.getElementById('historyClearBtn')?.addEventListener('click', clearHistoryFilters);
    populateSelect(document.getElementById('historyPaymentMethod'), paymentMethodMap, 'Todos os Métodos');
}

function clearHistoryFilters() {
    document.getElementById('historyStartDate').value = '';
    document.getElementById('historyEndDate').value = '';
    document.getElementById('historyPaymentMethod').value = '';
    fetchAndRenderHistory(1);
}

async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    const tableBody = document.getElementById('extract-history-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Buscando...</td></tr>';

    try {
        const accessToken = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ Page: page, PageSize: 10 });
        
        const startDate = document.getElementById('historyStartDate')?.value;
        const endDate = document.getElementById('historyEndDate')?.value;
        const paymentMethod = document.getElementById('historyPaymentMethod')?.value;

        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);
        if (paymentMethod) params.append('PaymentMethod', paymentMethod);

        const url = `${API_BASE_URL}/extracts/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });

        if (!response.ok) throw new Error(`Falha ao buscar extratos (Status: ${response.status})`);
        
        const paginatedData = await response.json();
        renderHistoryTable(paginatedData.items);
        renderPagination(paginatedData);
    } catch (error) {
        showErrorModal({ title: "Erro ao Listar", detail: error.message });
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">${error.message}</td></tr>`;
    }
}

function renderHistoryTable(items) {
    const tableBody = document.getElementById('extract-history-body');
    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum extrato encontrado.</td></tr>';
        return;
    }
    items.forEach(item => {
        const itemJsonString = JSON.stringify(item).replace(/'/g, "&apos;");
        const formattedDate = new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const formattedValue = (item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const paymentMethodText = paymentMethodMap[item.paymentMethod] || 'N/A';
        
        const row = document.createElement('tr');
        row.id = `row-extract-${item.id}`;
        row.innerHTML = `
            <td data-field="date">${formattedDate}</td>
            <td data-field="value">${formattedValue}</td>
            <td data-field="paymentMethod">${paymentMethodText}</td>
            <td data-field="observations">${item.observations || ''}</td>
            <td class="actions-cell" data-field="actions">
                <button class="btn-action btn-edit" onclick='editExtract(${itemJsonString})'>Editar</button>
                <button class="btn-action btn-delete" onclick="deleteExtract('${item.id}')">Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);
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
    prevButton.onclick = () => fetchAndRenderHistory(page - 1);
    
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.className = 'pagination-info';
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.onclick = () => fetchAndRenderHistory(page + 1);
    
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}

// =======================================================
// FUNÇÕES DE CRUD DO HISTÓRICO
// =======================================================
window.editExtract = (item) => {
    const row = document.getElementById(`row-extract-${item.id}`);
    if (!row || originalRowHTML_Extract[item.id]) return;

    originalRowHTML_Extract[item.id] = row.innerHTML;
    
    const isoDate = new Date(item.date).toISOString().split('T')[0];
    row.querySelector('[data-field="date"]').innerHTML = `<input type="date" name="date" class="edit-input" value="${isoDate}">`;
    row.querySelector('[data-field="value"]').innerHTML = `<input type="number" step="0.01" name="value" class="edit-input" value="${item.value}">`;
    
    let paymentOptions = '';
    for (const [key, value] of Object.entries(paymentMethodMap)) {
        const selected = key == item.paymentMethod ? 'selected' : '';
        paymentOptions += `<option value="${key}" ${selected}>${value}</option>`;
    }
    row.querySelector('[data-field="paymentMethod"]').innerHTML = `<select name="paymentMethod" class="edit-input">${paymentOptions}</select>`;
    
    row.querySelector('[data-field="observations"]').innerHTML = `<textarea name="observations" class="edit-input">${item.observations || ''}</textarea>`;
    
    row.querySelector('[data-field="actions"]').innerHTML = `
        <button class="btn-action btn-save" onclick="saveExtractChanges('${item.id}')">Salvar</button>
        <button class="btn-action btn-cancel" onclick="cancelEditExtract('${item.id}')">Cancelar</button>
    `;
};

window.saveExtractChanges = async (extractId) => {
    const row = document.getElementById(`row-extract-${extractId}`);
    if (!row) return;

    const formData = new FormData();
    formData.append('Id', extractId);
    formData.append('Date', row.querySelector('[name="date"]').value);
    formData.append('Value', row.querySelector('[name="value"]').value);
    formData.append('PaymentMethod', row.querySelector('[name="paymentMethod"]').value);
    formData.append('Observations', row.querySelector('[name="observations"]').value);

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/extracts`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });
        
        if (response.ok) {
            alert('Extrato atualizado com sucesso!');
            delete originalRowHTML_Extract[extractId];
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Salvar", message: "Não foi possível ler a resposta do servidor." }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
        cancelEditExtract(extractId);
    }
};

window.cancelEditExtract = (extractId) => {
    const row = document.getElementById(`row-extract-${extractId}`);
    if (row && originalRowHTML_Extract[extractId]) {
        row.innerHTML = originalRowHTML_Extract[extractId];
        delete originalRowHTML_Extract[extractId];
    }
};

// =========================================================
// FUNÇÃO CORRIGIDA
// =========================================================
window.deleteExtract = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    // 1. Criar um FormData para enviar o ID no corpo da requisição
    const formData = new FormData();
    formData.append('Id', id);

    try {
        const accessToken = localStorage.getItem('accessToken');
        // 2. Usar a URL base, sem o ID no final
        const response = await fetch(`${API_BASE_URL}/extracts`, {
            method: 'DELETE',
            headers: {
                // 3. NÃO definir o 'Content-Type'
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData // 4. Enviar o FormData com o ID
        });
        if (response.ok) {
            alert('Extrato excluído com sucesso!');
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Excluir", message: "Ocorreu um erro." }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};

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

// Chamar a inicialização após o carregamento do DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicForm);
} else {
    initDynamicForm();
}