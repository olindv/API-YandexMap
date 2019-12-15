import feedbackTemlpate from './template/feedback.hbs';
require('./styles/main.css');

ymaps.ready(initMap);

let myMap,
    currentFeedback = {},
    storage = localStorage,
    feedbacks = JSON.parse(storage.marks || '[]'),
    zelenograd = [55.98, 37.19];

// Инициализируем карту
function initMap() {
    myMap = new ymaps.Map(
        'map',
        {
            center: zelenograd,
            zoom: 14,
            behaviors: ['drag'],
            controls: ['zoomControl']
        },
        { yandexMapDisablePoiInteractivity: true }
    );

    const feedback = document.getElementById('feedback');
    const feedbackContent = document.getElementById('feedback__content');
    const address = document.getElementById('address');
    const content = document.getElementById('content');
    const userreview = document.getElementById('userreview');
    const place = document.getElementById('place');
    const saveBtn = document.getElementById('saveBtn');
    const username = document.getElementById('username');
    const closeFeedbackBtn = document.querySelector('.symbol__close');

    // Закрываем форму
    const closeForm = () => {
        feedback.style.display = 'none';
        clearForm();
        clearList();
    };

    // Очищаем инпуты
    const clearForm = () => {
        username.value = '';
        place.value = '';
        feedbackContent.value = '';
    };

    // Очищаем список отзывов
    const clearList = () => {
        let contentLength = content.children.length;

        for (let i = contentLength; i > 1; i--) {
            if (content.tagName !== 'SPAN')
                content.removeChild(content.lastChild);
        }
    };

    // Задаем положение окошка с отзывом относительно клика по карте
    const showForm = position => {
        myMap.balloon.close();

        let x = position[0];
        let y = position[1];
        let { clientHeight, clientWidth } = document.documentElement;
        let { offsetHeight, offsetWidth } = feedback;

        if (y + offsetHeight > clientHeight) {
            y = clientHeight - offsetHeight;
        } else if (x + offsetWidth > clientWidth) {
            x = clientWidth - offsetWidth;
        } else if (x < 0) {
            x = 0;
        } else if (y < 0) {
            y = 0;
        }

        feedback.style.display = 'flex';
        feedback.style.left = x + 'px';
        feedback.style.top = y + 'px';
        saveBtn.addEventListener('click', saveFeedback);
        closeFeedbackBtn.addEventListener('click', closeForm);
    };

    //Показываем форму при клике, а также выводим точный адрес точки клика по карте
    myMap.events.add('click', e => {
        let coords = e.get('coords');
        let position = e.get('position');

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

    // Создаем макет с информацией о выбранном геообъекте
    const customItemContentLayout = ymaps.templateLayoutFactory.createClass(
        // Флаг "raw" означает, что данные вставляют "как есть" без экранирования html.
        '<div class=ballon__wrap>' +
            '<h4 class=ballon__header>{{ properties.balloonContentHeader|raw }}</h4>' +
            '<div class=ballon__body>{{ properties.balloonContentBody|raw }}</div>' +
            '<div class=ballon__feedback>{{ properties.balloonContentFeedback|raw }}</div>' +
            '<div class=ballon__footer>{{ properties.balloonContentFooter|raw }}</div>' +
            '</div>'
    );

    // Создаем кластеризатор с макетом-каруселью
    const clusterer = new ymaps.Clusterer({
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

    // Добавляем экземпляр кластеризатора в карту
    myMap.geoObjects.add(clusterer);

    // При открытие метки, закрываем форму отзыва
    myMap.events.add('balloonopen', () => {
        closeForm();
    });

    // Сохраняем отзыв, заносим его в балун и добавляем в кластеризатор
    const saveFeedback = () => {
        let nameValue = username.value,
            placeValue = place.value,
            feedbackValue = feedbackContent.value;

        if (!nameValue || !placeValue || !feedbackValue) {
            return;
        }
        generateFeedback(nameValue, placeValue, feedbackValue);
    };

    const generateFeedback = (name, place, feedback) => {
        currentFeedback.username = name;
        currentFeedback.place = place;
        currentFeedback.text = feedback;
        currentFeedback.date = new Date().toLocaleString();
        feedbacks.push({ ...currentFeedback });
        userreview.style.display = 'none';
        content.innerHTML += feedbackTemlpate({ feedback: currentFeedback });
        clearForm();

        let placemark = new ymaps.Placemark( // Создаем метку, а также указываем props (задаем значения и свойства балуну)
            currentFeedback.coords,
            {
                balloonContentHeader: place,
                balloonContentBody: feedback,
                balloonContentFeedback: currentFeedback.address,
                balloonContentFooter: currentFeedback.date
            },
            {
                preset: 'islands#darkGreenIcon',
                openBalloonOnClick: false,
                hideIconOnBalloonOpen: false
            }
        );

        storage.marks = JSON.stringify(feedbacks);
        clusterer.add(placemark); // Добавляем метку в кластер

        //Кликаем на метку и раскрываем форму с отзывом
        placemark.events.add('click', e => {
            let position = e.get('position');
            let target = e.get('target');
            let currentAddress = target.properties._data.balloonContentFeedback;
            showFeedbacks(currentAddress, position);
        });
    };

    // Показываем все отзывы по текущему адресу/объекту
    const showFeedbacks = (addressValue, position) => {
        let contentLength = content.children.length;
        let feedbacksLength = feedbacks.length;

        currentFeedback = {};

        clearForm();
        clearList();

        for (let i = 0; i < feedbacksLength; i++) {
            if (feedbacks[i].address == addressValue) {
                currentFeedback.address = feedbacks[i].address;
                currentFeedback.coords = feedbacks[i].coords;
                //Берём наш span для отображения отзывов, и складываем в него шаблон с конкрентым отзывом
                content.innerHTML += feedbackTemlpate({
                    feedback: feedbacks[i]
                });
            }
        }
        if (contentLength >= 1) {
            showForm(position);
        }
    };

    // Кликаем по адресу в балуне-каруселе и возвращаем окно с отзывами
    map.addEventListener('click', e => {
        let target = e.target;

        if (target.className != 'ballon__feedback') {
            return;
        }

        const x = e.clientX;
        const y = e.clientY;

        showFeedbacks(target.textContent, [x, y]);
    });

    // Отрисовываем метки при перезагрузке страницы
    const drawPlacemark = () => {
        if (feedbacks !== '[]') {
            userreview.style.display = 'none';

            for (let i = 0; i < feedbacks.length; i++) {
                const item = feedbacks[i];

                let placemark = new ymaps.Placemark( // Создаем метку, а также указываем props (задаем значения и свойства балуну)
                    item.coords,
                    {
                        balloonContentHeader: item.place,
                        balloonContentBody: item.text,
                        balloonContentFeedback: item.address,
                        balloonContentFooter: item.date
                    },
                    {
                        preset: 'islands#darkGreenIcon',
                        openBalloonOnClick: false,
                        hideIconOnBalloonOpen: false
                    }
                );

                clusterer.add(placemark);

                placemark.events.add('click', e => {
                    let position = e.get('position');

                    address.textContent = item.address;
                    showFeedbacks(address.textContent, position);
                });
            }

            map.addEventListener('click', e => {
                let target = e.target;

                if (target.className != 'ballon__feedback') {
                    return;
                }

                address.textContent = target.textContent;
            });
        }
    };
    drawPlacemark();
}
