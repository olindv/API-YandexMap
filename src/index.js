import feedbackTemlpate from './template/feedback.hbs';
require('./styles/main.css');

ymaps.ready(initMap);

let myMap,
    currentFeedback = {},
    feedbacks = [];

// Инициализируем карту
function initMap() {
    myMap = new ymaps.Map('map', {
        center: [55.98, 37.19],
        zoom: 14,
        behaviors: ['drag'],
        controls: ['zoomControl']
    });

    let feedback = document.getElementById('feedback');
    let feedbackContent = document.getElementById('feedback__content');
    let address = document.getElementById('address');
    let content = document.getElementById('content');
    let userreview = document.getElementById('userreview');
    let place = document.getElementById('place');
    let saveBtn = document.getElementById('saveBtn');
    let username = document.getElementById('username');
    let closeFeedbackBtn = document.querySelector('.symbol__close');

    // Задаем положение окошка с отзывом относительно клика по карте
    let showForm = position => {
        myMap.balloon.close();

        let x = position[0];
        let y = position[1];

        if (x + feedback.offsetWidth > document.documentElement.clientWidth) {
            x = document.documentElement.clientWidth - feedback.offsetWidth;
        }
        if (x < 0) {
            x = 0;
        }
        if (y + feedback.offsetHeight > document.documentElement.clientHeight) {
            y = document.documentElement.clientHeight - feedback.offsetHeight;
        }
        if (y < 0) {
            y = 0;
        }

        feedback.style.display = 'flex';
        feedback.style.left = x + 'px';
        feedback.style.top = y + 'px';

        closeFeedbackBtn.addEventListener('click', closeForm);
    };

    // Закрываем форму
    let closeForm = () => {
        feedback.style.display = 'none';
        clearForm();
        clearList();
    };

    // Очищаем инпуты
    let clearForm = () => {
        username.value = '';
        place.value = '';
        feedbackContent.value = '';
    };

    let clearList = () => {
        let contentLength = content.children.length;
        for (let i = contentLength; i > 1; i--) {
            if (content.tagName !== 'SPAN')
                content.removeChild(content.lastChild);
        }
        userreview.style.display = 'block'; // условие не работает, надо разобраться
    };

    //Показываем форму при клике, а также выводим точный адрес точки клика по карте
    myMap.events.add('click', e => {
        let coords = e.get('coords');
        let position = e.get('position');
        console.log(e);
        console.log(ymaps);
        ymaps
            .geocode(coords)
            .then(response => {
                currentFeedback.coords = coords;
                currentFeedback.address = response.geoObjects
                    .get(0)
                    .getAddressLine(); // Чем ниже индекс у get(i), тем точнее координаты
                address.textContent = currentFeedback.address;
                showForm(position);
            })
            .then(() => clearList())
            .catch(() => console.log('Видимо что-то случилось'));
    });

    // Создаем кластеризатор с макетом-каруселью
    let clusterer = new ymaps.Clusterer({
        clusterDisableClickZoom: true,
        clusterOpenBalloonOnClick: true,
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
        clusterBalloonPanelMaxMapArea: 0,
        clusterBalloonContentLayoutWidth: 200,
        clusterBalloonContentLayoutHeight: 130,
        clusterBalloonPagerSize: 5,
        preset: 'islands#invertedDarkGreenClusterIcons',
        clusterBalloonItemContentLayout: customItemContentLayout
    });

    // Создаем макет с информацией о выбранном геообъекте
    var customItemContentLayout = ymaps.templateLayoutFactory.createClass(
        // Флаг "raw" означает, что данные вставляют "как есть" без экранирования html.
        '<h2 class=ballon_header>{{ properties.balloonContentHeader|raw }}</h2>' +
            '<div class=ballon_body>{{ properties.balloonContentBody|raw }}</div>' +
            '<div class=ballon_footer>{{ properties.balloonContentFooter|raw }}</div>'
    );

    // Добавляем экземпляр кластеризатора в карту
    myMap.geoObjects.add(clusterer);

    // При открытие метки, закрываем форму отзыва
    myMap.events.add('balloonopen', () => {
        closeForm();
    });

    // Сохраняем отзыв, заносим его в балун и добавляем в кластеризатор
    let saveFeedback = () => {
        let nameValue = username.value,
            placeValue = place.value,
            feedbackValue = feedbackContent.value;

        if (!nameValue || !placeValue || !feedbackValue) {
            return;
        }

        generateFeedback(nameValue, placeValue, feedbackValue);
    };

    let generateFeedback = (name, place, feedback) => {
        currentFeedback.username = name;
        currentFeedback.place = place;
        currentFeedback.text = feedback;
        currentFeedback.date = new Date().toLocaleString();
        feedbacks.push(Object.assign({}, currentFeedback));
        userreview.style.display = 'none';
        clearForm();
        content.innerHTML += feedbackTemlpate({ feedback: currentFeedback });
        let header = `${place} ${currentFeedback.address}`;
        let placemark = new ymaps.Placemark( // Создаем метку, а также указываем props (задаем значения и свойства балуну)
            currentFeedback.coords,
            {
                balloonContentHeader: header,
                balloonContentBody: feedback,
                balloonContentFooter: currentFeedback.date,
                hintContent: `${name} ${place}`
            },
            {
                preset: 'islands#darkGreenIcon',
                openBalloonOnClick: false,
                hideIconOnBalloonOpen: false
            }
        );
        clusterer.add(placemark); // Добавляем метку в кластер

        placemark.events.add('click', e => {
            let position = e.get('position');
            let target = e.get('target');
            currentFeedback = {};
            let len = feedbacks.length;
            console.log(address.textContent);
            console.log(feedbacks);
            for (let i = 0; i < len; i++) {
                if (feedbacks[i].address == address.textContent) {
                    console.log(feedbacks[i].address);
                }
            }
            if (content.children.length > 1) {
                showForm(position);
            }
        });
    };

    saveBtn.addEventListener('click', saveFeedback);
}
