console.log('Script js/grupos-categorias.js DEFINIDO.');



// Função de mock para evitar erros caso não exista
function showErrorModal(error) {
    console.error(error);
    alert(`${error.title}: ${error.detail || 'Ocorreu um erro.'}`);
}


// =======================================================
// INICIALIZAÇÃO
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    // A função initDynamicForm será chamada quando o DOM estiver pronto
    initDynamicForm();
});

function initDynamicForm() {
    console.log('▶️ initDynamicForm() de grupos-categorias.js foi chamada.');
    initializeCategoryGroupForm();
    initializeHistoryFilters();
    fetchAndRenderHistory(1);
}

// =======================================================
// LÓGICA DO FORMULÁRIO DE CADASTRO
// =======================================================
function initializeCategoryGroupForm() {
    const categoryGroupForm = document.getElementById('categoryGroupForm');
    if (categoryGroupForm) {
        categoryGroupForm.addEventListener('submit', handleCategoryGroupSubmit);
    }
}

async function handleCategoryGroupSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch-category-groups`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Grupo de categoria salvo com sucesso!');
            form.reset();
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
}

function clearHistoryFilters() {
    document.getElementById('historySearch').value = '';
    fetchAndRenderHistory(1);
}

async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    const tableBody = document.getElementById('category-group-history-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Buscando...</td></tr>';

    try {
        const accessToken = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ Page: page, PageSize: 10 });
        
        const search = document.getElementById('historySearch')?.value;
        if (search) params.append('Search', search);

        const url = `${API_BASE_URL}/financial/launch-category-groups/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });

        if (!response.ok) throw new Error(`Falha ao buscar grupos (Status: ${response.status})`);
        
        const paginatedData = await response.json();
        historyItemsCache = paginatedData.items;
        renderHistoryTable(paginatedData.items);
        renderPagination(paginatedData);
    } catch (error) {
        showErrorModal({ title: "Erro ao Listar", detail: error.message });
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: red;">${error.message}</td></tr>`;
    }
}

function renderHistoryTable(items) {
    const tableBody = document.getElementById('category-group-history-body');
    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Nenhum grupo de categoria encontrado.</td></tr>';
        return;
    }
    items.forEach(item => {
        // Garantir que o JSON passado para as funções de edição/exclusão não quebre o HTML
        const itemJsonString = JSON.stringify(item).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
        
        const row = document.createElement('tr');
        row.id = `row-group-${item.id}`;
        row.innerHTML = `
            <td data-field="name">
                <button
                    id="toggle-btn-${item.id}"
                    class="toggle-btn"
                    onclick='toggleSubcategories("${item.id}", ${JSON.stringify(item.categories || []).replace(/'/g, "&apos;")})'
                >+</button>
                <span>${item.name}</span>
            </td>
            <td class="actions-cell" data-field="actions">
                <button class="btn-action btn-edit" onclick='editCategoryGroup(${itemJsonString})'>Editar</button>
                <button class="btn-action btn-delete" onclick="deleteCategoryGroup('${item.id}')">Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * ## NOVA FUNÇÃO ##
 * Exibe ou oculta as subcategorias de um grupo.
 */
window.toggleSubcategories = (groupId, categories) => {
    const parentRow = document.getElementById(`row-group-${groupId}`);
    const subRowId = `sub-row-group-${groupId}`;
    const existingSubRow = document.getElementById(subRowId);
    const toggleBtn = document.getElementById(`toggle-btn-${groupId}`);

    // Se a linha de subcategorias já existe, remove-a (efeito de recolher)
    if (existingSubRow) {
        existingSubRow.remove();
        toggleBtn.textContent = '+';
        return;
    }

    // Cria a nova linha para as subcategorias
    const subRow = document.createElement('tr');
    subRow.id = subRowId;

    const subCell = document.createElement('td');
    subCell.colSpan = 2; // Ocupa as duas colunas da tabela principal
    subCell.classList.add('sub-category-cell');

    let subTableHTML = '<p style="padding: 10px;">Nenhuma categoria encontrada.</p>';

    if (categories && categories.length > 0) {
        subTableHTML = `
            <table class="sub-category-table">
                <thead>
                    <tr><th>Nome da Categoria</th></tr>
                </thead>
                <tbody>
                    ${categories.map(cat => `<tr><td>${cat.name}</td></tr>`).join('')}
                </tbody>
            </table>
        `;
    }

    subCell.innerHTML = subTableHTML;
    subRow.appendChild(subCell);
    
    // Insere a nova linha logo abaixo da linha do grupo
    parentRow.parentNode.insertBefore(subRow, parentRow.nextSibling);
    toggleBtn.textContent = '-';
};


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
window.editCategoryGroup = (item) => {
    const row = document.getElementById(`row-group-${item.id}`);
    if (!row || originalRowHTML_CategoryGroup[item.id]) return;

    originalRowHTML_CategoryGroup[item.id] = row.innerHTML;
    
    // Oculta o botão de expandir durante a edição
    row.querySelector('[data-field="name"]').innerHTML = `<input type="text" name="name" class="edit-input" value="${item.name}">`;
    
    row.querySelector('[data-field="actions"]').innerHTML = `
        <button class="btn-action btn-save" onclick="saveCategoryGroupChanges('${item.id}')">Salvar</button>
        <button class="btn-action btn-cancel" onclick="cancelEditCategoryGroup('${item.id}')">Cancelar</button>
    `;
};

window.saveCategoryGroupChanges = async (groupId) => {
    const row = document.getElementById(`row-group-${groupId}`);
    if (!row) return;
    
    const formData = new FormData();
    formData.append('Id', groupId);
    formData.append('Name', row.querySelector('[name="name"]').value);

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch-category-groups`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });
        if (response.ok) {
            alert('Grupo de categoria atualizado com sucesso!');
            delete originalRowHTML_CategoryGroup[groupId];
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Salvar" }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
        cancelEditCategoryGroup(groupId);
    }
};

window.cancelEditCategoryGroup = (groupId) => {
    const row = document.getElementById(`row-group-${groupId}`);
    if (row && originalRowHTML_CategoryGroup[groupId]) {
        row.innerHTML = originalRowHTML_CategoryGroup[groupId];
        delete originalRowHTML_CategoryGroup[groupId];
    }
};

window.deleteCategoryGroup = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch-category-groups/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            alert('Grupo de categoria excluído com sucesso!');
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Excluir" }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};