let questionsByCategory = {};
const categoryOrder = [
    "economics",
    "resource_management",
    "culture",
    "authority",
    "nation",
    "foreign",
    "technology",
    "social_control",
    "territorial_organization"
];

let currentCategoryIndex = 0;
let currentQuestions = {};
let results = {};
let history = [];
let currentNodeId = null;
let quizLoaded = false;

function getLocalizedQuestionText(node) {
    if (!node) return "";
    const lang = (typeof I18n !== 'undefined') ? I18n.currentLanguage : 'en';
    const defaultLang = (typeof I18n !== 'undefined') ? I18n.defaultLanguage : 'en';

    if (typeof node[lang] === 'string' && node[lang].trim() !== "") {
        return node[lang];
    }
    if (typeof node[defaultLang] === 'string' && node[defaultLang].trim() !== "") {
        return node[defaultLang];
    }
    return node.text || "";
}

function getLocalizedOptionText(opt) {
    if (!opt) return "";
    const lang = (typeof I18n !== 'undefined') ? I18n.currentLanguage : 'en';
    const defaultLang = (typeof I18n !== 'undefined') ? I18n.defaultLanguage : 'en';

    if (typeof opt[lang] === 'string' && opt[lang].trim() !== "") {
        return opt[lang];
    }
    if (typeof opt[defaultLang] === 'string' && opt[defaultLang].trim() !== "") {
        return opt[defaultLang];
    }
    return opt.text || "";
}

function updateNamePlaceholder() {
    const input = document.getElementById('name-input');
    if (input && typeof I18n !== 'undefined') {
        input.placeholder = I18n.t("namePlaceholder");
    }
}

function beginNamedQuiz() {
    const input = document.getElementById('name-input');
    if (input) {
        const name = input.value.trim();
        if (!name) {
            input.classList.add('input-error');
            input.focus();
            return;
        }
        localStorage.setItem('quizUserName', name);
    }

    const nameScreen = document.getElementById('name-screen');
    const nameButtons = document.getElementById('name-buttons');
    const quizScreen = document.getElementById('quiz-screen');
    const buttonsDiv = document.getElementById('buttons');
    const quizNav = document.getElementById('quiz-nav');

    if (nameScreen) nameScreen.style.display = 'none';
    if (nameButtons) nameButtons.style.display = 'none';
    if (quizScreen) quizScreen.style.display = '';
    if (buttonsDiv) buttonsDiv.style.display = '';
    if (quizNav) quizNav.style.display = '';

    initQuiz();
}

function initQuiz() {
    if (quizLoaded && Object.keys(questionsByCategory).length > 0) {
        startQuizCategory(categoryOrder[currentCategoryIndex]);
        return;
    }

    if (typeof questionsData !== 'undefined') {
        questionsByCategory = questionsData;
        quizLoaded = true;
        startQuizCategory(categoryOrder[currentCategoryIndex]);
        return;
    }

    fetch('questions_tree.json')
        .then(res => res.json())
        .then(data => {
            questionsByCategory = data;
            quizLoaded = true;
            startQuizCategory(categoryOrder[currentCategoryIndex]);
        })
        .catch(err => {
            console.error("Failed to load questions_tree.json:", err);
            const questionEl = document.getElementById('question');
            if (questionEl) {
                questionEl.innerText = "Error loading question tree. If testing locally, run a local web server (e.g. npm start or npx serve).";
            }
        });
}

function loadCategoryMap(category) {
    currentQuestions = {};
    if (questionsByCategory[category]) {
        questionsByCategory[category].forEach(q => {
            currentQuestions[q.id] = q;
        });
    }
}

function startQuizCategory(category, targetId = null) {
    loadCategoryMap(category);
    const catList = questionsByCategory[category];
    if (!catList || catList.length === 0) return;

    const firstId = targetId || catList[0].id;
    renderNode(currentQuestions[firstId]);
}

function selectOption(nextId) {
    history.push({
        categoryIndex: currentCategoryIndex,
        nodeId: currentNodeId,
        results: { ...results }
    });

    const category = categoryOrder[currentCategoryIndex];
    const node = currentQuestions[nextId];

    if (!node || !node.options) {
        results[category] = nextId;
        currentCategoryIndex++;

        if (currentCategoryIndex < categoryOrder.length) {
            startQuizCategory(categoryOrder[currentCategoryIndex]);
        } else {
            localStorage.setItem('quizResults', JSON.stringify(results));
            window.location.href = 'results.html';
        }
    } else {
        renderNode(node);
    }
}

function renderNode(node) {
    if (!node) return;
    currentNodeId = node.id;

    const questionEl = document.getElementById('question');
    const buttonsDiv = document.getElementById('buttons');
    if (!questionEl || !buttonsDiv) return;

    buttonsDiv.innerHTML = '';
    questionEl.innerText = getLocalizedQuestionText(node);

    if (node.options && node.options.length > 3) {
        buttonsDiv.classList.add('multi-column');
    } else {
        buttonsDiv.classList.remove('multi-column');
    }

    if (node.options) {
        node.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = getLocalizedOptionText(opt);
            if (opt.color) btn.style.backgroundColor = opt.color;
            btn.onclick = () => selectOption(opt.next);
            buttonsDiv.appendChild(btn);
        });
    }

    updateBackButton();
}

function previousQuestion() {
    if (history.length === 0) {
        const nameScreen = document.getElementById('name-screen');
        const nameButtons = document.getElementById('name-buttons');
        const quizScreen = document.getElementById('quiz-screen');
        const buttonsDiv = document.getElementById('buttons');
        const quizNav = document.getElementById('quiz-nav');

        if (nameScreen && nameButtons) {
            quizScreen.style.display = 'none';
            buttonsDiv.style.display = 'none';
            if (quizNav) quizNav.style.display = 'none';
            nameScreen.style.display = '';
            nameButtons.style.display = 'flex';
            return;
        }

        window.location.href = 'Instruction.html';
        return;
    }

    const prevState = history.pop();
    currentCategoryIndex = prevState.categoryIndex;
    results = prevState.results;
    loadCategoryMap(categoryOrder[currentCategoryIndex]);
    renderNode(currentQuestions[prevState.nodeId]);
}

function updateBackButton() {
    const backBtn = document.getElementById('back-button');
    if (!backBtn) return;

    if (typeof I18n !== 'undefined') {
        backBtn.innerText = history.length === 0
            ? I18n.t("back")
            : I18n.t("prevQuestion");
    } else {
        backBtn.innerText = history.length === 0 ? "Back" : "Previous Question";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateNamePlaceholder();
    const input = document.getElementById('name-input');
    if (input) {
        const savedName = localStorage.getItem('quizUserName');
        if (savedName) input.value = savedName;
        input.focus();
    } else {
        initQuiz();
    }
});

window.addEventListener('languageChanged', () => {
    updateNamePlaceholder();
    if (currentNodeId && currentQuestions[currentNodeId]) {
        renderNode(currentQuestions[currentNodeId]);
    }
    updateBackButton();
});
