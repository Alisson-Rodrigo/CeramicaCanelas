console.log('Script js/lancamentocategory.js DEFINIDO.');

// =======================================================

// Função de mock para evitar erros caso não exista
function showErrorModal(error) {
    console.error(error);
    alert(`${error.title}: ${error.detail || 'Ocorreu um erro.'}`);
}

// =======================================================
// INICIALIZAÇÃO
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    initDynamicForm();
});

function initDynamicForm() {
    console.log('▶️ initDynamicForm() de lancamentocategory.js foi chamada.');
    initializeCategoryForm();
    initializeGroupModal();
    initializeHistoryFilters();
    fetchAndRenderHistory(1);
}

// =======================================================
// LÓGICA DO FORMULÁRIO DE CADASTRO
// =======================================================
function initializeCategoryForm() {
    const form = document.getElementById('launchCategoryForm');
    if (form) {
        form.addEventListener('submit', handleCategorySubmit);
    }
}

async function handleCategorySubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    if (!formData.get('GroupId')) {
        showErrorModal({ title: "Validação", detail: "Por favor, selecione um grupo principal." });
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
        const response = await fetch(`${API_BASE_URL}/financial/launch-categories`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Categoria salva com sucesso!');
            form.reset();
            document.getElementById('selectedGroupName').textContent = 'Nenhum grupo selecionado';
            fetchAndRenderHistory(1);
        } else {
            const errorData = await response.json().catch(() => ({
                title: "Erro ao Salvar",
                detail: "Não foi possível processar a resposta do servidor."
            }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.classList.remove("loading");
        }
    }
}


// =======================================================
// LÓGICA DA MODAL DE GRUPOS (sem alterações)
// =======================================================
function initializeGroupModal() {
    const modal = document.getElementById('groupSearchModal');
    const openBtn = document.getElementById('openGroupModalBtn');
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector('.modal-close-btn');
    const filterBtn = modal.querySelector('#modalGroupFilterBtn');

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        editingCategoryId = null;
        modal.style.display = 'block';
        fetchAndRenderGroupsInModal(1);
    });

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (filterBtn) filterBtn.addEventListener('click', () => fetchAndRenderGroupsInModal(1));

    modal.querySelector('#modalGroupResultsContainer').addEventListener('click', (event) => {
        if (event.target.classList.contains('select-group-btn')) {
            const groupId = event.target.dataset.id;
            const groupName = event.target.dataset.name;

            if (editingCategoryId) {
                const row = document.getElementById(`row-category-${editingCategoryId}`);
                if (row) {
                    row.querySelector('.group-name-display').textContent = groupName;
                    row.dataset.editingGroupId = groupId;
                }
                editingCategoryId = null;
            } else {
                document.getElementById('selectedGroupName').textContent = groupName;
                document.getElementById('groupId').value = groupId;
            }
            modal.style.display = 'none';
        }
    });
}

async function fetchAndRenderGroupsInModal(page = 1) {
    currentGroupModalPage = page;
    const resultsContainer = document.getElementById('modalGroupResultsContainer');
    resultsContainer.innerHTML = '<p>Buscando grupos...</p>';

    try {
        const accessToken = localStorage.getItem('accessToken');
        const search = document.getElementById('modalGroupSearchInput').value;
        const params = new URLSearchParams({ Page: page, PageSize: 5, OrderBy: 'Name' });
        if (search) params.append('Search', search);

        const url = `${API_BASE_URL}/financial/launch-category-groups/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha na requisição: ${response.status}`);

        const paginatedData = await response.json();
        renderGroupModalResults(paginatedData.items, resultsContainer);
        renderGroupModalPagination(paginatedData);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
        document.getElementById('modalGroupPaginationControls').innerHTML = '';
    }
}

function renderGroupModalResults(groups, container) {
    if (!groups || groups.length === 0) {
        container.innerHTML = '<p>Nenhum grupo encontrado.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'results-table';
    table.innerHTML = `<thead><tr><th>Nome do Grupo</th><th>Ação</th></tr></thead><tbody>
        ${groups.map(group => `<tr><td>${group.name}</td><td><button type="button" class="select-group-btn search-btn" data-id="${group.id}" data-name="${group.name}">Selecionar</button></td></tr>`).join('')}
    </tbody>`;
    container.innerHTML = '';
    container.appendChild(table);
}

function renderGroupModalPagination(paginationData) {
    const controlsContainer = document.getElementById('modalGroupPaginationControls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (paginationData.totalPages <= 1) return;

    const { page, totalPages } = paginationData;
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = page <= 1;
    prevButton.onclick = () => fetchAndRenderGroupsInModal(page - 1);

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.className = 'pagination-info';

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.onclick = () => fetchAndRenderGroupsInModal(page + 1);

    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}

// =======================================================
// LÓGICA DA TABELA DE HISTÓRICO
// =======================================================

// ## REMOVIDO ##
// A função fetchCategoryGroupsMap() foi removida pois não é mais necessária.

function initializeHistoryFilters() {
    document.getElementById('filter-btn')?.addEventListener('click', () => fetchAndRenderHistory(1));
    document.getElementById('clear-filters-btn')?.addEventListener('click', clearHistoryFilters);
}

function clearHistoryFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('order-by').value = 'Name';
    fetchAndRenderHistory(1);
}

// ## FUNÇÃO SIMPLIFICADA ##
// Não precisa mais buscar o mapa de grupos.
async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    const tableBody = document.getElementById('launch-category-list-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Buscando...</td></tr>';

    try {
        const accessToken = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ Page: page, PageSize: 10 });

        const search = document.getElementById('search-input')?.value;
        const orderBy = document.getElementById('order-by')?.value;

        if (search) params.append('Search', search);
        if (orderBy) params.append('OrderBy', orderBy);

        const url = `${API_BASE_URL}/financial/launch-categories/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });

        if (!response.ok) throw new Error(`Falha ao buscar categorias (Status: ${response.status})`);

        const paginatedData = await response.json();
        historyItemsCache = paginatedData.items;

        renderHistoryTable(paginatedData.items); // Chamada simplificada
        renderPagination(paginatedData);

    } catch (error) {
       
    }
}

// ## FUNÇÃO CORRIGIDA ##
// Usa os nomes corretos dos campos vindos da API.
function renderHistoryTable(items) {
    const tableBody = document.getElementById('launch-category-list-body');
    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nenhuma categoria encontrada.</td></tr>';
        return;
    }
    items.forEach(item => {
        const itemJsonString = JSON.stringify(item).replace(/"/g, '&quot;');
        const row = document.createElement('tr');
        row.id = `row-category-${item.id}`;
        row.innerHTML = `
            <td data-field="name">${item.name}</td>
            <td data-field="groupName">${item.nameGroupCategory || 'N/A'}</td> 
            <td class="actions-cell" data-field="actions">
                <button class="btn-action btn-edit" onclick='editCategory(${itemJsonString})'>Editar</button>
                <button class="btn-action btn-delete" onclick="deleteCategory('${item.id}')">Excluir</button>
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

// ## FUNÇÃO CORRIGIDA ##
// Usa os nomes corretos dos campos do objeto `item`.
window.editCategory = (item) => {
    const row = document.getElementById(`row-category-${item.id}`);
    if (!row || originalRowHTML[item.id]) return;

    originalRowHTML[item.id] = row.innerHTML;

    // CORRIGIDO: Usa `item.idGroupCategory`
    row.dataset.editingGroupId = item.idGroupCategory;

    row.querySelector('[data-field="name"]').innerHTML = `<input type="text" name="name" class="edit-input" value="${item.name}">`;

    // CORRIGIDO: Usa `item.nameGroupCategory`
    row.querySelector('[data-field="groupName"]').innerHTML = `
        <span class="group-name-display">${item.nameGroupCategory || 'N/A'}</span>
        <button type="button" class="btn-editar" onclick="openGroupModalForEdit('${item.id}')">Trocar...</button>
    `;

    row.querySelector('[data-field="actions"]').innerHTML = `
        <button class="btn-action btn-save" onclick="saveCategoryChanges('${item.id}')">Salvar</button>
        <button class="btn-action btn-cancel" onclick="cancelEditCategory('${item.id}')">Cancelar</button>
    `;
};

window.openGroupModalForEdit = (catId) => {
    editingCategoryId = catId;
    const modal = document.getElementById('groupSearchModal');
    modal.style.display = 'block';
    fetchAndRenderGroupsInModal(1);
};


window.saveCategoryChanges = async (categoryId) => {
    const row = document.getElementById(`row-category-${categoryId}`);
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
    formData.append('Id', categoryId);
    formData.append('Name', row.querySelector('[name="name"]').value);
    formData.append('GroupId', row.dataset.editingGroupId);

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch-categories`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Categoria atualizada com sucesso!');
            delete originalRowHTML[categoryId];
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({
                title: "Erro ao Salvar",
                detail: "Não foi possível processar a resposta do servidor."
            }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
        cancelEditCategory(categoryId);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            saveBtn.classList.remove("loading");
        }
    }
};


window.cancelEditCategory = (categoryId) => {
    const row = document.getElementById(`row-category-${categoryId}`);
    if (row && originalRowHTML[categoryId]) {
        row.innerHTML = originalRowHTML[categoryId];
        delete originalRowHTML[categoryId];
    }
    editingCategoryId = null;
};

window.deleteCategory = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch-categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            alert('Categoria excluída com sucesso!');
            const tableBody = document.getElementById('launch-category-list-body');
            const rowCount = tableBody.rows.length;
            const pageToFetch = rowCount === 1 && currentHistoryPage > 1 ? currentHistoryPage - 1 : currentHistoryPage;
            fetchAndRenderHistory(pageToFetch);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Excluir" }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};