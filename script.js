class Todo {
    constructor(title, description, dueDate, isImportant = false, isChecked = false, id = this.generateQuickGuid()) {

        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.isImportant = isImportant;
        this.isChecked = isChecked;
        this.id = id;
    }

    // https://stackoverflow.com/a/13403498
    generateQuickGuid() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}

// Garanteerib et uus instance Todo-st on kasutamata ID-ga, teisisõnu soovitaks uusi Todo-sid genereerida ainult selle funktsiooniga
// Tõenäosus, et ta läheb rekursiooni on alla ~1/1000000
function instantiateTodo(mapToCompareAgainst, title, description, dueDate) {
    const todo = new Todo(title, description, dueDate);
    return mapToCompareAgainst.has(todo.id) ? instantiateTodo(mapToCompareAgainst, title, description, dueDate) : todo;
}

const todos = new Map();
let todosView = [];

// Map ei serialiseeru normaalselt, seega peame sellist hacki tegema, et kirjutame üle ta toJSON-i fn-i
todos.toJSON = () => {
    return [...todos.entries()];
};

loadEntries();
// Üritame leida database.json-i üles, kui see on olemas siis kirjutame todos Map-i üle
async function loadEntries() {
    const jsonDatabase = await fetch('database.json')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.warn('Failed to load database from the server!');
            }
        })
        .catch(error => {
            console.warn(`Tühi või vigane JSON fail\n${error}`);
        });

    if (!jsonDatabase) return;

    for (const [id, todo] of jsonDatabase) {
        todos.set(id, new Todo(todo.title, todo.description, todo.dueDate, todo.isImportant, todo.isChecked, id));
    }
    todosView = mapToArray(todos);

    renderEntries(todosView);
}

function mapToArray(map) {
    return [...map.values()];
}


// Efektiivne viis renderdada todo list
function renderEntries(todosArray) {

    const todosElement = document.getElementById('todos');
    // Teeme olemasoleva elemendi sisu tühjaks, et seal varasemaid todo-sid ei oleks
    todosElement.textContent = '';
    // Loome virtuaalse dokumendi et me ei peaks HTML-i reflow-i triggerima iga tsükliga, vaid saame lõpus lihtsalt ühe korraga ära lehe uuendada
    const todosContainer = document.createDocumentFragment();

    // Käime kõik todo-d läbi ükshaaval
    for (const todo of todosArray) {

        // Iga todo individuaalne container
        const todoDiv = document.createElement('div');
        todoDiv.className = 'todo';

        // Label mille sisse läheb inputCheckbox
        const label = document.createElement('label');
        label.className = 'checkbox';

        // input mille type=checkbox
        const inputCheckbox = document.createElement('input');
        inputCheckbox.setAttribute('type', 'checkbox');

        // Paneme inputCheckbox-i label-i sisse
        label.appendChild(inputCheckbox);
        // Paneme label-i todoDiv-i sisse
        todoDiv.appendChild(label);

        // Käime kõik todo võtmed läbi ükshaaval
        for (const item in todo) {
            switch (item) {
            case 'isChecked':
                // apply mingi class
                continue;
            case 'isImportant':
                // apply mingi class
                continue;
            case 'id': continue;
            }

            const elementDiv = document.createElement('div');
            elementDiv.className = item;
            elementDiv.innerText = todo[item];
            todoDiv.appendChild(elementDiv);
        }

        // importantButton
        const importantButton = document.createElement('div');
        importantButton.classList.add('important-button');
        importantButton.addEventListener('click', importantButtonHandler);
        todoDiv.appendChild(importantButton);

        // removeButton
        const removeButton = document.createElement('div');
        removeButton.classList.add('delete-button');
        removeButton.addEventListener('click', removeButtonHandler);
        todoDiv.appendChild(removeButton);

        // Lisame individuaalse todo containeri kõiki todosid sisaldavase virtuaalkonteinerisse
        todosContainer.appendChild(todoDiv);
    }

    // Kõige viimane tegevus, lisab terve virtuaalkonteineri (ja selle kõik elemendid) leheküljele
    todosElement.appendChild(todosContainer);
}

function importantButtonHandler() {
    if (!this.parentNode.classList.contains('important-task')) {
        this.parentNode.classList.add('important-task');
    } else {
        this.parentNode.classList.remove('important-task');
    }
}

function removeButtonHandler() {
    this.parentNode.remove();
}

function editEntry(overwrites = {}) {

}

function removeEntry(id, map) {
    
}

$('#add').click(addEntry);

function addEntry() {
    const title = document.getElementById('titleInput').value;
    const desc = document.getElementById('descriptionInput').value;
    const date = document.getElementById('dueDateInput').value;

    const todo = instantiateTodo(todos, title, desc, date);

    todos.set(todo.id, todo);
    todosView = mapToArray(todos);

    console.log(todos);

    saveData('server.php', todos)
        .catch(error => console.error(error));

    renderEntries(todosView);
}

// Sorteerib ülesanded soovitud key järgi, saab ka tagurpidi sorteerida
function sortEntries(array, key, reverse = false) {
    array.sort(({ [key]: a }, { [key]: b }) => {
        return typeof a === 'string' ? a.localeCompare(b) : a - b;
    });
    if (reverse) array.reverse();
}

// Leiame kõik sorteerimisnupud (hetkel 2)
const sortButtons = document.getElementsByClassName('sort-button');

// Igale sorteerimisnuptodoDive lisame eventlisteneri
for (const button of sortButtons) {
    button.addEventListener('click', function () {

        // Kui tal flip classi ei ole siis anname selle
        // Kui on siis eemaldame selle
        // Samal ajal ka sorteerime todos array vastavalt
        if (!this.classList.contains('flip')) {
            this.id === 'sort-title' ? sortEntries(todosView, 'title') : sortEntries(todosView, 'dueDate');
            this.classList.add('flip');
            renderEntries(todosView);
        } else {
            this.id === 'sort-title' ? sortEntries(todosView, 'title', true) : sortEntries(todosView, 'dueDate', true);
            this.classList.remove('flip');
            renderEntries(todosView);
        }
    });
}

// Alternatiiv jQuery POST meetodile; asünkroonne, oleks kasutanud Fetch API-t kuid see tegi POST-i asemel GET-i igakord ???
function saveData(url, data) {
    // Promise teeb selle asünkroonseks, muidu peaks callbackidega seda tegema
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                console.log(xhr.responseText);
                resolve();
            } else {
                reject(new Error('Something went wrong on the server'));
            }
        };
        xhr.onerror = reject;
        // Millegipärast see nii peab käima
        xhr.send('save=' + JSON.stringify(data));
    });
}
