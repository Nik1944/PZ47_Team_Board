const form = document.querySelector("#task-form");
const list = document.querySelector("#task-list");
const status = document.querySelector("#status");
const summary = document.querySelector("#summary");
const filter = document.querySelector("#filter");
const search = document.querySelector("#search");
const submitButton = document.querySelector("#submit-button");

let tasks = [];

function setStatus(message, kind = "info") {
  status.textContent = message;
  status.dataset.kind = kind;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, options);

  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = data && data.error ? data.error : `Ошибка HTTP: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

function renderTasks() {
  const statusFilter = filter.value;
  const searchQuery = search.value.trim().toLowerCase();

  const totalCount = tasks.length;
  const completedCount = tasks.filter((task) => task.done).length;
  const activeCount = totalCount - completedCount;

  summary.textContent = `Всего: ${totalCount} | Активных: ${activeCount} | Выполненных: ${completedCount}`;

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !task.done) ||
      (statusFilter === "completed" && task.done);

    const matchesSearch = task.title.toLowerCase().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  list.innerHTML = "";

  if (filteredTasks.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.textContent = "Задачи не найдены";
    list.appendChild(emptyMessage);
    return;
  }

  filteredTasks.forEach((task) => {
    const item = document.createElement("li");
    item.dataset.done = task.done ? "true" : "false";

    const titleEl = document.createElement("strong");
    titleEl.textContent = task.title;

    const metaEl = document.createElement("span");
    const statusText = task.done ? "Выполнено" : "Активна";
    metaEl.textContent = ` [${task.category} | Приоритет: ${task.priority} | ${statusText}] `;

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.textContent = task.done ? "Вернуть" : "Выполнено";
    toggleButton.dataset.action = "toggle";
    toggleButton.dataset.id = task.id;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Удалить";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = task.id;

    item.append(titleEl, metaEl, toggleButton, deleteButton);
    list.appendChild(item);
  });
}

async function loadTasks() {
  try {
    setStatus("Загрузка задач...", "info");
    const data = await apiRequest("/api/tasks");

    if (!data || !Array.isArray(data.items)) {
      throw new Error("Некорректный формат данных от сервера");
    }

    tasks = data.items;
    renderTasks();
    setStatus("Список задач обновлён", "success");
  } catch (error) {
    setStatus(error.message || "Ошибка при загрузке задач", "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const title = (formData.get("title") || "").toString().trim();
  const category = (formData.get("category") || "").toString();
  const priority = (formData.get("priority") || "").toString();

  if (!title) {
    setStatus("Введите название задачи", "error");
    return;
  }

  submitButton.disabled = true;

  try {
    await apiRequest("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, category, priority }),
    });

    form.reset();
    await loadTasks();
    setStatus("Задача успешно добавлена", "success");
  } catch (error) {
    setStatus(error.message || "Не удалось создать задачу", "error");
  } finally {
    submitButton.disabled = false;
  }
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const task = tasks.find((t) => String(t.id) === String(id));

  if (!task) return;

  button.disabled = true;

  try {
    if (action === "toggle") {
      await apiRequest(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ done: !task.done }),
      });
      await loadTasks();
      setStatus("Статус задачи обновлён", "success");
    } else if (action === "delete") {
      await apiRequest(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      await loadTasks();
      setStatus("Задача удалена", "success");
    }
  } catch (error) {
    setStatus(error.message || "Ошибка при выполнении операции", "error");
    button.disabled = false;
  }
});

filter.addEventListener("change", renderTasks);
search.addEventListener("input", renderTasks);
document.querySelector("#refresh-button").addEventListener("click", loadTasks);

loadTasks();